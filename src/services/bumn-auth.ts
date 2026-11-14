export type BumnAuthUser = {
  id: string;
  full_name: string;
  phone: string;
  email: string | null;
  avatar: string | null;
  is_active: boolean;
};

export type BumnProfile = BumnAuthUser & {
  birth_place: string | null;
  birth_date: string | null;
  gender: "Laki-laki" | "Perempuan" | null;
  address: string | null;
  city: string | null;
  province: string | null;
  postal_code: string | null;
  created_at: string;
  updated_at: string;
};

export type BumnProfileInput = Pick<
  BumnProfile,
  "full_name" | "email" | "birth_place" | "birth_date" | "gender" | "address" | "city" | "province" | "postal_code"
>;

type AuthResponse = {
  success: boolean;
  message?: string;
  data?: {
    exists?: boolean;
    user?: BumnAuthUser | BumnProfile;
    avatar?: string | null;
    session_token?: string;
    expires_at?: string;
  };
};

export type StoredBumnCredentials = {
  phone: string;
  session_token?: string;
  /** Legacy field is read only for one-time migration to a server session. */
  password?: string;
};

const BUMN_AUTH_URL =
  "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/bumn-auth";
export const BUMN_AUTH_STORAGE_KEY = "bumn_auth_credentials";

async function requestAuth(payload: Record<string, unknown>): Promise<AuthResponse> {
  const response = await fetch(BUMN_AUTH_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as AuthResponse;
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Permintaan gagal (HTTP ${response.status}).`);
  }
  return result;
}

function persistSession(phone: string, result: AuthResponse): void {
  const token = result.data?.session_token;
  if (!token) throw new Error("Token sesi tidak ditemukan pada respons server.");
  saveBumnCredentials({ phone, session_token: token });
}

export function normalizeBumnPhone(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function isValidBumnPhone(value: string): boolean {
  return /^62\d{8,13}$/.test(normalizeBumnPhone(value));
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
  const phone = normalizeBumnPhone(input.phone);
  const result = await requestAuth({
    action: "register",
    full_name: input.full_name,
    phone,
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    password: input.password,
  });
  if (!result.data?.user) throw new Error("Data akun tidak ditemukan pada respons server.");
  persistSession(phone, result);
  return result.data.user as BumnAuthUser;
}

export async function loginBumnUser(input: {
  phone: string;
  password?: string;
  session_token?: string;
}): Promise<BumnAuthUser> {
  if (input.session_token) {
    const result = await requestAuth({
      action: "get-profile",
      session_token: input.session_token,
    });
    if (!result.data?.user) throw new Error("Data sesi tidak ditemukan pada respons server.");
    return result.data.user as BumnAuthUser;
  }

  if (!input.password) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  const phone = normalizeBumnPhone(input.phone);
  const result = await requestAuth({
    action: "login",
    phone,
    password: input.password,
  });
  if (!result.data?.user) throw new Error("Data akun tidak ditemukan pada respons server.");
  persistSession(phone, result);
  return result.data.user as BumnAuthUser;
}

function getStoredSession(): StoredBumnCredentials {
  const credentials = readBumnCredentials();
  if (!credentials) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  if (!credentials.session_token) throw new Error("Sesi login kedaluwarsa. Silakan masuk kembali.");
  return credentials;
}

export async function getProfile(): Promise<BumnProfile> {
  const session = getStoredSession();
  const result = await requestAuth({ action: "get-profile", session_token: session.session_token });
  if (!result.data?.user) throw new Error("Data profil tidak ditemukan pada respons server.");
  return result.data.user as BumnProfile;
}

export async function updateProfile(profile: BumnProfileInput): Promise<BumnProfile> {
  const session = getStoredSession();
  const result = await requestAuth({
    action: "update-profile",
    session_token: session.session_token,
    profile,
  });
  if (!result.data?.user) throw new Error("Data profil tidak ditemukan pada respons server.");
  return result.data.user as BumnProfile;
}

export async function uploadAvatar(file: File): Promise<string> {
  const session = getStoredSession();
  const formData = new FormData();
  formData.append("action", "upload-avatar");
  formData.append("session_token", session.session_token!);
  formData.append("file", file);

  const response = await fetch(BUMN_AUTH_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const result = await response.json() as AuthResponse;
  if (!response.ok || !result.success || typeof result.data?.avatar !== "string") {
    throw new Error(result.message || `Upload avatar gagal (HTTP ${response.status}).`);
  }
  return result.data.avatar;
}

export async function deleteAvatar(): Promise<void> {
  const session = getStoredSession();
  const result = await requestAuth({ action: "delete-avatar", session_token: session.session_token });
  if (result.data?.avatar !== null) throw new Error("Respons penghapusan avatar tidak sesuai.");
}

export function saveBumnCredentials(credentials: StoredBumnCredentials): void {
  if (!credentials.session_token) return;
  try {
    localStorage.setItem(BUMN_AUTH_STORAGE_KEY, JSON.stringify({
      phone: credentials.phone,
      session_token: credentials.session_token,
    }));
  } catch {
    // The active page remains usable if browser storage is unavailable.
  }
}

export function readBumnCredentials(): StoredBumnCredentials | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BUMN_AUTH_STORAGE_KEY) ?? "null");
    if (!value || typeof value !== "object" || !("phone" in value) ||
        typeof value.phone !== "string" || !value.phone) return null;
    if ("session_token" in value && typeof value.session_token === "string" && value.session_token) {
      return { phone: value.phone, session_token: value.session_token };
    }
    // One-time compatibility path: successful legacy login replaces the stored password with a token.
    if ("password" in value && typeof value.password === "string" && value.password) {
      return { phone: value.phone, password: value.password };
    }
  } catch {
    // Ignore malformed or unavailable local storage.
  }
  return null;
}

export function clearBumnCredentials(): void {
  try {
    const session = readBumnCredentials();
    if (session?.session_token) {
      void fetch(BUMN_AUTH_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ action: "logout", session_token: session.session_token }),
        keepalive: true,
      }).catch(() => undefined);
    }
    localStorage.removeItem(BUMN_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage access errors during logout.
  }
}
