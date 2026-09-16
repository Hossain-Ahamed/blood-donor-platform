import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const token = request.nextUrl.searchParams.get("token");

  if (token) {
    const isProduction =
      process.env.NODE_ENV === "production" &&
      !process.env.NEXT_PUBLIC_API_URL?.includes("localhost");

    const response = NextResponse.redirect(new URL("/browse", request.url));
    response.cookies.set("access_token", token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  return NextResponse.redirect(new URL("/login", request.url));
}

