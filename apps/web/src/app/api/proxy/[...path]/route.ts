/* eslint-disable @typescript-eslint/ban-ts-comment */
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

function getApiUrl(): string {
  const url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "Missing environment variable: INTERNAL_API_URL or NEXT_PUBLIC_API_URL is required"
    );
  }
  return url;
}

// Cache in-flight refresh promises to prevent concurrent refresh calls for the same refresh_token
const inFlightRefreshes = new Map<
  string,
  Promise<{ access_token: string; refresh_token: string } | null>
>();

async function refreshAuthTokens(
  baseUrl: string,
  refreshToken: string,
): Promise<{ access_token: string; refresh_token: string } | null> {
  const existing = inFlightRefreshes.get(refreshToken);
  if (existing) {
    return existing;
  }

  const promise = (async () => {
    try {
      const res = await fetch(`${baseUrl}/v1/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });

      if (!res.ok) {
        return null;
      }

      const data = await res.json();
      if (data?.access_token) {
        return {
          access_token: data.access_token,
          refresh_token: data.refresh_token,
        };
      }
      return null;
    } catch (err) {
      console.error("Token refresh network error:", err);
      return null;
    } finally {
      inFlightRefreshes.delete(refreshToken);
    }
  })();

  inFlightRefreshes.set(refreshToken, promise);
  return promise;
}

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> },
) {
  let apiUrl: string;
  try {
    apiUrl = getApiUrl();
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        success: false,
        statusCode: 500,
        error: { message },
      },
      { status: 500 },
    );
  }
  const { path } = await params;
  const targetPath = "/" + (path || []).join("/");
  const search = request.nextUrl.search;

  // Clean base API URL of any trailing slashes or version tags
  const baseUrl = apiUrl.replace(/\/v\d+\/?$/, "").replace(/\/$/, "");

  // Use fixed web version from env (defaults to v1)
  const rawVersion = process.env.NEXT_PUBLIC_API_VERSION || "v1";
  const webVersion = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;

  // If path already starts with an explicit version (/v1, /v2, etc.) or /auth, preserve it; otherwise use configured web version
  const versionedPath = targetPath.match(/^\/(v\d+|auth)(\/|$)/)
    ? targetPath
    : `/${webVersion}${targetPath}`;

  const targetUrl = `${baseUrl}${versionedPath}${search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;

  const HOP_BY_HOP = [
    "host",
    "cookie",
    "content-length",
    "connection",
    "upgrade",
    "keep-alive",
    "transfer-encoding",
    "proxy-authenticate",
    "proxy-authorization",
    "te",
    "trailer",
  ];

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Exclude hop-by-hop or conflicting headers
    if (!HOP_BY_HOP.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }

  const options: RequestInit = {
    method: request.method,
    headers,
  };

  if (request.method !== "GET" && request.method !== "HEAD") {
    try {
      const body = await request.text();
      if (body) {
        options.body = body;
      }
    } catch {
      // no body
    }
  }

  try {
    let backendRes = await fetch(targetUrl, options);
    let newAccessToken: string | null = null;
    let newRefreshToken: string | null = null;
    let shouldClearTokens = false;

    const isAuthEndpoint =
      targetPath.startsWith("/auth") || targetPath.includes("/auth/");

    // If backend returns 401 and we have a refresh token, silently refresh and retry
    if (backendRes.status === 401 && refreshToken && !isAuthEndpoint) {
      const refreshed = await refreshAuthTokens(baseUrl, refreshToken);
      if (refreshed?.access_token) {
        newAccessToken = refreshed.access_token;
        newRefreshToken = refreshed.refresh_token;

        const retryHeaders = new Headers(headers);
        retryHeaders.set("authorization", `Bearer ${newAccessToken}`);

        backendRes = await fetch(targetUrl, {
          ...options,
          headers: retryHeaders,
        });
      } else {
        shouldClearTokens = true;
      }
    }

    const contentType = backendRes.headers.get("content-type") || "";

    const resHeaders = new Headers();
    if (contentType) {
      resHeaders.set("content-type", contentType);
    }

    const resBody = await backendRes.text();

    // If an explicit refresh call was proxied successfully, capture tokens to set cookies
    if (targetPath.includes("/auth/refresh") && backendRes.ok) {
      try {
        const parsed = JSON.parse(resBody);
        if (parsed?.access_token) {
          newAccessToken = parsed.access_token;
          newRefreshToken = parsed.refresh_token;
        }
      } catch {
        // ignore
      }
    }

    const response = new NextResponse(resBody, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });

    const isHttps =
      request.url.startsWith("https") ||
      request.headers.get("x-forwarded-proto") === "https";
    const isProduction = process.env.NODE_ENV === "production" && isHttps;

    if (newAccessToken) {
      response.cookies.set("access_token", newAccessToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
      if (newRefreshToken) {
        response.cookies.set("refresh_token", newRefreshToken, {
          httpOnly: true,
          secure: isProduction,
          sameSite: "lax",
          path: "/",
          maxAge: 60 * 60 * 24 * 30, // 30 days
        });
      }
    } else if (shouldClearTokens) {
      response.cookies.delete("access_token");
      response.cookies.delete("refresh_token");
    }

    return response;
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 502,
        error: {
          message: "Failed to connect to backend server",
          details: error?.message || String(error),
        },
      },
      { status: 502 },
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;
