import { createClient } from "npm:@supabase/supabase-js@2.95.0";

const DEFAULT_ORIGINS = [
  "https://gantulu.github.io",
  "https://ais-dev-nhjjtg6mjz2jhzeqjdoc7e-171767928675.asia-southeast1.run.app",
  "https://ais-pre-nhjjtg6mjz2jhzeqjdoc7e-171767928675.asia-southeast1.run.app",
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function allowedOrigins(): Set<string> {
  const configured = Deno.env.get("BUMN_ALLOWED_ORIGINS");
  return new Set((configured ? configured.split(",") : DEFAULT_ORIGINS)
    .map((value) => value.trim())
    .filter(Boolean));
}

function corsFor(req: Request): HeadersInit {
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

function originAllowed(req: Request): boolean {
  const origin = req.headers.get("origin");
  return !origin || allowedOrigins().has(origin);
}

function jsonResponse(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsFor(req),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

function optionsResponse(req: Request): Response {
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

function createAdminClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = namedApiKey("SUPABASE_SECRET_KEYS", "SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("Server configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function createPublicClient() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = namedApiKey("SUPABASE_PUBLISHABLE_KEYS", "SUPABASE_ANON_KEY")
    ?? Deno.env.get("SUPABASE_PUBLISHABLE_KEY");
  if (!url || !key) throw new Error("Public Supabase configuration is incomplete.");
  return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

async function sha256Hex(value: string): Promise<string> {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function clientIp(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  const ip = req.headers.get("cf-connecting-ip") ?? forwarded?.split(",")[0]?.trim() ?? "unknown";
  return ip.slice(0, 128);
}

async function rateLimit(
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

const COLUMNS = [
  "id", "title", "company", "category", "location", "employment_type",
  "education", "salary_min", "salary_max", "salary_currency", "description",
  "rich_text_description", "qualifications", "closing_at", "cover_image_url",
  "created_at", "updated_at", "source_url", "verification_status",
  "publication_status", "is_sample", "published_at",
].join(",");

function parseInteger(value: string | null, fallback: number): number | null {
  if (value === null) return fallback;
  if (!/^(0|[1-9]\d*)$/.test(value)) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (!originAllowed(req)) {
    return jsonResponse(req, {
      success: false,
      error: { code: "ORIGIN_NOT_ALLOWED", message: "Origin is not allowed." },
    }, 403);
  }
  if (req.method !== "GET") {
    return jsonResponse(req, {
      success: false,
      error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." },
    }, 405);
  }

  try {
    const admin = createAdminClient();
    if (!await rateLimit(admin, req, "jobs-list", 120, 60)) {
      return jsonResponse(req, {
        success: false,
        error: { code: "RATE_LIMITED", message: "Terlalu banyak permintaan. Coba lagi sebentar." },
      }, 429);
    }

    const url = new URL(req.url);
    const limit = parseInteger(url.searchParams.get("limit"), 50);
    const offset = parseInteger(url.searchParams.get("offset"), 0);
    if (limit === null || limit < 1 || limit > 100) {
      return jsonResponse(req, {
        success: false,
        error: { code: "INVALID_LIMIT", message: "limit harus berupa integer antara 1 dan 100." },
      }, 400);
    }
    if (offset === null || offset < 0 || offset > 1_000_000) {
      return jsonResponse(req, {
        success: false,
        error: { code: "INVALID_OFFSET", message: "offset harus berupa integer antara 0 dan 1000000." },
      }, 400);
    }

    const db = createPublicClient();
    const { data, error, count } = await db.from("bumn_jobs")
      .select(COLUMNS, { count: "exact" })
      .eq("publication_status", "published")
      .order("created_at", { ascending: false })
      .range(offset, offset + limit - 1);

    if (error) {
      console.error("get-bumn-jobs query failed:", error.message);
      return jsonResponse(req, {
        success: false,
        error: { code: "QUERY_FAILED", message: "Unable to retrieve job listings." },
      }, 500);
    }

    const rows = data ?? [];
    return jsonResponse(req, {
      success: true,
      data: rows,
      pagination: {
        count: count ?? 0,
        limit,
        offset,
        has_more: offset + rows.length < (count ?? 0),
      },
    });
  } catch (error) {
    console.error("get-bumn-jobs error:", error instanceof Error ? error.message : "unknown");
    return jsonResponse(req, {
      success: false,
      error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." },
    }, 500);
  }
});
