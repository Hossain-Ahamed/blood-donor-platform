import { NextRequest, NextResponse } from "next/server";

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

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");
  const refreshToken = request.nextUrl.searchParams.get("refresh_token");
  const origin = getClientOrigin(request);

  if (token) {
    const isHttps =
      request.url.startsWith("https") ||
      request.headers.get("x-forwarded-proto") === "https";
    const isProduction = process.env.NODE_ENV === "production" && isHttps;

    const rawRedirect = request.cookies.get("post_login_redirect")?.value;
    const decodedRedirect = rawRedirect ? decodeURIComponent(rawRedirect) : null;
    const targetPath =
      decodedRedirect && decodedRedirect.startsWith("/") ? decodedRedirect : "/browse";

    const response = NextResponse.redirect(new URL(targetPath, origin));
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    if (refreshToken) {
      response.cookies.set("refresh_token", refreshToken, {
        httpOnly: true,
        secure: isProduction,
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }
    if (rawRedirect) {
      response.cookies.delete("post_login_redirect");
    }
    return response;
  }

  return NextResponse.redirect(new URL("/login", origin));
}
