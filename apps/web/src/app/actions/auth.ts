"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function setAuthToken(token: string) {
  const cookieStore = await cookies();
  cookieStore.set({
    name: "access_token",
    value: token,
    httpOnly: true,
    path: "/",
    secure: process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_API_URL?.includes("localhost"),
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

export async function logoutAction() {
  const cookieStore = await cookies();
  cookieStore.delete("access_token");
  redirect("/");
}
