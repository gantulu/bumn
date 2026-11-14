const SAVED_JOBS_STORAGE_KEY = "bumn_saved_jobs";

export function readSavedJobs(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_JOBS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

export function writeSavedJobs(ids: string[]): boolean {
  try {
    localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(ids));
    return true;
  } catch {
    return false;
  }
}
