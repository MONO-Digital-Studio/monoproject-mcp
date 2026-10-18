/**
 * Configuration loaded from environment variables.
 * Required: MONO_API_TOKEN. MONO_API_URL and MONO_WORKSPACE_ID are optional
 * and fall back to the MONO Studio defaults below.
 */

export const DEFAULT_API_URL = "https://monoproject.dev/api/v1";
export const DEFAULT_WORKSPACE_ID = "mono";

export interface Config {
  apiUrl: string;
  apiToken: string;
  workspaceId: string;
}

export function loadConfig(): Config {
  // An empty value counts as unset, so `MONO_API_URL=` in .env keeps the default.
  const apiUrl = process.env.MONO_API_URL || DEFAULT_API_URL;
  const apiToken = process.env.MONO_API_TOKEN;
  const workspaceId = process.env.MONO_WORKSPACE_ID || DEFAULT_WORKSPACE_ID;

  if (!apiToken) throw new Error("MONO_API_TOKEN is required");

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiToken,
    workspaceId,
  };
}
