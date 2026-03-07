import { getToken } from "./credentials.js";

const DEFAULT_API_URL = "https://community.lobu.ai/api/v1";

function getApiUrl(): string {
  return process.env.LOBU_API_URL ?? DEFAULT_API_URL;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
}

/**
 * HTTP client for community.lobu.ai API.
 * Stub for Phase 1 — most endpoints don't exist yet.
 */
export async function apiRequest<T = unknown>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const token = await getToken();
  const url = `${getApiUrl()}${path}`;

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Lobu-Org": "default",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers as Record<string, string> | undefined),
  };

  try {
    const response = await fetch(url, { ...options, headers });
    if (!response.ok) {
      const body = await response.text();
      return { ok: false, error: `${response.status}: ${body}` };
    }
    const data = (await response.json()) as T;
    return { ok: true, data };
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
