/**
 * HTTP client for MONOProject API.
 * Handles authentication, error handling, and response parsing.
 */

import type { Config } from "./config.js";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string,
  ) {
    super(`API ${status}: ${detail}`);
    this.name = "ApiError";
  }
}

export class ApiClient {
  private baseUrl: string;
  private token: string;
  public workspaceId: string;

  constructor(config: Config) {
    this.baseUrl = config.apiUrl;
    this.token = config.apiToken;
    this.workspaceId = config.workspaceId;
  }

  private headers(): Record<string, string> {
    return {
      Authorization: `Bearer ${this.token}`,
      "Content-Type": "application/json",
      Accept: "application/json",
    };
  }

  private buildUrl(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): string {
    const url = new URL(`${this.baseUrl}${path}`);
    if (params) {
      for (const [key, val] of Object.entries(params)) {
        if (val !== undefined && val !== null && val !== "") {
          url.searchParams.set(key, String(val));
        }
      }
    }
    return url.toString();
  }

  private async request<T>(
    method: string,
    path: string,
    options?: {
      body?: unknown;
      params?: Record<string, string | number | boolean | undefined>;
    },
  ): Promise<T> {
    const url = this.buildUrl(path, options?.params);
    const res = await fetch(url, {
      method,
      headers: this.headers(),
      body: options?.body ? JSON.stringify(options.body) : undefined,
    });

    if (!res.ok) {
      let detail: string;
      try {
        const body = await res.json();
        detail =
          body.detail ||
          body.message ||
          (typeof body === "string" ? body : JSON.stringify(body));
      } catch {
        detail = res.statusText;
      }
      throw new ApiError(res.status, detail);
    }

    if (res.status === 204) return undefined as T;

    return (await res.json()) as T;
  }

  async get<T>(
    path: string,
    params?: Record<string, string | number | boolean | undefined>,
  ): Promise<T> {
    return this.request<T>("GET", path, { params });
  }

  async post<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("POST", path, { body });
  }

  async patch<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PATCH", path, { body });
  }

  async put<T>(path: string, body?: unknown): Promise<T> {
    return this.request<T>("PUT", path, { body });
  }

  async delete(path: string, body?: unknown): Promise<void> {
    return this.request<void>("DELETE", path, body ? { body } : undefined);
  }

  /** Resolve workspace path segment — always uses configured workspace */
  ws(): string {
    return `/workspaces/${this.workspaceId}`;
  }
}
