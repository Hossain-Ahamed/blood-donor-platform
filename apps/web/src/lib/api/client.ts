const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001/v1';

export class ApiError extends Error {
  constructor(public status: number, public data: any) {
    super(data?.error || 'API Error');
  }
}

export const apiClient = {
  async getTokens() {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('access_token');
  },

  async setTokens(token: string) {
    if (typeof window === 'undefined') return;
    localStorage.setItem('access_token', token);
  },

  async clearTokens() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem('access_token');
  },

  async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = await this.getTokens();
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as any) || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      if (response.status === 401) {
        await this.clearTokens();
        // Redirect to login or trigger re-auth
        if (typeof window !== 'undefined') {
          window.location.href = '/';
        }
      }
      const errData = await response.json().catch(() => null);
      throw new ApiError(response.status, errData);
    }

    return response.json();
  }
};
