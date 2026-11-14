import {
  authenticateSession,
  createAdminClient,
  jsonResponse,
  optionsResponse,
  originAllowed,
  rateLimit,
  type JsonObject,
} from "../_shared/security.ts";

const BUCKET = "bumn-lamar-documents";
const MAX_FILE_SIZE = 5 * 1024 * 1024;
const MIME_TYPES = new Map([
  ["application/pdf", "pdf"],
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
]);
const DOCUMENT_TYPES = ["diploma", "high_school_diploma", "identity_card"] as const;
type DocumentType = typeof DOCUMENT_TYPES[number];
type Body = JsonObject;

const EDITABLE_FIELDS = [
  "full_name", "email", "cv_title", "cv_summary", "cv_skills",
  "cv_education_summary", "cv_experience_summary", "cv_portfolio_url",
  "cover_letter_subject", "cover_letter_content", "cover_letter_created_at",
  "education_level", "education_institution", "education_major", "education_degree",
  "education_start_year", "education_graduation_year", "education_gpa", "education_description",
  "experience_type", "experience_company", "experience_position", "experience_employment_type",
  "experience_location", "experience_start_date", "experience_end_date",
  "experience_is_current", "experience_description", "experience_responsibilities",
];

function isObject(value: unknown): value is Body {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function normalizeText(value: unknown, maxLength = 10000): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null || value === "") return null;
  if (typeof value !== "string") throw new Error("Field teks tidak valid.");
  const normalized = value.trim();
  if (normalized.length > maxLength) throw new Error("Field melebihi batas karakter.");
  return normalized || null;
}
function validDate(value: unknown): boolean {
  if (value === null || value === undefined || value === "") return true;
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}
function ownedPath(path: unknown, userId: string, applicationId: string, type: DocumentType): path is string {
  if (typeof path !== "string") return false;
  const parts = path.split("/");
  return parts.length === 4 && parts[0] === userId && parts[1] === applicationId &&
    parts[2] === type && parts.every((part) => part && part !== "." && part !== "..");
}
function documentColumns(type: DocumentType) {
  return {
    name: `${type}_file_name`,
    path: `${type}_file_path`,
    mime: `${type}_file_type`,
    size: `${type}_file_size`,
    uploadedAt: `${type}_uploaded_at`,
  };
}
function jsonError(req: Request, message: string, status = 400) {
  return jsonResponse(req, { success: false, message }, status);
}
function validateApplication(input: Body): Body {
  if (Object.keys(input).some((key) => !EDITABLE_FIELDS.includes(key))) {
    throw new Error("Terdapat field lamaran yang tidak diizinkan.");
  }
  const output: Body = {};
  for (const [key, value] of Object.entries(input)) {
    if (key === "cv_skills" || key === "experience_responsibilities") {
      if (!Array.isArray(value) || value.length > 100 ||
          value.some((item) => typeof item !== "string" || item.trim().length > 300)) {
        throw new Error(`${key} harus berupa array teks (maksimal 100 item).`);
      }
      output[key] = value.map((item) => item.trim()).filter(Boolean);
    } else if (key === "education_start_year" || key === "education_graduation_year") {
      if (value !== null && value !== "" &&
          (typeof value !== "number" || !Number.isInteger(value) || value < 1900 || value > 2200)) {
        throw new Error("Tahun pendidikan tidak valid.");
      }
      output[key] = value === "" ? null : value;
    } else if (key === "education_gpa") {
      if (value !== null && value !== "" &&
          (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 4)) {
        throw new Error("IPK harus bernilai 0 sampai 4.");
      }
      output[key] = value === "" ? null : value;
    } else if (key === "experience_is_current") {
      if (typeof value !== "boolean") throw new Error("Status pengalaman tidak valid.");
      output[key] = value;
    } else if (key === "experience_start_date" || key === "experience_end_date") {
      if (!validDate(value)) throw new Error("Tanggal pengalaman tidak valid.");
      output[key] = value || null;
    } else if (key === "cover_letter_created_at") {
      if (value !== null && value !== "" &&
          (typeof value !== "string" || Number.isNaN(Date.parse(value)))) {
        throw new Error("Tanggal cover letter tidak valid.");
      }
      output[key] = value || null;
    } else if (key === "email") {
      const email = normalizeText(value, 254);
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        throw new Error("Format email tidak valid.");
      }
      output[key] = email?.toLowerCase() ?? null;
    } else if (key === "education_level") {
      const level = normalizeText(value, 20);
      if (level && !["SMA/SMK", "D1", "D2", "D3", "D4", "S1", "S2", "S3"].includes(level)) {
        throw new Error("Jenjang pendidikan tidak valid.");
      }
      output[key] = level;
    } else if (key === "cv_portfolio_url") {
      const url = normalizeText(value, 2048);
      if (url) {
        try {
          const parsed = new URL(url);
          if (parsed.protocol !== "https:" && parsed.protocol !== "http:") throw new Error();
        } catch {
          throw new Error("URL portofolio tidak valid.");
        }
      }
      output[key] = url;
    } else {
      const max = key === "full_name" ? 120 : key === "cv_title" ? 200 : 10000;
      output[key] = normalizeText(value, max);
    }
  }

  if (output.experience_is_current === true && output.experience_end_date) {
    throw new Error("Pengalaman aktif tidak boleh memiliki tanggal selesai.");
  }
  if (output.experience_start_date && output.experience_end_date &&
      String(output.experience_end_date) < String(output.experience_start_date)) {
    throw new Error("Tanggal selesai pengalaman tidak boleh lebih awal dari tanggal mulai.");
  }
  if (output.education_start_year && output.education_graduation_year &&
      Number(output.education_graduation_year) < Number(output.education_start_year)) {
    throw new Error("Tahun kelulusan tidak boleh lebih awal dari tahun mulai.");
  }
  return output;
}

function mapRpcError(message: string): { status: number; message: string } {
  if (/not found/i.test(message)) return { status: 404, message: "Lowongan atau lamaran tidak ditemukan." };
  if (/already exists|duplicate|unique constraint/i.test(message)) {
    return { status: 409, message: "Anda sudah memiliki lamaran untuk lowongan ini." };
  }
  if (/only draft|state changed|deadline has passed|no longer available/i.test(message)) {
    return { status: 409, message };
  }
  if (/required|complete|education level|cannot be validated/i.test(message)) {
    return { status: 400, message };
  }
  return { status: 500, message: "Terjadi kesalahan pada server." };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (!originAllowed(req)) return jsonError(req, "Origin is not allowed.", 403);
  if (req.method !== "POST") return jsonError(req, "Method not allowed.", 405);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_FILE_SIZE + 160 * 1024) {
      return jsonError(req, "Ukuran file maksimal 5 MB.", 413);
    }

    let body: Body;
    let file: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        action: form.get("action"),
        application_id: form.get("application_id"),
        document_type: form.get("document_type"),
        session_token: form.get("session_token"),
      };
      const incoming = form.get("file");
      file = incoming instanceof File ? incoming : null;
    } else {
      const parsed: unknown = await req.json();
      if (!isObject(parsed)) return jsonError(req, "Body harus berupa object.");
      body = parsed;
    }

    const action = stringValue(body.action);
    const actions = [
      "create", "get", "update", "submit", "list", "withdraw",
      "upload-document", "delete-document", "delete-draft", "get-document-url",
    ];
    if (!actions.includes(action)) return jsonError(req, "Action tidak valid.");

    const db = createAdminClient();
    if (!await rateLimit(db, req, "application-ip", 80, 60)) {
      return jsonError(req, "Terlalu banyak permintaan. Coba lagi sebentar.", 429);
    }

    const auth = await authenticateSession(db, req, body);
    if (!auth) return jsonError(req, "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.", 401);
    const user = auth.user;
    if (!await rateLimit(db, req, "application-user", 120, 60, user.id)) {
      return jsonError(req, "Terlalu banyak permintaan. Coba lagi sebentar.", 429);
    }

    if (action === "create") {
      const jobId = stringValue(body.job_id).trim();
      if (!jobId || jobId.length > 200) return jsonError(req, "job_id wajib diisi.");
      const { data, error } = await db.rpc("create_bumn_lamar_draft", {
        p_user_id: user.id,
        p_job_id: jobId,
      });
      if (error) {
        const mapped = mapRpcError(error.message);
        return jsonError(req, mapped.message, mapped.status);
      }
      return jsonResponse(req, { success: true, message: "Draft lamaran dibuat.", data }, 201);
    }

    if (action === "list") {
      const rawLimit = body.limit === undefined ? 20 : Number(body.limit);
      const rawOffset = body.offset === undefined ? 0 : Number(body.offset);
      if (!Number.isInteger(rawLimit) || rawLimit < 1 || rawLimit > 50 ||
          !Number.isInteger(rawOffset) || rawOffset < 0 || rawOffset > 1_000_000) {
        return jsonError(req, "Parameter pagination tidak valid.");
      }
      const statuses = ["draft", "submitted", "reviewing", "shortlisted", "rejected", "accepted", "withdrawn"];
      let query = db.from("bumn_lamar").select("*", { count: "exact" })
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .range(rawOffset, rawOffset + rawLimit - 1);
      if (typeof body.status === "string") {
        if (!statuses.includes(body.status)) return jsonError(req, "Filter status tidak valid.");
        query = query.eq("status", body.status);
      }
      const { data, error, count } = await query;
      if (error) throw error;
      const rows = data ?? [];
      return jsonResponse(req, {
        success: true,
        data: rows,
        pagination: {
          count: count ?? 0,
          limit: rawLimit,
          offset: rawOffset,
          has_more: rawOffset + rows.length < (count ?? 0),
        },
      });
    }

    const applicationId = stringValue(body.application_id);
    if (!applicationId || !/^[0-9a-f-]{36}$/i.test(applicationId)) {
      return jsonError(req, "application_id wajib berupa UUID.");
    }
    const { data: application, error: applicationError } = await db.from("bumn_lamar")
      .select("*")
      .eq("id", applicationId)
      .eq("user_id", user.id)
      .maybeSingle();
    if (applicationError) throw applicationError;
    if (!application) return jsonError(req, "Lamaran tidak ditemukan.", 404);

    if (action === "get") return jsonResponse(req, { success: true, data: application });

    if (action === "update") {
      if (application.status !== "draft") return jsonError(req, "Hanya draft yang dapat diperbarui.", 409);
      if (!isObject(body.data)) return jsonError(req, "data wajib berupa object.");
      const updates = validateApplication(body.data);
      if (Object.keys(updates).length === 0) return jsonError(req, "Tidak ada data yang diperbarui.");
      const { data, error } = await db.from("bumn_lamar").update(updates)
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .eq("status", "draft")
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonError(req, "Status draft berubah. Muat ulang lamaran.", 409);
      return jsonResponse(req, { success: true, message: "Draft diperbarui.", data });
    }

    if (action === "submit") {
      const { data, error } = await db.rpc("submit_bumn_lamar", {
        p_application_id: applicationId,
        p_user_id: user.id,
      });
      if (error) {
        const mapped = mapRpcError(error.message);
        return jsonError(req, mapped.message, mapped.status);
      }
      return jsonResponse(req, { success: true, message: "Lamaran berhasil dikirim.", data });
    }

    if (action === "withdraw") {
      if (!["submitted", "reviewing", "shortlisted"].includes(application.status)) {
        return jsonError(req, "Status lamaran tidak dapat ditarik.", 409);
      }
      const { data, error } = await db.from("bumn_lamar")
        .update({ status: "withdrawn" })
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .in("status", ["submitted", "reviewing", "shortlisted"])
        .select("*")
        .maybeSingle();
      if (error) throw error;
      if (!data) return jsonError(req, "Status lamaran berubah. Muat ulang lamaran.", 409);
      return jsonResponse(req, { success: true, message: "Lamaran ditarik.", data });
    }

    if (action === "delete-draft") {
      if (application.status !== "draft") return jsonError(req, "Hanya draft yang dapat dihapus.", 409);
      const paths: string[] = [];
      for (const type of DOCUMENT_TYPES) {
        const path = application[documentColumns(type).path];
        if (path !== null && path !== undefined) {
          if (!ownedPath(path, user.id, applicationId, type)) {
            return jsonError(req, "Path dokumen tidak valid.", 403);
          }
          paths.push(path);
        }
      }
      if (paths.length) {
        const { error } = await db.storage.from(BUCKET).remove(paths);
        if (error) throw error;
      }
      const { error } = await db.from("bumn_lamar").delete()
        .eq("id", applicationId).eq("user_id", user.id).eq("status", "draft");
      if (error) throw error;
      return jsonResponse(req, { success: true, message: "Draft dihapus." });
    }

    if (action === "upload-document") {
      if (application.status !== "draft") return jsonError(req, "Upload hanya tersedia untuk draft.", 409);
      const type = stringValue(body.document_type) as DocumentType;
      if (!DOCUMENT_TYPES.includes(type)) return jsonError(req, "document_type tidak valid.");
      if (!file) return jsonError(req, "File wajib dipilih.");
      const extension = MIME_TYPES.get(file.type);
      if (!extension) return jsonError(req, "Format file harus PDF, JPG, atau PNG.", 415);
      if (file.size <= 0 || file.size > MAX_FILE_SIZE) {
        return jsonError(req, "Ukuran file maksimal 5 MB.", 413);
      }

      const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
      const signatureValid = file.type === "application/pdf"
        ? new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-"
        : file.type === "image/jpeg"
          ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
          : bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
      if (!signatureValid) return jsonError(req, "Konten file tidak sesuai dengan format.", 415);

      const path = `${user.id}/${applicationId}/${type}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(path, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const columns = documentColumns(type);
      const previousPath = application[columns.path];
      const updates: Body = {
        [columns.name]: file.name.replace(/[\\/]/g, "_").slice(0, 255),
        [columns.path]: path,
        [columns.mime]: file.type,
        [columns.size]: file.size,
        [columns.uploadedAt]: new Date().toISOString(),
      };
      const legacyUrlColumn = type === "diploma" ? "diploma_url"
        : type === "high_school_diploma" ? "high_school_diploma_url" : "identity_card_url";
      updates[legacyUrlColumn] = null;

      const { data, error } = await db.from("bumn_lamar").update(updates)
        .eq("id", applicationId)
        .eq("user_id", user.id)
        .eq("status", "draft")
        .select("*")
        .maybeSingle();
      if (error || !data) {
        await db.storage.from(BUCKET).remove([path]);
        if (error) throw error;
        return jsonError(req, "Status draft berubah. Muat ulang lamaran.", 409);
      }

      if (ownedPath(previousPath, user.id, applicationId, type)) {
        const { error: cleanupError } = await db.storage.from(BUCKET).remove([previousPath]);
        if (cleanupError) console.error("Old document cleanup failed:", cleanupError.message);
      }
      return jsonResponse(req, { success: true, message: "Dokumen berhasil diunggah.", data });
    }

    if (action === "delete-document") {
      if (application.status !== "draft") return jsonError(req, "Dokumen hanya dapat dihapus pada draft.", 409);
      const type = stringValue(body.document_type) as DocumentType;
      if (!DOCUMENT_TYPES.includes(type)) return jsonError(req, "document_type tidak valid.");
      const columns = documentColumns(type);
      const path = application[columns.path];
      if (path !== null && path !== undefined && !ownedPath(path, user.id, applicationId, type)) {
        return jsonError(req, "Path dokumen tidak valid.", 403);
      }
      if (typeof path === "string") {
        const { error } = await db.storage.from(BUCKET).remove([path]);
        if (error) throw error;
      }
      const legacyUrlColumn = type === "diploma" ? "diploma_url"
        : type === "high_school_diploma" ? "high_school_diploma_url" : "identity_card_url";
      const updates: Body = {
        [columns.name]: null,
        [columns.path]: null,
        [columns.mime]: null,
        [columns.size]: null,
        [columns.uploadedAt]: null,
        [legacyUrlColumn]: null,
      };
      const { data, error } = await db.from("bumn_lamar").update(updates)
        .eq("id", applicationId).eq("user_id", user.id).eq("status", "draft")
        .select("*").maybeSingle();
      if (error) throw error;
      if (!data) return jsonError(req, "Status draft berubah. Muat ulang lamaran.", 409);
      return jsonResponse(req, { success: true, message: "Dokumen dihapus.", data });
    }

    if (action === "get-document-url") {
      const type = stringValue(body.document_type) as DocumentType;
      if (!DOCUMENT_TYPES.includes(type)) return jsonError(req, "document_type tidak valid.");
      const path = application[documentColumns(type).path];
      if (!ownedPath(path, user.id, applicationId, type)) {
        return jsonError(req, "Dokumen tidak ditemukan.", 404);
      }
      const { data, error } = await db.storage.from(BUCKET).createSignedUrl(path, 300);
      if (error) throw error;
      return jsonResponse(req, {
        success: true,
        data: { signed_url: data.signedUrl, expires_in: 300 },
      });
    }

    return jsonError(req, "Action tidak valid.");
  } catch (error) {
    if (error instanceof Error) {
      const message = error.message;
      const clientError = [
        "Field", "Terdapat", "Tahun", "IPK", "Status", "Tanggal",
        "Pengalaman", "Format", "Jenjang", "URL", "Kredensial",
      ].some((prefix) => message.startsWith(prefix));
      if (clientError) return jsonError(req, message, 400);
    }
    console.error("bumn-lamar error:", error instanceof Error ? error.message : "unknown");
    return jsonError(req, "Terjadi kesalahan pada server.", 500);
  }
});
