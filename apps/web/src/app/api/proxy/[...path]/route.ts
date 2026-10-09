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
    const backendRes = await fetch(targetUrl, options);
    const contentType = backendRes.headers.get("content-type") || "";

    const resHeaders = new Headers();
    if (contentType) {
      resHeaders.set("content-type", contentType);
    }

    const resBody = await backendRes.text();
    return new NextResponse(resBody, {
      status: backendRes.status,
      statusText: backendRes.statusText,
      headers: resHeaders,
    });
    // @ts-expect-error
  } catch (error: never) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 502,
        error: {
          message: "Failed to connect to backend server",
          details: error.message,
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
