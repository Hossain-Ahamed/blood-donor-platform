import { cookies } from "next/headers";
import { ApiError } from "./client";

function getApiUrl(): string {
  const url = process.env.INTERNAL_API_URL || process.env.NEXT_PUBLIC_API_URL;
  if (!url) {
    throw new Error(
      "Missing environment variable: INTERNAL_API_URL or NEXT_PUBLIC_API_URL is required"
    );
  }
  return url;
}

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

    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const baseUrl = getApiUrl().replace(/\/v\d+\/?$/, "").replace(/\/$/, "");
    const rawVersion = process.env.NEXT_PUBLIC_API_VERSION || "v1";
    const webVersion = rawVersion.startsWith("v") ? rawVersion : `v${rawVersion}`;

    const versionedPath = cleanEndpoint.match(/^\/(v\d+|auth)(\/|$)/)
      ? cleanEndpoint
      : `/${webVersion}${cleanEndpoint}`;

    const response = await fetch(`${baseUrl}${versionedPath}`, {
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
