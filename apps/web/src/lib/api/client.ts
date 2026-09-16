export class ApiError extends Error {
  constructor(public status: number, public data: unknown) {
    super(ApiError.extractMessage(data));
  }

  private static extractMessage(data: unknown): string {
    if (!data || typeof data !== 'object') return 'API Error';

    const d = data as Record<string, unknown>;
    if (typeof d.message === 'string') return d.message;
    if (Array.isArray(d.message) && d.message.length > 0) return String(d.message[0]);
    if (typeof d.error === 'string') return d.error;

    try {
      return JSON.stringify(d);
    } catch {
      return 'API Error';
    }
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
