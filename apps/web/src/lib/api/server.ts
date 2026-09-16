import { cookies } from "next/headers";
import { ApiError } from "./client";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001/v1";

export const apiServer = {
  async getTokens() {
    const cookieStore = await cookies();
    return cookieStore.get("access_token")?.value;
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getTokens();
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...Object.fromEntries(new Headers(options.headers).entries()),
    };

    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
      cache: "no-store", // Ensure we fetch fresh data on the server by default
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new ApiError(response.status, errData);
    }

    return response.json();
  },
};
