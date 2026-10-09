import { NextRequest, NextResponse } from "next/server";

function getApiBase() {
  const url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error("Missing environment variable: INTERNAL_API_URL or NEXT_PUBLIC_API_URL");
  }
  return url.replace(/\/v1\/?$/, "").replace(/\/$/, "");
}

function getClientOrigin(request: NextRequest): string {
  const host = request.headers.get("x-forwarded-host") || request.headers.get("host");
  const proto =
    request.headers.get("x-forwarded-proto") ||
    (request.url.startsWith("https") ? "https" : "http");
  if (host) {
    return `${proto}://${host}`;
  }
  if (process.env.NEXT_PUBLIC_API_URL) {
    try {
      return new URL(process.env.NEXT_PUBLIC_API_URL).origin;
    } catch {
      // ignore
    }
  }
  return request.nextUrl.origin;
}

async function handleAuthProxy(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const subPath = (path || []).join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${getApiBase()}/auth/${subPath}${search}`;

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
    if (!HOP_BY_HOP.includes(key.toLowerCase())) {
      headers.set(key, value);
    }
  });

  try {
    const backendRes = await fetch(targetUrl, {
      method: request.method,
      headers,
      redirect: "manual", // Prevent auto-following 302 redirects so browser receives them
    });

    // Handle 3xx Redirects (Google OAuth redirect & callback redirect)
    if ([301, 302, 303, 307, 308].includes(backendRes.status)) {
      const location = backendRes.headers.get("location");
      if (location) {
        // Resolve location against the real public client origin, never container hostname
        const origin = getClientOrigin(request);
        const redirectUrl = new URL(location, origin);
        const response = NextResponse.redirect(redirectUrl.toString(), {
          status: backendRes.status,
        });

        // Forward all Set-Cookie headers from backend if present
        if (typeof backendRes.headers.getSetCookie === "function") {
          const cookies = backendRes.headers.getSetCookie();
          cookies.forEach((cookie) => response.headers.append("set-cookie", cookie));
        } else {
          const setCookie = backendRes.headers.get("set-cookie");
          if (setCookie) {
            response.headers.set("set-cookie", setCookie);
          }
        }
        return response;
      }
    }

    const resBody = await backendRes.arrayBuffer();
    const resHeaders = new Headers();
    const contentType = backendRes.headers.get("content-type");
    if (contentType) {
      resHeaders.set("content-type", contentType);
    }

    return new NextResponse(resBody, {
      status: backendRes.status,
      headers: resHeaders,
    });
  } catch (error: unknown) {
    console.error("Auth proxy error:", error);
    const details = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      {
        success: false,
        statusCode: 502,
        error: {
          message: "Failed to connect to backend authentication service",
          details,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = handleAuthProxy;
export const POST = handleAuthProxy;
