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

  /** Max retry attempts for transient failures (total tries = MAX_RETRIES + 1). */
  private static readonly MAX_RETRIES = 3;
  /** Status codes worth retrying: rate-limit + transient server errors. */
  private static readonly RETRYABLE_STATUS = new Set([429, 500, 502, 503, 504]);

  constructor(config: Config) {
    this.baseUrl = config.apiUrl;
    this.token = config.apiToken;
    this.workspaceId = config.workspaceId;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Delay before the next retry. Honours the server's ``X-RateLimit-Reset``
   * hint on 429 (an epoch-seconds timestamp set by the API); otherwise falls
   * back to exponential backoff with full jitter (base 500ms, cap 8s).
   */
  private retryDelayMs(attempt: number, res?: Response): number {
    const reset = res?.headers.get("X-RateLimit-Reset");
    if (reset) {
      const deltaMs = Number(reset) * 1000 - Date.now();
      if (Number.isFinite(deltaMs) && deltaMs > 0) {
        return Math.min(deltaMs + 100, 30_000);
      }
    }
    const ceil = Math.min(500 * 2 ** attempt, 8_000);
    return Math.floor(ceil * (0.5 + Math.random() * 0.5));
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
    const body = options?.body ? JSON.stringify(options.body) : undefined;

    for (let attempt = 0; ; attempt++) {
      let res: Response;
      try {
        res = await fetch(url, { method, headers: this.headers(), body });
      } catch (err) {
        // Network/transport error (DNS, dropped connection, timeout) — retry.
        if (attempt < ApiClient.MAX_RETRIES) {
          await this.sleep(this.retryDelayMs(attempt));
          continue;
        }
        const message = err instanceof Error ? err.message : String(err);
        throw new ApiError(0, `Network error after retries: ${message}`);
      }

      if (!res.ok) {
        // Retry transient failures (429 rate-limit, 5xx) with backoff; the
        // MCP agent's burst then degrades gracefully instead of failing a tool.
        if (
          ApiClient.RETRYABLE_STATUS.has(res.status) &&
          attempt < ApiClient.MAX_RETRIES
        ) {
          await this.sleep(this.retryDelayMs(attempt, res));
          continue;
        }
        let detail: string;
        try {
          const errBody = await res.json();
          detail =
            errBody.detail ||
            errBody.message ||
            (typeof errBody === "string" ? errBody : JSON.stringify(errBody));
        } catch {
          detail = res.statusText;
        }
        throw new ApiError(res.status, detail);
      }

      if (res.status === 204) return undefined as T;

      return (await res.json()) as T;
    }
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
