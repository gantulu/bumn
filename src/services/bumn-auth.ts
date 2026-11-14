export type BumnAuthUser = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  is_active: boolean;
};

type AuthResponse = {
  success: boolean;
  message?: string;
  data?: {
    exists?: boolean;
    user?: BumnAuthUser;
  };
};

const BUMN_AUTH_URL =
  "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/bumn-auth";

async function requestAuth(payload: Record<string, string>): Promise<AuthResponse> {
  const response = await fetch(BUMN_AUTH_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
    body: JSON.stringify(payload),
  });

  const result = (await response.json()) as AuthResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  return result;
}

export async function checkPhone(phone: string): Promise<boolean> {
  const result = await requestAuth({ action: "check-phone", phone });
  if (typeof result.data?.exists !== "boolean") {
    throw new Error("Format respons pemeriksaan nomor tidak sesuai.");
  }
  return result.data.exists;
}

export async function registerBumnUser(input: {
  full_name: string;
  phone: string;
  email?: string;
  password: string;
}): Promise<BumnAuthUser> {
  const result = await requestAuth({
    action: "register",
    full_name: input.full_name,
    phone: input.phone,
    email: input.email ?? "",
    password: input.password,
  });
  if (!result.data?.user) throw new Error("Data akun tidak ditemukan pada respons server.");
  return result.data.user;
}

export async function loginBumnUser(input: {
  phone: string;
  password: string;
}): Promise<BumnAuthUser> {
  const result = await requestAuth({
    action: "login",
    phone: input.phone,
    password: input.password,
  });
  if (!result.data?.user) throw new Error("Data akun tidak ditemukan pada respons server.");
  return result.data.user;
}
