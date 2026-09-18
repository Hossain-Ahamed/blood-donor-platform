export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(ApiError.extractMessage(data, status));
  }

  private static extractMessage(data: unknown, status?: number): string {
    if (!data) {
      return status ? `Request failed with HTTP status ${status}` : "An unexpected error occurred.";
    }

    if (typeof data === "string") {
      try {
        const parsed = JSON.parse(data);
        return ApiError.extractMessage(parsed, status);
      } catch {
        return data;
      }
    }

    if (typeof data !== "object") {
      return "An unexpected error occurred.";
    }

    const d = data as Record<string, any>;

    // 1. Check nested error object: { error: { message: "...", details: "..." } }
    if (d.error && typeof d.error === "object") {
      const errObj = d.error as Record<string, any>;
      if (typeof errObj.message === "string" && errObj.message.trim()) {
        return errObj.message;
      }
      if (Array.isArray(errObj.message) && errObj.message.length > 0) {
        return errObj.message.map((m: any) => String(m)).join(", ");
      }
      if (typeof errObj.details === "string" && errObj.details.trim()) {
        return errObj.details;
      }
    }

    // 2. Check top-level message (string or array)
    if (typeof d.message === "string" && d.message.trim()) {
      return d.message;
    }
    if (Array.isArray(d.message) && d.message.length > 0) {
      return d.message.map((m: any) => String(m)).join(", ");
    }

    // 3. Check top-level error as string
    if (typeof d.error === "string" && d.error.trim()) {
      return d.error;
    }

    // 4. Check details field
    if (typeof d.details === "string" && d.details.trim()) {
      return d.details;
    }

    // 5. Friendly status fallback instead of dumping raw JSON
    if (status) {
      switch (status) {
        case 400:
          return "Bad request. Please verify your submitted information.";
        case 401:
          return "Session expired or unauthorized. Please sign in again.";
        case 403:
          return "Permission denied. You are not authorized to perform this action.";
        case 404:
          return "The requested record could not be found.";
        case 409:
          return "Conflict. This operation conflicts with an existing state.";
        case 429:
          return "Too many requests. Please wait a moment and try again.";
        case 500:
          return "Server error. Please try again later or contact support.";
        default:
          return `Request failed with status code ${status}.`;
      }
    }

    return "An unexpected error occurred. Please try again.";
  }
}

export const apiClient = {
  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    const url = `/api/proxy${cleanEndpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errData = await response.json().catch(() => null);
      throw new ApiError(response.status, errData);
    }

    return response.json();
  },
};
