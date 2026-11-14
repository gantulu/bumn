import { readBumnCredentials } from "./bumn-auth";

const URL_API = "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/bumn-lamar";
export type ApplicationStatus = "draft" | "submitted" | "reviewing" | "shortlisted" | "rejected" | "accepted" | "withdrawn";
export type ApplicationDocumentType = "diploma" | "high_school_diploma" | "identity_card";

export type Application = {
  id: string;
  application_number: string;
  user_id: string;
  job_id: string;
  status: ApplicationStatus;
  full_name: string;
  email: string | null;
  phone: string;
  cv_title: string | null;
  cv_summary: string | null;
  cv_skills: string[];
  cv_education_summary: string | null;
  cv_experience_summary: string | null;
  cv_portfolio_url: string | null;
  cover_letter_subject: string | null;
  cover_letter_content: string | null;
  cover_letter_created_at: string | null;
  diploma_file_name: string | null;
  diploma_file_path: string | null;
  diploma_file_type: string | null;
  diploma_file_size: number | null;
  diploma_uploaded_at: string | null;
  high_school_diploma_file_name: string | null;
  high_school_diploma_file_path: string | null;
  high_school_diploma_file_type: string | null;
  high_school_diploma_file_size: number | null;
  high_school_diploma_uploaded_at: string | null;
  identity_card_file_name: string | null;
  identity_card_file_path: string | null;
  identity_card_file_type: string | null;
  identity_card_file_size: number | null;
  identity_card_uploaded_at: string | null;
  education_level: string | null;
  education_institution: string | null;
  education_major: string | null;
  education_degree: string | null;
  education_start_year: number | null;
  education_graduation_year: number | null;
  education_gpa: number | null;
  education_description: string | null;
  experience_type: string | null;
  experience_company: string | null;
  experience_position: string | null;
  experience_employment_type: string | null;
  experience_location: string | null;
  experience_start_date: string | null;
  experience_end_date: string | null;
  experience_is_current: boolean;
  experience_description: string | null;
  experience_responsibilities: string[];
  submitted_at: string | null;
  created_at: string;
  updated_at: string;
  cv_snapshot: { version: number; captured_at: string; updated_at?: string; identity: Record<string, unknown>; cv: { headline?: string | null; summary?: string | null; skills?: string[]; education?: Record<string, unknown>[]; experiences?: Record<string, unknown>[]; certifications?: Record<string, unknown>[]; languages?: Record<string, unknown>[]; portfolio_url?: string | null; linkedin_url?: string | null; website_url?: string | null } } | null;
};

type Response<T> = {
  success: boolean;
  message?: string;
  data?: T;
  pagination?: unknown;
};

function sessionToken(): string {
  const session = readBumnCredentials();
  if (!session?.session_token) throw new Error("Sesi login tidak ditemukan. Silakan masuk kembali.");
  return session.session_token;
}

async function post<T>(payload: Record<string, unknown>): Promise<Response<T>> {
  const token = sessionToken();
  const response = await fetch(URL_API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json() as Response<T>;
  if (!response.ok || !result.success) {
    throw new Error(result.message || "Permintaan lamaran gagal.");
  }
  return result;
}

export async function listApplications(): Promise<Application[]> {
  const result = await post<Application[]>({ action: "list", limit: 50, offset: 0 });
  return Array.isArray(result.data) ? result.data : [];
}

export async function createApplication(jobId: string): Promise<Application> {
  const result = await post<Application>({ action: "create", job_id: jobId });
  if (!result.data) throw new Error("Draft tidak ditemukan.");
  return result.data;
}

export async function updateApplication(
  id: string,
  data: Record<string, unknown>,
): Promise<Application> {
  const result = await post<Application>({ action: "update", application_id: id, data });
  if (!result.data) throw new Error("Draft tidak ditemukan.");
  return result.data;
}

export async function submitApplication(id: string): Promise<Application> {
  const result = await post<Application>({ action: "submit", application_id: id });
  if (!result.data) throw new Error("Status lamaran tidak ditemukan.");
  return result.data;
}

export async function uploadApplicationDocument(
  id: string,
  type: ApplicationDocumentType,
  file: File,
): Promise<Application> {
  if (file.size <= 0 || file.size > 5 * 1024 * 1024) {
    throw new Error("Ukuran dokumen maksimal 5 MB.");
  }
  if (!["application/pdf", "image/jpeg", "image/png"].includes(file.type)) {
    throw new Error("Dokumen harus PDF, JPG, atau PNG.");
  }

  const form = new FormData();
  form.append("action", "upload-document");
  form.append("session_token", sessionToken());
  form.append("application_id", id);
  form.append("document_type", type);
  form.append("file", file);

  const response = await fetch(URL_API, {
    method: "POST",
    headers: { Accept: "application/json" },
    body: form,
  });
  const result = await response.json() as Response<Application>;
  if (!response.ok || !result.success || !result.data) {
    throw new Error(result.message || "Upload dokumen gagal.");
  }
  return result.data;
}

export async function getApplicationDocumentUrl(
  id: string,
  type: ApplicationDocumentType,
): Promise<string> {
  const result = await post<{ signed_url: string; expires_in: number }>({
    action: "get-document-url",
    application_id: id,
    document_type: type,
  });
  if (!result.data?.signed_url) throw new Error("Tautan dokumen tidak tersedia.");
  return result.data.signed_url;
}
