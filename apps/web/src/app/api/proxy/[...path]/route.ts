import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

const API_URL =
  process.env.INTERNAL_API_URL ||
  process.env.NEXT_PUBLIC_API_URL ||
  "http://localhost:3001/v1";

async function proxyRequest(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path } = await params;
  const targetPath = "/" + (path || []).join("/");
  const search = request.nextUrl.search;
  const targetUrl = `${API_URL}${targetPath}${search}`;

  const cookieStore = await cookies();
  const token = cookieStore.get("access_token")?.value;

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    // Exclude hop-by-hop or conflicting headers
    if (!["host", "cookie", "content-length"].includes(key.toLowerCase())) {
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
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        statusCode: 502,
        error: {
          message: "Failed to connect to backend server",
          details: error.message,
        },
      },
      { status: 502 }
    );
  }
}

export const GET = proxyRequest;
export const POST = proxyRequest;
export const PUT = proxyRequest;
export const PATCH = proxyRequest;
export const DELETE = proxyRequest;

