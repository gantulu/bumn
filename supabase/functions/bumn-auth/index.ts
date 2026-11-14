import {
  authenticateSession,
  createAdminClient,
  createSession,
  jsonResponse,
  optionsResponse,
  originAllowed,
  publicProfile,
  publicUser,
  rateLimit,
  revokeSession,
  type JsonObject,
} from "../_shared/security.ts";

const BUCKET = "bumn-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

type Body = JsonObject;

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}
function validPhone(value: string): boolean {
  return /^62\d{8,13}$/.test(value);
}
function validEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}
function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
function getOwnedAvatarPath(avatarUrl: unknown, userId: string, supabaseUrl: string): string | null {
  if (typeof avatarUrl !== "string" || !avatarUrl) return null;
  try {
    const url = new URL(avatarUrl);
    const base = new URL(supabaseUrl);
    if (url.origin !== base.origin) return null;
    const prefix = `/storage/v1/object/public/${BUCKET}/`;
    if (!url.pathname.startsWith(prefix)) return null;
    const path = decodeURIComponent(url.pathname.slice(prefix.length));
    if (!path.startsWith(`avatars/${userId}/`) || path.split("/").some((part) => part === "..")) return null;
    return path;
  } catch {
    return null;
  }
}
async function validImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}
function badRequest(req: Request, message: string, status = 400) {
  return jsonResponse(req, { success: false, message }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return optionsResponse(req);
  if (!originAllowed(req)) return badRequest(req, "Origin is not allowed.", 403);
  if (req.method !== "POST") return badRequest(req, "Method not allowed.", 405);

  try {
    const contentType = req.headers.get("content-type") ?? "";
    const contentLength = Number(req.headers.get("content-length") ?? 0);
    if (contentLength > MAX_AVATAR_SIZE + 96 * 1024) {
      return badRequest(req, "Ukuran foto maksimal 5 MB.", 413);
    }

    let body: Body;
    let avatarFile: File | null = null;
    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        action: form.get("action"),
        phone: form.get("phone"),
        password: form.get("password"),
        session_token: form.get("session_token"),
      };
      const file = form.get("file");
      avatarFile = file instanceof File ? file : null;
    } else {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return badRequest(req, "Request body harus berupa object.");
      }
      body = parsed as Body;
    }

    const action = stringValue(body.action);
    const allowedActions = [
      "check-phone", "register", "login", "logout",
      "get-profile", "update-profile", "upload-avatar", "delete-avatar",
    ];
    if (!allowedActions.includes(action)) return badRequest(req, "Action tidak valid.");

    const db = createAdminClient();

    if (action === "check-phone") {
      const phone = normalizePhone(stringValue(body.phone));
      if (!validPhone(phone)) return badRequest(req, "Nomor telepon tidak valid.");
      if (!await rateLimit(db, req, "auth-check-phone-ip", 10, 600)) {
        return badRequest(req, "Terlalu banyak permintaan. Coba lagi nanti.", 429);
      }
      if (!await rateLimit(db, req, "auth-check-phone-number", 3, 600, phone)) {
        return badRequest(req, "Terlalu banyak pemeriksaan untuk nomor ini.", 429);
      }
      const { data, error } = await db.from("bumn_users")
        .select("id").eq("phone", phone).maybeSingle();
      if (error) throw error;
      // Keberadaan nomor diperlukan oleh alur UI saat ini; dibatasi ketat oleh rate limit.
      return jsonResponse(req, { success: true, data: { exists: Boolean(data) } });
    }

    if (action === "register") {
      if (!await rateLimit(db, req, "auth-register-ip", 5, 3600)) {
        return badRequest(req, "Terlalu banyak percobaan pendaftaran. Coba lagi nanti.", 429);
      }
      const fullName = stringValue(body.full_name).trim();
      const phone = normalizePhone(stringValue(body.phone));
      const rawEmail = stringValue(body.email).trim();
      const email = rawEmail ? rawEmail.toLowerCase() : null;
      const password = stringValue(body.password);

      if (!validPhone(phone)) return badRequest(req, "Nomor telepon tidak valid.");
      if (fullName.length < 2 || fullName.length > 120) {
        return badRequest(req, "Nama lengkap wajib diisi (2–120 karakter).");
      }
      if (password.length < 8 || new TextEncoder().encode(password).length > 72) {
        return badRequest(req, "Password harus berisi minimal 8 dan maksimal 72 byte UTF-8.");
      }
      if (email && !validEmail(email)) return badRequest(req, "Format email tidak valid.");
      if (!await rateLimit(db, req, "auth-register-phone", 3, 86400, phone)) {
        return badRequest(req, "Terlalu banyak percobaan pendaftaran untuk nomor ini.", 429);
      }

      const { data: passwordHash, error: hashError } = await db.rpc("hash_bumn_password", {
        p_password: password,
      });
      if (hashError || typeof passwordHash !== "string") {
        console.error("Password hashing failed:", hashError?.message ?? "empty hash");
        return badRequest(req, "Password tidak dapat diproses.", 500);
      }

      const { data: created, error } = await db.from("bumn_users")
        .insert({
          full_name: fullName,
          phone,
          email,
          password_hash: passwordHash,
          is_active: true,
        })
        .select("id,full_name,phone,email,avatar,is_active")
        .single();
      if (error) {
        if (error.code === "23505") {
          return badRequest(req, "Nomor telepon atau email sudah terdaftar.", 409);
        }
        throw error;
      }

      const session = await createSession(db, created.id);
      return jsonResponse(req, {
        success: true,
        message: "Pendaftaran berhasil.",
        data: { user: publicUser(created), ...session },
      }, 201);
    }

    if (action === "login") {
      const phone = normalizePhone(stringValue(body.phone));
      const password = stringValue(body.password);
      if (!validPhone(phone) || !password) return badRequest(req, "Kredensial tidak valid.");
      if (!await rateLimit(db, req, "auth-login-ip", 10, 900)) {
        return badRequest(req, "Terlalu banyak percobaan login. Coba lagi nanti.", 429);
      }
      if (!await rateLimit(db, req, "auth-login-phone", 5, 900, phone)) {
        return badRequest(req, "Nomor telepon atau password tidak sesuai.", 429);
      }

      const { data: user, error } = await db.from("bumn_users")
        .select("id,is_active,full_name,phone,email,avatar")
        .eq("phone", phone).maybeSingle();
      if (error) throw error;

      let validPassword = false;
      if (user) {
        const { data, error: verifyError } = await db.rpc("verify_bumn_password", {
          p_user_id: user.id,
          p_password: password,
        });
        if (verifyError) throw verifyError;
        validPassword = data === true;
      }
      if (!user || !validPassword) {
        return badRequest(req, "Nomor telepon atau password tidak sesuai.", 401);
      }
      if (!user.is_active) return badRequest(req, "Akun tidak aktif. Hubungi administrator.", 403);

      const session = await createSession(db, user.id);
      return jsonResponse(req, {
        success: true,
        message: "Login berhasil.",
        data: { user: publicUser(user), ...session },
      });
    }

    if (action === "logout") {
      const auth = await authenticateSession(db, req, body);
      if (!auth) return badRequest(req, "Sesi tidak valid atau sudah kedaluwarsa.", 401);
      await revokeSession(db, req, body);
      return jsonResponse(req, { success: true, message: "Logout berhasil." });
    }

    const auth = await authenticateSession(db, req, body);
    if (!auth) return badRequest(req, "Sesi tidak valid atau sudah kedaluwarsa. Silakan login kembali.", 401);
    if (!await rateLimit(db, req, "auth-user", 120, 60, auth.user.id)) {
      return badRequest(req, "Terlalu banyak permintaan. Coba lagi sebentar.", 429);
    }
    const user = auth.user;

    if (action === "get-profile") {
      return jsonResponse(req, { success: true, data: { user: publicProfile(user) } });
    }

    if (action === "update-profile") {
      if (!body.profile || typeof body.profile !== "object" || Array.isArray(body.profile)) {
        return badRequest(req, "Data profil tidak valid.");
      }
      const input = body.profile as Body;
      const allowed = [
        "full_name", "email", "birth_place", "birth_date", "gender",
        "address", "city", "province", "postal_code",
      ];
      if (Object.keys(input).some((key) => !allowed.includes(key))) {
        return badRequest(req, "Terdapat field profil yang tidak diizinkan.");
      }

      const updates: Body = { updated_at: new Date().toISOString() };
      if ("full_name" in input) {
        const fullName = stringValue(input.full_name).trim();
        if (fullName.length < 2 || fullName.length > 120) {
          return badRequest(req, "Nama lengkap wajib diisi (2–120 karakter).");
        }
        updates.full_name = fullName;
      }
      if ("email" in input) {
        const raw = input.email === null ? "" : stringValue(input.email).trim().toLowerCase();
        if (raw && !validEmail(raw)) return badRequest(req, "Format email tidak valid.");
        updates.email = raw || null;
      }
      if ("gender" in input) {
        if (input.gender !== null && input.gender !== "" &&
            input.gender !== "Laki-laki" && input.gender !== "Perempuan") {
          return badRequest(req, "Jenis kelamin tidak valid.");
        }
        updates.gender = input.gender || null;
      }
      if ("birth_date" in input) {
        const value = input.birth_date;
        if (value !== null && value !== "" &&
            (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value) ||
             Number.isNaN(Date.parse(value)) || new Date(value).toISOString().slice(0, 10) !== value)) {
          return badRequest(req, "Tanggal lahir tidak valid.");
        }
        updates.birth_date = value || null;
      }
      const limits: Record<string, number> = {
        birth_place: 100, address: 500, city: 100, province: 100, postal_code: 10,
      };
      for (const [key, max] of Object.entries(limits)) {
        if (!(key in input)) continue;
        const value = input[key];
        if (value !== null && value !== undefined && typeof value !== "string") {
          return badRequest(req, `Field ${key} harus berupa teks.`);
        }
        const normalized = typeof value === "string" ? value.trim() : "";
        if (normalized.length > max) return badRequest(req, `Field ${key} melebihi batas karakter.`);
        updates[key] = normalized || null;
      }

      const { data, error } = await db.from("bumn_users").update(updates)
        .eq("id", user.id)
        .select("id,full_name,phone,email,avatar,is_active,birth_place,birth_date,gender,address,city,province,postal_code,created_at,updated_at")
        .single();
      if (error) {
        if (error.code === "23505") return badRequest(req, "Email sudah digunakan akun lain.", 409);
        throw error;
      }
      return jsonResponse(req, {
        success: true,
        message: "Profil berhasil diperbarui.",
        data: { user: publicProfile(data) },
      });
    }

    if (action === "upload-avatar") {
      if (!avatarFile) return badRequest(req, "File avatar wajib dipilih.");
      const extension = ALLOWED_TYPES.get(avatarFile.type);
      if (!extension) return badRequest(req, "Format foto harus JPG, PNG, atau WebP.", 415);
      if (avatarFile.size <= 0 || avatarFile.size > MAX_AVATAR_SIZE) {
        return badRequest(req, "Ukuran foto maksimal 5 MB.", 413);
      }
      if (!await validImageSignature(avatarFile)) {
        return badRequest(req, "Konten file bukan gambar yang valid.", 415);
      }

      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!supabaseUrl) throw new Error("Supabase URL is missing.");
      const objectPath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await db.storage.from(BUCKET).upload(objectPath, avatarFile, {
        contentType: avatarFile.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const avatar = db.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const { error: updateError } = await db.from("bumn_users")
        .update({ avatar, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (updateError) {
        await db.storage.from(BUCKET).remove([objectPath]);
        throw updateError;
      }

      const oldPath = getOwnedAvatarPath(user.avatar, user.id, supabaseUrl);
      if (oldPath && oldPath !== objectPath) {
        const { error: removeError } = await db.storage.from(BUCKET).remove([oldPath]);
        if (removeError) console.error("Old avatar cleanup failed:", removeError.message);
      }
      return jsonResponse(req, {
        success: true,
        message: "Avatar berhasil diperbarui.",
        data: { avatar },
      });
    }

    if (action === "delete-avatar") {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      if (!supabaseUrl) throw new Error("Supabase URL is missing.");
      const oldPath = getOwnedAvatarPath(user.avatar, user.id, supabaseUrl);
      const { error: updateError } = await db.from("bumn_users")
        .update({ avatar: null, updated_at: new Date().toISOString() }).eq("id", user.id);
      if (updateError) throw updateError;
      if (oldPath) {
        const { error: removeError } = await db.storage.from(BUCKET).remove([oldPath]);
        if (removeError) {
          console.error("Avatar object cleanup failed:", removeError.message);
          return badRequest(req, "Avatar dilepas dari profil, tetapi file lama gagal dihapus.", 500);
        }
      }
      return jsonResponse(req, {
        success: true,
        message: "Avatar berhasil dihapus.",
        data: { avatar: null },
      });
    }

    return badRequest(req, "Action tidak valid.");
  } catch (error) {
    console.error("bumn-auth error:", error instanceof Error ? error.message : "unknown");
    return badRequest(req, "Terjadi kesalahan pada server.", 500);
  }
});
