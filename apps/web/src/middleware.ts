import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get("access_token")?.value;

  const isFriendsRoute = pathname.startsWith("/friends");
  const isHistoryRoute = pathname.startsWith("/history");
  const isProfileRoute = pathname.startsWith("/profile");
  const isAdminRoute = pathname.startsWith("/admin");
  const isRequestCreationRoute =
    pathname === "/requests" || pathname === "/requests/new";

  const isProtected =
    isFriendsRoute ||
    isHistoryRoute ||
    isProfileRoute ||
    isAdminRoute ||
    isRequestCreationRoute;

  if (isProtected && !token) {
    const loginUrl = new URL("/login", request.url);
    const redirectTarget = `${pathname}${search}`;
    loginUrl.searchParams.set("redirect", redirectTarget);
    const response = NextResponse.redirect(loginUrl);
    response.cookies.set("post_login_redirect", redirectTarget, {
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      maxAge: 60 * 15, // 15 mins
    });
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/friends",
    "/friends/:path*",
    "/history",
    "/history/:path*",
    "/requests",
    "/requests/new",
    "/profile",
    "/profile/:path*",
    "/admin",
    "/admin/:path*",
  ],
};
