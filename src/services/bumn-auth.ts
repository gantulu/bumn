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
  };
};

const BUMN_AUTH_URL =
  "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/bumn-auth";

async function requestAuth(payload: Record<string, unknown>): Promise<AuthResponse> {
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

function getStoredCredentials(): StoredBumnCredentials {
  const credentials = readBumnCredentials();
  if (!credentials) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  return credentials;
}

export function normalizeBumnPhone(value: string): string {
  const digits = value.replace(/\\D/g, "");
  if (digits.startsWith("0")) return `62${digits.slice(1)}`;
  if (digits.startsWith("8")) return `62${digits}`;
  return digits;
}

export function isValidBumnPhone(value: string): boolean {
  return /^62\\d{8,13}$/.test(normalizeBumnPhone(value));
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
    ...(input.email?.trim() ? { email: input.email.trim() } : {}),
    password: input.password,
  });
  if (!result.data?.user) throw new Error("Data akun tidak ditemukan pada respons server.");
  return result.data.user as BumnAuthUser;
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
  return result.data.user as BumnAuthUser;
}

export async function getProfile(): Promise<BumnProfile> {
  const result = await requestAuth({ action: "get-profile", ...getStoredCredentials() });
  if (!result.data?.user) throw new Error("Data profil tidak ditemukan pada respons server.");
  return result.data.user as BumnProfile;
}

export async function updateProfile(profile: BumnProfileInput): Promise<BumnProfile> {
  const result = await requestAuth({
    action: "update-profile",
    ...getStoredCredentials(),
    profile,
  });
  if (!result.data?.user) throw new Error("Data profil tidak ditemukan pada respons server.");
  return result.data.user as BumnProfile;
}

export async function uploadAvatar(file: File): Promise<string> {
  const credentials = getStoredCredentials();
  const formData = new FormData();
  formData.append("action", "upload-avatar");
  formData.append("phone", credentials.phone);
  formData.append("password", credentials.password);
  formData.append("file", file);

  const response = await fetch(BUMN_AUTH_URL, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: formData,
  });
  const result = (await response.json()) as AuthResponse;
  if (!response.ok || !result.success || typeof result.data?.avatar !== "string") {
    throw new Error(result.message || `Upload avatar gagal (HTTP ${response.status}).`);
  }
  return result.data.avatar;
}

export async function deleteAvatar(): Promise<void> {
  const result = await requestAuth({ action: "delete-avatar", ...getStoredCredentials() });
  if (result.data?.avatar !== null) throw new Error("Respons penghapusan avatar tidak sesuai.");
}

export type StoredBumnCredentials = {
  phone: string;
  password: string;
};

export const BUMN_AUTH_STORAGE_KEY = "bumn_auth_credentials";

export function saveBumnCredentials(credentials: StoredBumnCredentials): void {
  try {
    localStorage.setItem(BUMN_AUTH_STORAGE_KEY, JSON.stringify(credentials));
  } catch {
    // Authentication can still complete for the current page session.
  }
}

export function readBumnCredentials(): StoredBumnCredentials | null {
  try {
    const value: unknown = JSON.parse(localStorage.getItem(BUMN_AUTH_STORAGE_KEY) ?? "null");
    if (
      value &&
      typeof value === "object" &&
      "phone" in value &&
      "password" in value &&
      typeof value.phone === "string" &&
      typeof value.password === "string" &&
      value.phone.length > 0 &&
      value.password.length > 0
    ) {
      return { phone: value.phone, password: value.password };
    }
  } catch {
    // Ignore malformed or unavailable local storage.
  }
  return null;
}

export function clearBumnCredentials(): void {
  try {
    localStorage.removeItem(BUMN_AUTH_STORAGE_KEY);
  } catch {
    // Ignore storage access errors during logout.
  }
}
