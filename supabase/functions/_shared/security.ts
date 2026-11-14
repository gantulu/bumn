import { createClient } from "npm:@supabase/supabase-js@2.95.0";

export type JsonObject = Record<string, unknown>;
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

const DEFAULT_ORIGINS = [
  "https://gantulu.github.io",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

export function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("BUMN_ALLOWED_ORIGINS");
  return new Set((configured ? configured.split(",") : DEFAULT_ORIGINS)
    .map((value) => value.trim())
    .filter(Boolean));
}

export function corsFor(req: Request): HeadersInit {
  const origin = req.headers.get("origin");
  const headers: Record<string, string> = {
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-retry-count",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && allowedOrigins().has(origin)) headers["Access-Control-Allow-Origin"] = origin;
  return headers;
}

export function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || allowedOrigins().has(origin);
}

export function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsFor(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export function optionsResponse(req: Request): Response {
  return new Response(null, { status: originAllowed(req) ? 204 : 403, headers: corsFor(req) });
}

function namedApiKey(pluralEnv: string, legacyEnv: string): string | null {
  const encoded = Deno.env.get(pluralEnv);
  if (encoded) {
    try {
      const keys = JSON.parse(encoded) as Record<string, unknown>;
      const key = keys.default;
      if (typeof key === "string" && key.length > 0) return key;
    } catch {
      console.error(`Invalid JSON in ${pluralEnv} environment variable.`);
    }
  }
  return Deno.env.get(legacyEnv) ?? null;
}

export function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = namedApiKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export function createPublicClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = namedApiKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY")
    ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Public Supabase configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = req.headers.get("cf-connecting-ip") ?? forwarded?.split(",")[0]?.trim() ?? "unknown";
  return ip.slice(0, 128);
}

export async function rateLimit(
  db: ReturnType<typeof createAdminClient>,
  req: Request,
  scope: string,
  limit: number,
  windowSeconds: number,
  identity?: string,
): Promise<boolean> {
  const key = await sha256Hex(`bumn:v1:${scope}:${identity ?? clientIp(req)}`);
  const { data, error } = await db.rpc("consume_bumn_rate_limit", {
    p_bucket_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });
  if (error) throw new Error("Rate-limit service unavailable.");
  return data === true;
}

export async function createSession(
  db: ReturnType<typeof createAdminClient>,
  userId: string,
): Promise<{ session_token: string; expires_at: string }> {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  const sessionToken = btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
  const tokenHash = await sha256Hex(sessionToken);
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000).toISOString();
  const { error } = await db.from("bumn_sessions").insert({
    user_id: userId,
    token_hash: tokenHash,
    expires_at: expiresAt,
  });
  if (error) throw new Error("Unable to create session.");
  return { session_token: sessionToken, expires_at: expiresAt };
}

export async function authenticateSession(
  db: ReturnType<typeof createAdminClient>,
  req: Request,
  body?: JsonObject,
) {
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? (typeof body?.session_token === "string" ? body.session_token : "");
  if (!token || token.length < 32 || token.length > 256) return null;

  const tokenHash = await sha256Hex(token);
  const { data: session, error } = await db.from("bumn_sessions")
    .select("id,user_id,expires_at")
    .eq("token_hash", tokenHash)
    .is("revoked_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (error) throw new Error("Session verification failed.");
  if (!session) return null;

  const { data: user, error: userError } = await db.from("bumn_users")
    .select("id,full_name,phone,email,avatar,is_active,birth_place,birth_date,gender,address,city,province,postal_code,created_at,updated_at")
    .eq("id", session.user_id)
    .maybeSingle();
  if (userError) throw new Error("Account lookup failed.");
  if (!user || !user.is_active) return null;

  const { error: touchError } = await db.from("bumn_sessions")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", session.id);
  if (touchError) console.error("Session activity update failed:", touchError.message);

  return { session, user };
}

export async function revokeSession(
  db: ReturnType<typeof createAdminClient>,
  req: Request,
  body?: JsonObject,
): Promise<void> {
  const authorization = req.headers.get("authorization") ?? "";
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1];
  const token = bearer ?? (typeof body?.session_token === "string" ? body.session_token : "");
  if (!token) return;
  const tokenHash = await sha256Hex(token);
  const { error } = await db.from("bumn_sessions")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash)
    .is("revoked_at", null);
  if (error) throw new Error("Unable to revoke session.");
}

export function publicUser(user: JsonObject) {
  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    is_active: user.is_active,
  };
}

export function publicProfile(user: JsonObject) {
  return {
    ...publicUser(user),
    birth_place: user.birth_place,
    birth_date: user.birth_date,
    gender: user.gender,
    address: user.address,
    city: user.city,
    province: user.province,
    postal_code: user.postal_code,
    created_at: user.created_at,
    updated_at: user.updated_at,
  };
}
