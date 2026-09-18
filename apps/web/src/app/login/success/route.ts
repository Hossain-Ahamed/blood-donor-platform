import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token) {
    const isProduction =
      process.env.NODE_ENV === "production" &&
      !process.env.NEXT_PUBLIC_API_URL?.includes("localhost");

    const rawRedirect = request.cookies.get("post_login_redirect")?.value;
    const decodedRedirect = rawRedirect ? decodeURIComponent(rawRedirect) : null;
    const targetPath =
      decodedRedirect && decodedRedirect.startsWith("/") ? decodedRedirect : "/browse";

    const response = NextResponse.redirect(new URL(targetPath, request.url));
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    if (rawRedirect) {
      response.cookies.delete("post_login_redirect");
    }
    return response;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

