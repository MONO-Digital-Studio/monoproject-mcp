/**
 * Configuration loaded from environment variables.
 * Required: MONO_API_URL, MONO_API_TOKEN, MONO_WORKSPACE_ID
 */

export interface Config {
  apiUrl: string;
  apiToken: string;
  workspaceId: string;
}

export function loadConfig(): Config {
  const apiUrl = process.env.MONO_API_URL;
  const apiToken = process.env.MONO_API_TOKEN;
  const workspaceId = process.env.MONO_WORKSPACE_ID;

  if (!apiUrl) throw new Error("MONO_API_URL is required");
  if (!apiToken) throw new Error("MONO_API_TOKEN is required");
  if (!workspaceId) throw new Error("MONO_WORKSPACE_ID is required");

  return {
    apiUrl: apiUrl.replace(/\/+$/, ""),
    apiToken,
    workspaceId,
  };
}
