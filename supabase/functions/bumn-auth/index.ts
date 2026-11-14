import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const BUCKET = "bumn-avatars";
const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type JsonBody = Record<string, unknown>;

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

function normalizePhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

function isValidPhone(phone: string): boolean {
  return /^62\d{8,13}$/.test(phone);
}

function publicUser(user: Record<string, unknown>) {
  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    is_active: user.is_active,
  };
}

function publicProfile(user: Record<string, unknown>) {
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

function isValidEmail(value: string): boolean {
  return value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
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
    if (!path.startsWith(`avatars/${userId}/`) || path.split("/").includes("..")) return null;
    return path;
  } catch {
    return null;
  }
}

async function hasValidImageSignature(file: File): Promise<boolean> {
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  if (file.type === "image/jpeg") return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (file.type === "image/png") return bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47;
  if (file.type === "image/webp") {
    return new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function verifyCredentials(supabase: ReturnType<typeof createClient>, phoneInput: unknown, passwordInput: unknown) {
  const phone = normalizePhone(typeof phoneInput === "string" ? phoneInput : "");
  const password = typeof passwordInput === "string" ? passwordInput : "";
  if (!isValidPhone(phone) || !password) {
    return { error: jsonResponse({ success: false, message: "Kredensial tidak valid." }, 400) };
  }

  const { data: user, error } = await supabase
    .from("bumn_users")
    .select("id, full_name, phone, email, avatar, is_active, password, birth_place, birth_date, gender, address, city, province, postal_code, created_at, updated_at")
    .eq("phone", phone)
    .maybeSingle();

  if (error) throw error;
  if (!user || user.password !== password) {
    return { error: jsonResponse({ success: false, message: "Nomor telepon atau password tidak sesuai." }, 401) };
  }
  if (!user.is_active) {
    return { error: jsonResponse({ success: false, message: "Akun tidak aktif. Hubungi administrator." }, 403) };
  }
  return { user };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") return jsonResponse({ success: false, message: "Method not allowed" }, 405);

  try {
    const contentType = req.headers.get("content-type") || "";
    const contentLength = Number(req.headers.get("content-length") || 0);
    if (contentType.includes("multipart/form-data") && contentLength > MAX_AVATAR_SIZE + 64 * 1024) {
      return jsonResponse({ success: false, message: "Ukuran foto maksimal 5 MB." }, 413);
    }
    let body: JsonBody;
    let avatarFile: File | null = null;

    if (contentType.includes("multipart/form-data")) {
      const form = await req.formData();
      body = {
        action: form.get("action"),
        phone: form.get("phone"),
        password: form.get("password"),
      };
      const file = form.get("file");
      avatarFile = file instanceof File ? file : null;
    } else {
      const parsed: unknown = await req.json();
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
        return jsonResponse({ success: false, message: "Invalid request body" }, 400);
      }
      body = parsed as JsonBody;
    }

    const action = typeof body.action === "string" ? body.action : "";
    const allowedActions = ["check-phone", "register", "login", "get-profile", "update-profile", "upload-avatar", "delete-avatar"];
    if (!allowedActions.includes(action)) {
      return jsonResponse({ success: false, message: "Action tidak valid." }, 400);
    }

    const phone = normalizePhone(typeof body.phone === "string" ? body.phone : "");
    if (!isValidPhone(phone)) {
      return jsonResponse({ success: false, message: "Nomor telepon tidak valid." }, 400);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      console.error("Missing Supabase function environment configuration.");
      return jsonResponse({ success: false, message: "Konfigurasi server belum lengkap." }, 500);
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    if (action === "check-phone") {
      const { data, error } = await supabase.from("bumn_users").select("id").eq("phone", phone).maybeSingle();
      if (error) throw error;
      return jsonResponse({ success: true, data: { exists: Boolean(data) } });
    }

    if (action === "register") {
      const fullName = typeof body.full_name === "string" ? body.full_name.trim() : "";
      const password = typeof body.password === "string" ? body.password : "";
      const rawEmail = typeof body.email === "string" ? body.email.trim() : "";
      const email = rawEmail ? rawEmail.toLowerCase() : null;

      if (fullName.length < 2 || fullName.length > 120) {
        return jsonResponse({ success: false, message: "Nama lengkap wajib diisi (2–120 karakter)." }, 400);
      }
      if (password.length < 8 || password.length > 128) {
        return jsonResponse({ success: false, message: "Password harus berisi 8–128 karakter." }, 400);
      }
      if (email && !isValidEmail(email)) {
        return jsonResponse({ success: false, message: "Format email tidak valid." }, 400);
      }

      const { data, error } = await supabase.from("bumn_users")
        .insert({ full_name: fullName, phone, email, password, is_active: true })
        .select("id, full_name, phone, email, avatar, is_active")
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonResponse({ success: false, message: "Nomor telepon atau email sudah terdaftar." }, 409);
        }
        throw error;
      }
      return jsonResponse({ success: true, message: "Registration successful", data: { user: publicUser(data) } }, 201);
    }

    if (action === "login") {
      const password = typeof body.password === "string" ? body.password : "";
      if (!password) return jsonResponse({ success: false, message: "Password wajib diisi." }, 400);

      const { data: user, error } = await supabase.from("bumn_users")
        .select("id, full_name, phone, email, avatar, is_active, password")
        .eq("phone", phone).maybeSingle();
      if (error) throw error;
      if (!user || user.password !== password) {
        return jsonResponse({ success: false, message: "Nomor telepon atau password tidak sesuai." }, 401);
      }
      if (!user.is_active) return jsonResponse({ success: false, message: "Akun tidak aktif. Hubungi administrator." }, 403);
      return jsonResponse({ success: true, message: "Login successful", data: { user: publicUser(user) } });
    }

    const verified = await verifyCredentials(supabase, phone, body.password);
    if ("error" in verified) return verified.error;
    const user = verified.user;

    if (action === "get-profile") {
      const { data, error } = await supabase.from("bumn_users")
        .select("id, full_name, phone, email, avatar, is_active, birth_place, birth_date, gender, address, city, province, postal_code, created_at, updated_at")
        .eq("id", user.id).single();
      if (error) throw error;
      return jsonResponse({ success: true, data: { user: publicProfile(data) } });
    }

    if (action === "update-profile") {
      const profile = body.profile;
      if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        return jsonResponse({ success: false, message: "Data profil tidak valid." }, 400);
      }
      const input = profile as Record<string, unknown>;
      const allowed = ["full_name", "email", "birth_place", "birth_date", "gender", "address", "city", "province", "postal_code"];
      if (Object.keys(input).some((key) => !allowed.includes(key))) {
        return jsonResponse({ success: false, message: "Terdapat field profil yang tidak diizinkan." }, 400);
      }

      const fullName = typeof input.full_name === "string" ? input.full_name.trim() : "";
      if (input.email !== null && typeof input.email !== "string") {
        return jsonResponse({ success: false, message: "Email harus berupa teks." }, 400);
      }
      const emailValue = typeof input.email === "string" ? input.email.trim().toLowerCase() : "";
      const email = emailValue || null;
      if (fullName.length < 2 || fullName.length > 120) {
        return jsonResponse({ success: false, message: "Nama lengkap wajib diisi (2–120 karakter)." }, 400);
      }
      if (email && !isValidEmail(email)) return jsonResponse({ success: false, message: "Format email tidak valid." }, 400);
      if (input.gender !== null && input.gender !== "" && input.gender !== "Laki-laki" && input.gender !== "Perempuan") {
        return jsonResponse({ success: false, message: "Jenis kelamin tidak valid." }, 400);
      }

      if (input.birth_date !== null && input.birth_date !== "" && typeof input.birth_date !== "string") {
        return jsonResponse({ success: false, message: "Tanggal lahir tidak valid." }, 400);
      }
      const birthDate = typeof input.birth_date === "string" && input.birth_date ? input.birth_date : null;
      const parsedBirthDate = birthDate ? new Date(\`${birthDate}T00:00:00.000Z\`) : null;
      if (birthDate && (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate) || !parsedBirthDate || Number.isNaN(parsedBirthDate.getTime()) || parsedBirthDate.toISOString().slice(0, 10) !== birthDate)) {
        return jsonResponse({ success: false, message: "Tanggal lahir tidak valid." }, 400);
      }

      const nullableTextFields = ["birth_place", "address", "city", "province", "postal_code"];
      const updates: Record<string, unknown> = {
        full_name: fullName,
        email,
        birth_date: birthDate,
        gender: input.gender || null,
        updated_at: new Date().toISOString(),
      };
      const limits: Record<string, number> = { birth_place: 100, address: 500, city: 100, province: 100, postal_code: 10 };
      for (const key of nullableTextFields) {
        const value = input[key];
        if (value !== undefined && value !== null && typeof value !== "string") {
          return jsonResponse({ success: false, message: `Field ${key} harus berupa teks.` }, 400);
        }
        const normalized = typeof value === "string" ? value.trim() : null;
        if (normalized && normalized.length > limits[key]) {
          return jsonResponse({ success: false, message: `Field ${key} melebihi batas karakter.` }, 400);
        }
        updates[key] = normalized || null;
      }

      const { data, error } = await supabase.from("bumn_users").update(updates)
        .eq("id", user.id)
        .select("id, full_name, phone, email, avatar, is_active, birth_place, birth_date, gender, address, city, province, postal_code, created_at, updated_at")
        .single();
      if (error) throw error;
      return jsonResponse({ success: true, message: "Profil berhasil diperbarui.", data: { user: publicProfile(data) } });
    }

    if (action === "upload-avatar") {
      if (!avatarFile) return jsonResponse({ success: false, message: "File avatar wajib dipilih." }, 400);
      const extension = ALLOWED_TYPES.get(avatarFile.type);
      if (!extension) return jsonResponse({ success: false, message: "Format foto harus JPG, PNG, atau WebP." }, 415);
      if (avatarFile.size <= 0 || avatarFile.size > MAX_AVATAR_SIZE) {
        return jsonResponse({ success: false, message: "Ukuran foto maksimal 5 MB." }, 413);
      }
      if (!await hasValidImageSignature(avatarFile)) {
        return jsonResponse({ success: false, message: "Konten file bukan gambar yang valid." }, 415);
      }

      const objectPath = `avatars/${user.id}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage.from(BUCKET).upload(objectPath, avatarFile, {
        contentType: avatarFile.type,
        cacheControl: "3600",
        upsert: false,
      });
      if (uploadError) throw uploadError;

      const avatar = supabase.storage.from(BUCKET).getPublicUrl(objectPath).data.publicUrl;
      const { error: updateError } = await supabase.from("bumn_users")
        .update({ avatar, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) {
        await supabase.storage.from(BUCKET).remove([objectPath]);
        throw updateError;
      }

      const oldPath = getOwnedAvatarPath(user.avatar, user.id, supabaseUrl);
      if (oldPath && oldPath !== objectPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldPath]);
        if (removeError) console.error("Old avatar cleanup failed:", removeError.message);
      }
      return jsonResponse({ success: true, message: "Avatar berhasil diperbarui.", data: { avatar } });
    }

    if (action === "delete-avatar") {
      const oldPath = getOwnedAvatarPath(user.avatar, user.id, supabaseUrl);
      const { error: updateError } = await supabase.from("bumn_users")
        .update({ avatar: null, updated_at: new Date().toISOString() })
        .eq("id", user.id);
      if (updateError) throw updateError;
      if (oldPath) {
        const { error: removeError } = await supabase.storage.from(BUCKET).remove([oldPath]);
        if (removeError) {
          console.error("Avatar object cleanup failed:", removeError.message);
          return jsonResponse({ success: false, message: "Avatar dilepas dari profil, tetapi file lama gagal dihapus." }, 500);
        }
      }
      return jsonResponse({ success: true, message: "Avatar berhasil dihapus.", data: { avatar: null } });
    }

    return jsonResponse({ success: false, message: "Action tidak valid." }, 400);
  } catch (error) {
    console.error("bumn-auth error:", error);
    return jsonResponse({ success: false, message: "Terjadi kesalahan pada server." }, 500);
  }
});
