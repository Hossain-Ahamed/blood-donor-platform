import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { token } = await request.json();
  if (token) {
    const cookieStore = await cookies();
    cookieStore.set("access_token", token, {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ success: false }, { status: 400 });
}

