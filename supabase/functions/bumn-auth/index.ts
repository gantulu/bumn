import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json; charset=utf-8",
};

type AuthAction = "check-phone" | "register" | "login";

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

function publicUser(user: {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  is_active: boolean;
}) {
  return {
    id: user.id,
    full_name: user.full_name,
    phone: user.phone,
    email: user.email,
    avatar: user.avatar,
    is_active: user.is_active,
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return jsonResponse({ success: false, message: "Method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return jsonResponse({ success: false, message: "Invalid request body" }, 400);
    }

    const action = body.action as AuthAction;
    if (!["check-phone", "register", "login"].includes(action)) {
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
      const { data, error } = await supabase
        .from("bumn_users")
        .select("id")
        .eq("phone", phone)
        .maybeSingle();

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
      if (email && (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
        return jsonResponse({ success: false, message: "Format email tidak valid." }, 400);
      }

      const { data, error } = await supabase
        .from("bumn_users")
        .insert({
          full_name: fullName,
          phone,
          email,
          password,
          is_active: true,
        })
        .select("id, full_name, phone, email, avatar, is_active")
        .single();

      if (error) {
        if (error.code === "23505") {
          return jsonResponse({ success: false, message: "Nomor telepon atau email sudah terdaftar." }, 409);
        }
        throw error;
      }

      return jsonResponse({
        success: true,
        message: "Registration successful",
        data: { user: publicUser(data) },
      }, 201);
    }

    const password = typeof body.password === "string" ? body.password : "";
    if (!password) {
      return jsonResponse({ success: false, message: "Password wajib diisi." }, 400);
    }

    const { data: user, error } = await supabase
      .from("bumn_users")
      .select("id, full_name, phone, email, avatar, is_active, password")
      .eq("phone", phone)
      .maybeSingle();

    if (error) throw error;
    if (!user || user.password !== password) {
      return jsonResponse({ success: false, message: "Nomor telepon atau password tidak sesuai." }, 401);
    }
    if (!user.is_active) {
      return jsonResponse({ success: false, message: "Akun tidak aktif. Hubungi administrator." }, 403);
    }

    return jsonResponse({
      success: true,
      message: "Login successful",
      data: { user: publicUser(user) },
    });
  } catch (error) {
    console.error("bumn-auth error:", error);
    return jsonResponse({ success: false, message: "Terjadi kesalahan pada server." }, 500);
  }
});
