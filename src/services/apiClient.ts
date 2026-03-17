/**
 * API client for communicating with the Vercel serverless backend.
 * All authenticated requests include the Clerk session token.
 */

export class ApiClient {
  private getToken: (() => Promise<string | null>) | null = null;

  setTokenProvider(fn: () => Promise<string | null>) {
    this.getToken = fn;
  }

  private async headers(): Promise<Record<string, string>> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' };
    if (this.getToken) {
      const token = await this.getToken();
      if (token) h['Authorization'] = `Bearer ${token}`;
    }
    return h;
  }

  async get<T = unknown>(path: string): Promise<T> {
    const res = await fetch(`/api${path}`, { headers: await this.headers() });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async post<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method: 'POST',
      headers: await this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return res.json();
  }

  async patch<T = unknown>(path: string, body?: unknown): Promise<T> {
    const res = await fetch(`/api${path}`, {
      method: 'PATCH',
      headers: await this.headers(),
      body: body ? JSON.stringify(body) : undefined,
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data as { error?: string }).error || `Request failed: ${res.status}`);
    }
    return res.json();
  }
}

export const apiClient = new ApiClient();
