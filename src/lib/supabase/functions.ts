const DIRECT_FUNCTIONS_BASE = `${(import.meta.env.VITE_SUPABASE_URL || "https://zyiavfljweavoxyyplxj.supabase.co").replace(/\/$/, "")}/functions/v1`;

function shouldUseLocalProxy(): boolean {
  if (typeof window === "undefined") return false;
  const { hostname } = window.location;
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname.endsWith(".run.app")
  );
}

export function getEdgeFunctionUrl(name: string): string {
  return shouldUseLocalProxy()
    ? `/supabase-functions/${name}`
    : `${DIRECT_FUNCTIONS_BASE}/${name}`;
}

export async function fetchEdgeFunction(
  name: string,
  init: RequestInit,
): Promise<Response> {
  const primaryUrl = getEdgeFunctionUrl(name);
  const directUrl = `${DIRECT_FUNCTIONS_BASE}/${name}`;

  const response = await fetch(primaryUrl, init);
  const contentType = response.headers.get("content-type") ?? "";
  if (
    primaryUrl !== directUrl &&
    (response.status === 404 || !contentType.includes("application/json"))
  ) {
    return fetch(directUrl, init);
  }
  return response;
}
