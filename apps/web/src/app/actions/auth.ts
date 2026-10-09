"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function setAuthToken(token: string, refreshToken?: string) {
  const cookieStore = await cookies();
  const secure =
    process.env.NODE_ENV === "production" &&
    (process.env.NEXT_PUBLIC_API_URL?.startsWith("https") ?? false);

  cookieStore.set({
    name: "access_token",
    value: token,
    httpOnly: true,
    path: "/",
    secure,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });

  if (refreshToken) {
    cookieStore.set({
      name: "refresh_token",
      value: refreshToken,
      httpOnly: true,
      path: "/",
      secure,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  cookieStore.delete("refresh_token");
  redirect("/");
}
