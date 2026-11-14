import {
  createAdminClient,
  createPublicClient,
  jsonResponse,
  optionsResponse,
  originAllowed,
  rateLimit,
} from "../_shared/security.ts";

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
