import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "GET") {
    return jsonResponse(
      { success: false, error: { code: "METHOD_NOT_ALLOWED", message: "Only GET is supported." } },
      405,
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !anonKey) {
      console.error("Missing SUPABASE_URL or SUPABASE_ANON_KEY.");
      return jsonResponse(
        { success: false, error: { code: "SERVER_CONFIGURATION_ERROR", message: "Server configuration error." } },
        500,
      );
    }

    const url = new URL(req.url);
    const requestedLimit = Number(url.searchParams.get("limit") ?? "50");
    const requestedOffset = Number(url.searchParams.get("offset") ?? "0");

    if (!Number.isInteger(requestedLimit) || requestedLimit < 1 || requestedLimit > 100) {
      return jsonResponse(
        { success: false, error: { code: "INVALID_LIMIT", message: "limit must be an integer between 1 and 100." } },
        400,
      );
    }

    if (!Number.isInteger(requestedOffset) || requestedOffset < 0) {
      return jsonResponse(
        { success: false, error: { code: "INVALID_OFFSET", message: "offset must be a non-negative integer." } },
        400,
      );
    }

    const supabase = createClient(supabaseUrl, anonKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    const columns = [
      "id", "title", "company", "category", "location", "employment_type",
      "education", "salary_min", "salary_max", "salary_currency", "description",
      "rich_text_description", "qualifications", "closing_at", "cover_image_url",
      "created_at", "updated_at",
    ].join(", ");

    const { data, error, count } = await supabase
      .from("bumn_jobs")
      .select(columns, { count: "exact" })
      .order("created_at", { ascending: false })
      .range(requestedOffset, requestedOffset + requestedLimit - 1);

    if (error) {
      console.error("get-bumn-jobs query failed:", error.message);
      return jsonResponse(
        { success: false, error: { code: "QUERY_FAILED", message: "Unable to retrieve job listings." } },
        500,
      );
    }

    return jsonResponse({
      success: true,
      data: data ?? [],
      pagination: {
        count: count ?? 0,
        limit: requestedLimit,
        offset: requestedOffset,
        has_more: requestedOffset + (data?.length ?? 0) < (count ?? 0),
      },
    });
  } catch (error) {
    console.error("get-bumn-jobs unexpected error:", error);
    return jsonResponse(
      { success: false, error: { code: "INTERNAL_SERVER_ERROR", message: "Internal server error." } },
      500,
    );
  }
});
