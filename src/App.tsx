
import { useEffect, useMemo, useState } from "react";
import { HashRouter, Route, Routes, useLocation, useNavigate } from "react-router-dom";
import {
  Home,
  Search,
  Bookmark,
  User,
  Bell,
  BriefcaseBusiness,
  Building2,
  MapPin,
  Clock,
  GraduationCap,
  Calculator,
  Monitor,
  Settings,
  Users,
  ChevronRight,
  ArrowLeft,
  SlidersHorizontal,
  X,
  CheckCircle2,
  LogIn,
  UserPlus,
  LogOut,
  Share2,
} from "lucide-react";

type Job = {
  id: string;
  title: string;
  company: string;
  category: string;
  location: string;
  type: string;
  education: string;
  salary: string;
  deadline: string;
  closingAt: string | null;
  description: string;
  richTextDescription: string;
  qualifications: string[];
  imageUrl?: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  createdAt: string | null;
  updatedAt: string | null;
};

type ApiJob = {
  id: string;
  title: string;
  company: string;
  category: string;
  location: string;
  employment_type: string;
  education: string;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string;
  description: string;
  rich_text_description?: string | null;
  qualifications: string[] | null;
  closing_at: string | null;
  cover_image_url: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type JobsApiResponse = {
  success: boolean;
  data: ApiJob[];
  pagination?: {
    count: number;
    limit: number;
    offset: number;
    has_more: boolean;
  };
};

const JOBS_API_URL = "https://zyiavfljweavoxyyplxj.supabase.co/functions/v1/get-bumn-jobs";

function formatSalary(min: number | null, max: number | null, currency: string): string {
  if (min == null && max == null) return "Tidak dicantumkan";
  let formatter: Intl.NumberFormat;
  try {
    formatter = new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: currency || "IDR",
      maximumFractionDigits: 0,
    });
  } catch {
    formatter = new Intl.NumberFormat("id-ID", { maximumFractionDigits: 0 });
  }
  if (min != null && max != null) return `${formatter.format(min)} – ${formatter.format(max)}`;
  if (min != null) return `Mulai ${formatter.format(min)}`;
  return `Hingga ${formatter.format(max as number)}`;
}

function formatDeadline(value: string | null): string {
  if (!value) return "Tidak dicantumkan";
  const date = new Date(`${value.slice(0, 10)}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "Tidak dicantumkan";
  return new Intl.DateTimeFormat("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

function mapApiJob(item: ApiJob): Job {
  return {
    id: item.id,
    title: item.title,
    company: item.company,
    category: item.category,
    location: item.location,
    type: item.employment_type || "Tidak dicantumkan",
    education: item.education || "Tidak dicantumkan",
    salary: formatSalary(item.salary_min, item.salary_max, item.salary_currency || "IDR"),
    deadline: formatDeadline(item.closing_at),
    closingAt: item.closing_at,
    description: item.description || "",
    richTextDescription: item.rich_text_description || "",
    qualifications: Array.isArray(item.qualifications) ? item.qualifications : [],
    imageUrl: item.cover_image_url || undefined,
    salary_min: item.salary_min,
    salary_max: item.salary_max,
    salary_currency: item.salary_currency || "IDR",
    createdAt: item.created_at,
    updatedAt: item.updated_at,
  };
}

function sanitizeRichText(html: string): string {
  if (!html || typeof DOMParser === "undefined") return "";
  const parsed = new DOMParser().parseFromString(html, "text/html");
  const allowedTags = new Set(["P", "B", "STRONG", "I", "EM", "UL", "OL", "LI", "BR"]);
  const cleanNode = (node: Node): string => {
    if (node.nodeType === Node.TEXT_NODE) return (node.textContent || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    if (node.nodeType !== Node.ELEMENT_NODE) return "";
    const element = node as Element;
    const children = Array.from(element.childNodes).map(cleanNode).join("");
    if (!allowedTags.has(element.tagName)) return children;
    const tag = element.tagName.toLowerCase();
    return tag === "br" ? "<br>" : `<${tag}>${children}</${tag}>`;
  };
  return Array.from(parsed.body.childNodes).map(cleanNode).join("");
}

function getCategoryIcon(category: string) {
  const value = category.toLowerCase();
  if (value.includes("it") || value.includes("digital") || value.includes("technology")) return Monitor;
  if (value.includes("finance") || value.includes("keuangan") || value.includes("account")) return Calculator;
  if (value.includes("engineer") || value.includes("teknik")) return Settings;
  if (value.includes("admin") || value.includes("human") || value.includes("hr")) return Users;
  if (value.includes("management") || value.includes("bisnis")) return Building2;
  return BriefcaseBusiness;
}

type Tab = "home" | "search" | "saved" | "profile";

type StoredUser = {
  name: string;
  email: string;
  passwordSalt: string;
  passwordHash: string;
};

type AuthUser = Pick<StoredUser, "name" | "email">;

const USERS_STORAGE_KEY = "bumn_users";
const SESSION_STORAGE_KEY = "bumn_session";
const SAVED_JOBS_STORAGE_KEY = "bumn_saved_jobs";

function readSavedJobs(): string[] {
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(SAVED_JOBS_STORAGE_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function readStoredUsers(): StoredUser[] {
  try {
    const value = localStorage.getItem(USERS_STORAGE_KEY);
    const parsed: unknown = value ? JSON.parse(value) : [];
    return Array.isArray(parsed) ? parsed as StoredUser[] : [];
  } catch {
    return [];
  }
}

function readSessionUser(): AuthUser | null {
  try {
    const email = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!email) return null;
    const user = readStoredUsers().find((item) => item.email === email);
    return user ? { name: user.name, email: user.email } : null;
  } catch {
    return null;
  }
}

async function hashPassword(password: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${salt}:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function createPasswordSalt(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function AppContent() {
  const navigate = useNavigate();
  const location = useLocation();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [jobsError, setJobsError] = useState("");
  const [jobsRefreshKey, setJobsRefreshKey] = useState(0);

  useEffect(() => {
    const controller = new AbortController();

    const loadJobs = async () => {
      setIsLoadingJobs(true);
      setJobsError("");
      try {
        const response = await fetch(JOBS_API_URL, {
          method: "GET",
          headers: { Accept: "application/json" },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Permintaan API gagal (HTTP ${response.status}).`);
        const payload = await response.json() as JobsApiResponse;
        if (!payload.success || !Array.isArray(payload.data)) {
          throw new Error("Format respons API lowongan tidak sesuai.");
        }
        setJobs(payload.data.map(mapApiJob));
      } catch (error) {
        if (error instanceof Error && error.name !== "AbortError") {
          setJobsError(error.message || "Lowongan gagal dimuat. Silakan coba lagi.");
        }
      } finally {
        if (!controller.signal.aborted) setIsLoadingJobs(false);
      }
    };

    void loadJobs();
    return () => controller.abort();
  }, [jobsRefreshKey]);

  const categories = useMemo(() => [
    { name: "Semua", icon: BriefcaseBusiness },
    ...Array.from(new Set(jobs.map((job) => job.category).filter(Boolean)))
      .sort((a, b) => a.localeCompare(b, "id"))
      .map((name) => ({ name, icon: getCategoryIcon(name) })),
  ], [jobs]);

  const companies = useMemo(
    () => Array.from(new Set(jobs.map((job) => job.company).filter(Boolean))),
    [jobs],
  );

  const isLoginPage = location.pathname === "/login";
  const isRegisterPage = location.pathname === "/daftar";
  const activeTab: Tab = location.pathname.startsWith("/lowongan")
    ? "search"
    : location.pathname === "/tersimpan"
      ? "saved"
      : location.pathname === "/profil" || isLoginPage || isRegisterPage
        ? "profile"
        : "home";
  const selectedJob = jobs.find((job) => location.pathname === `/lowongan/${job.id}`) ?? null;
  const isJobDetailPath = /^\/lowongan\/[^/]+$/.test(location.pathname);
  const isInvalidJobDetail = isJobDetailPath && !selectedJob && !isLoadingJobs && !jobsError;
  const [shareFeedback, setShareFeedback] = useState("");
  const isJobExpired = selectedJob?.closingAt ? new Date(`${selectedJob.closingAt.slice(0, 10)}T23:59:59`).getTime() < Date.now() : false;
  const shareJob = async (job: Job) => {
    const shareData = { title: `${job.title} — ${job.company}`, text: `Informasi lowongan ${job.title} di ${job.company}`, url: window.location.href };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareData.url);
        setShareFeedback("Tautan lowongan berhasil disalin.");
      } else setShareFeedback("Fitur berbagi tidak didukung browser ini.");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setShareFeedback("Tautan belum dapat dibagikan.");
    }
  };
  const applicationJob = jobs.find((job) => location.pathname === `/lamar/${job.id}`) ?? null;
  const setActiveTab = (tab: Tab) => {
    const paths: Record<Tab, string> = {
      home: "/",
      search: "/lowongan",
      saved: "/tersimpan",
      profile: "/profil",
    };
    navigate(paths[tab]);
  };
  const setSelectedJob = (job: Job | null) => {
    if (job) {
      navigate(`/lowongan/${job.id}`, { state: { from: location.pathname } });
      return;
    }
    navigate((location.state as { from?: string } | null)?.from ?? "/lowongan");
  };
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [saved, setSaved] = useState<string[]>(() => readSavedJobs());
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => readSessionUser());
  const [applicationName, setApplicationName] = useState("");
  const [applicationEmail, setApplicationEmail] = useState("");
  const [applicationPhone, setApplicationPhone] = useState("");
  const [applicationEducation, setApplicationEducation] = useState("");
  const [applicationSubmitted, setApplicationSubmitted] = useState(false);
  const [authName, setAuthName] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authError, setAuthError] = useState("");

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    const name = authName.trim();
    const email = authEmail.trim().toLowerCase();
    if (!name || !email || authPassword.length < 8) {
      setAuthError("Lengkapi semua data. Password minimal 8 karakter.");
      return;
    }

    try {
      const users = readStoredUsers();
      if (users.some((user) => user.email === email)) {
        setAuthError("Email sudah terdaftar. Silakan login.");
        return;
      }
      const passwordSalt = createPasswordSalt();
      const passwordHash = await hashPassword(authPassword, passwordSalt);
      const newUser: StoredUser = { name, email, passwordSalt, passwordHash };
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([...users, newUser]));
      localStorage.setItem(SESSION_STORAGE_KEY, email);
      setCurrentUser({ name, email });
      setAuthPassword("");
      navigate("/profil", { replace: true });
    } catch {
      setAuthError("Pendaftaran gagal. Pastikan browser mengizinkan penyimpanan lokal.");
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setAuthError("");

    const email = authEmail.trim().toLowerCase();
    try {
      const user = readStoredUsers().find((item) => item.email === email);
      if (!user || await hashPassword(authPassword, user.passwordSalt) !== user.passwordHash) {
        setAuthError("Email atau password tidak sesuai.");
        return;
      }
      localStorage.setItem(SESSION_STORAGE_KEY, user.email);
      setCurrentUser({ name: user.name, email: user.email });
      setAuthPassword("");
      navigate("/profil", { replace: true });
    } catch {
      setAuthError("Login gagal. Periksa dukungan penyimpanan browser.");
    }
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_STORAGE_KEY);
    setCurrentUser(null);
    setAuthEmail("");
    setAuthPassword("");
    navigate("/", { replace: true });
  };

  const filteredJobs = useMemo(() => {
    return jobs.filter((job) => {
      const matchesSearch = [
        job.title,
        job.company,
        job.location,
        job.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(search.toLowerCase());

      const matchesCategory =
        category === "Semua" || job.category === category;

      const matchesSaved =
        activeTab !== "saved" || saved.includes(job.id);

      return matchesSearch && matchesCategory && matchesSaved;
    });
  }, [jobs, search, category, activeTab, saved]);

  const toggleSaved = (id: string) => {
    const nextSaved = saved.includes(id)
      ? saved.filter((item) => item !== id)
      : [...saved, id];
    setSaved(nextSaved);
    try {
      localStorage.setItem(SAVED_JOBS_STORAGE_KEY, JSON.stringify(nextSaved));
    } catch {
      // Saving remains available for the current session if storage is unavailable.
    }
  };

  const startApplication = (job: Job) => {
    setApplicationName(currentUser?.name ?? "");
    setApplicationEmail(currentUser?.email ?? "");
    setApplicationPhone("");
    setApplicationEducation("");
    setApplicationSubmitted(false);
    navigate(`/lamar/${job.id}`);
  };

  const submitApplication = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setApplicationSubmitted(true);
  };

  const openSearch = () => {
    setActiveTab("search");
  };

  const renderJob = (job: Job) => (
    <article className="job-card" key={job.id}>
      <div className="job-top">
        <div className="company-logo">
          <Building2 size={23} />
        </div>
        <div className="company-info">
          <strong>{job.company}</strong>
          <span>{job.category || "Kategori tidak dicantumkan"}</span>
        </div>
        <button
          className={`icon-button ${
            saved.includes(job.id) ? "is-saved" : ""
          }`}
          onClick={() => toggleSaved(job.id)}
          aria-label="Simpan lowongan"
        >
          <Bookmark
            size={20}
            fill={saved.includes(job.id) ? "currentColor" : "none"}
          />
        </button>
      </div>

      <h3>{job.title}</h3>

      <div className="job-meta">
        <span><MapPin size={14} />{job.location}</span>
        <span><Clock size={14} />{job.type}</span>
        <span><GraduationCap size={14} />{job.education}</span>
        <span>Batas: {job.deadline}</span>
      </div>

      <div className="job-bottom">
        <div>
          <span className="salary-label">Estimasi gaji</span>
          <strong className="salary">{job.salary}</strong>
        </div>
        <button
          className="detail-button"
          onClick={() => setSelectedJob(job)}
        >
          Detail <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );

  return (
    <div className="app-container">
      <style>{`
        * { box-sizing: border-box; }
        html, body, #root {
          margin: 0;
          width: 100%;
          height: 100%;
        }
        body {
          font-family: Inter, Arial, sans-serif;
          background: #edf1f6;
          color: #253247;
        }
        button, input { font: inherit; }
        button { cursor: pointer; }
        .app-container {
          width: 100%;
          max-width: 500px;
          height: 100%;
          margin: 0 auto;
          display: flex;
          flex-direction: column;
          overflow: hidden;
          background: #f6f8fb;
          position: relative;
        }
        .main-content {
          flex: 1;
          min-height: 0;
          overflow-y: auto;
          scrollbar-width: none;
        }
        .main-content::-webkit-scrollbar { display: none; }
        .header {
          padding: 17px 20px;
          background: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
          border-bottom: 1px solid #edf0f4;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          font-size: 17px;
          font-weight: 800;
          color: #123d72;
        }
        .brand-icon {
          background: #123d72;
          color: white;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border-radius: 11px;
        }
        .icon-button {
          width: 38px;
          height: 38px;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #64748b;
          display: grid;
          place-items: center;
        }
        .icon-button.is-saved { color: #174a80; }
        .hero {
          padding: 25px 20px 22px;
          background: #123d72;
          color: white;
        }
        .hero h1 {
          font-size: 25px;
          line-height: 1.3;
          margin: 0 0 9px;
          font-weight: 800;
        }
        .hero p {
          margin: 0;
          color: #dce8f7;
          font-size: 13px;
          line-height: 1.6;
        }
        .search-box {
          display: flex;
          align-items: center;
          gap: 10px;
          background: white;
          border-radius: 11px;
          padding: 0 13px;
          height: 49px;
          color: #8491a2;
          margin-top: 20px;
        }
        .search-box input {
          flex: 1;
          min-width: 0;
          border: 0;
          outline: none;
          color: #253247;
          background: transparent;
          font-size: 13px;
        }
        .stats {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
          margin-top: 19px;
        }
        .stat {
          padding: 12px;
          background: #ffffff17;
          border-radius: 10px;
        }
        .stat strong {
          display: block;
          font-size: 21px;
        }
        .stat span {
          font-size: 11px;
          color: #dce8f7;
        }
        .section { padding: 22px 18px 0; }
        .section-heading {
          display: flex;
          align-items: center;
          justify-content: space-between;
          margin-bottom: 15px;
        }
        .section-heading h2 {
          margin: 0;
          font-size: 16px;
          font-weight: 750;
        }
        .link-button {
          border: 0;
          background: none;
          color: #2462a0;
          font-size: 12px;
          font-weight: 700;
        }
        .category-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 10px;
        }
        .category-item {
          border: 1px solid #e9edf2;
          border-radius: 12px;
          background: white;
          padding: 13px 4px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 9px;
          color: #174a80;
          font-size: 10px;
          font-weight: 650;
          min-width: 0;
        }
        .category-item.active {
          background: #eaf1fa;
          border-color: #174a80;
        }
        .category-scroll {
          display: flex;
          gap: 9px;
          overflow-x: auto;
          padding-bottom: 5px;
          scrollbar-width: none;
        }
        .category-chip {
          flex-shrink: 0;
          padding: 9px 15px;
          border: 1px solid #e1e6ed;
          border-radius: 30px;
          background: white;
          color: #64748b;
          font-size: 12px;
        }
        .category-chip.active {
          color: white;
          background: #174a80;
          border-color: #174a80;
        }
        .job-list {
          display: flex;
          flex-direction: column;
          gap: 12px;
        }
        .job-card {
          padding: 15px;
          background: white;
          border: 1px solid #edf0f4;
          border-radius: 13px;
        }
        .job-top {
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .company-logo {
          width: 42px;
          height: 42px;
          flex-shrink: 0;
          display: grid;
          place-items: center;
          background: #edf3fa;
          color: #174a80;
          border-radius: 10px;
        }
        .company-info { flex: 1; min-width: 0; }
        .company-info strong {
          display: block;
          font-size: 12px;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
        .company-info span {
          display: block;
          color: #8995a5;
          font-size: 10px;
          margin-top: 4px;
        }
        .job-card h3 {
          margin: 15px 0 11px;
          font-size: 15px;
        }
        .job-meta {
          display: flex;
          flex-wrap: wrap;
          gap: 12px;
          color: #758296;
          font-size: 10px;
        }
        .job-meta span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .job-bottom {
          display: flex;
          justify-content: space-between;
          align-items: end;
          margin-top: 16px;
          padding-top: 13px;
          border-top: 1px solid #edf0f4;
        }
        .salary-label {
          display: block;
          color: #8995a5;
          font-size: 10px;
          margin-bottom: 4px;
        }
        .salary { color: #174a80; font-size: 13px; }
        .detail-button {
          border: 0;
          border-radius: 8px;
          padding: 9px 12px;
          display: flex;
          align-items: center;
          gap: 4px;
          background: #174a80;
          color: white;
          font-size: 11px;
          font-weight: 650;
        }
        .company-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 10px;
        }
        .company-tile {
          border: 1px solid #edf0f4;
          border-radius: 11px;
          background: white;
          padding: 14px 5px;
          text-align: center;
          font-size: 10px;
          font-weight: 650;
          color: #39485c;
        }
        .company-tile svg {
          display: block;
          margin: 0 auto 8px;
          color: #174a80;
        }
        .bottom-nav {
          flex-shrink: 0;
          height: 67px;
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          background: white;
          border-top: 1px solid #e9edf2;
          padding-bottom: env(safe-area-inset-bottom);
        }
        .nav-item {
          border: 0;
          background: none;
          color: #929cac;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 5px;
          font-size: 10px;
        }
        .nav-item.active { color: #174a80; font-weight: 750; }
        .page-header {
          display: flex;
          align-items: center;
          gap: 12px;
          background: white;
          padding: 19px;
        }
        .page-header h2 { font-size: 18px; margin: 0; }
        .page-description {
          color: #8290a0;
          font-size: 12px;
          margin-top: 6px;
        }
        .filter-button {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 10px 13px;
          border-radius: 9px;
          border: 1px solid #e1e6ed;
          background: white;
          color: #174a80;
          font-size: 12px;
        }
        .empty-state {
          padding: 55px 25px;
          text-align: center;
          color: #8290a0;
        }
        .empty-state svg {
          margin-bottom: 12px;
          color: #aab7c7;
        }
        .empty-state h3 { color: #253247; font-size: 16px; }
        .profile-card {
          background: white;
          margin: 18px;
          border-radius: 14px;
          padding: 22px;
          text-align: center;
        }
        .profile-avatar {
          width: 65px;
          height: 65px;
          border-radius: 50%;
          background: #eaf1fa;
          color: #174a80;
          display: grid;
          place-items: center;
          margin: auto auto 12px;
        }
        .detail-page-header {
          min-height: 62px;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          padding: 10px 20px;
          background: white;
          border-bottom: 1px solid #edf0f4;
        }
        .detail-page-header strong { font-size: 15px; }
        .detail-page-content { padding: 20px 18px 32px; max-width: 760px; margin: 0 auto; width: 100%; }
        .detail-hero, .detail-section { background: white; border: 1px solid #edf0f4; border-radius: 14px; padding: 17px; margin-bottom: 12px; }
        .detail-hero .company-logo { width: 52px; height: 52px; }
        .detail-cover { display: block; width: 100%; height: 190px; object-fit: cover; border-radius: 11px; margin-bottom: 16px; background: #e8edf3; }
        .detail-hero h2 { margin: 14px 0 7px; font-size: 23px; line-height: 1.3; }
        .detail-hero .company-name { color: #526176; font-size: 13px; }
        .detail-hero .job-meta { margin-top: 13px; display: flex; flex-wrap: wrap; gap: 9px 14px; color: #64748b; font-size: 12px; }
        .detail-page-content h3 { margin: 0 0 12px; font-size: 15px; color: #253247; }
        .detail-page-content p, .detail-page-content li { color: #64748b; font-size: 13px; line-height: 1.75; }
        .detail-page-content p { margin: 7px 0; }
        .detail-page-content ul { padding-left: 20px; margin: 0; }
        .detail-main { background: #f6f8fb; padding-bottom: 10px; }
        .detail-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
        .detail-fact { background: #f6f8fb; border-radius: 10px; padding: 11px; min-width: 0; }
        .detail-fact span { display: block; color: #8290a0; font-size: 10px; margin-bottom: 5px; }
        .detail-fact strong { display: block; color: #253247; font-size: 12px; overflow-wrap: anywhere; }
        .salary-highlight { background: #edf5ff; border: 1px solid #d9e9fb; border-radius: 12px; padding: 15px; }
        .salary-highlight span { display: block; color: #526b87; font-size: 11px; }
        .salary-highlight strong { display: block; color: #174a80; font-size: 21px; margin-top: 5px; }
        .salary-highlight small { display: block; color: #64748b; font-size: 11px; margin-top: 5px; }
        .source-note { padding: 12px; border-radius: 9px; background: #fff7e8; color: #855b16; font-size: 12px; line-height: 1.6; }
        .detail-actions-secondary { display: flex; justify-content: flex-end; margin-top: 10px; }
        .share-feedback { color: #17633b; font-size: 11px; }
        .related-job { width: 100%; text-align: left; border: 1px solid #edf0f4; border-radius: 10px; background: #fff; padding: 12px; margin-top: 8px; color: #253247; }
        .related-job strong { display: block; font-size: 12px; }
        .related-job span { display: block; color: #8290a0; font-size: 11px; margin-top: 5px; }
        .bottom-action-bar {
          flex-shrink: 0; display: grid; grid-template-columns: minmax(0, .9fr) minmax(0, .8fr) minmax(0, 1.5fr);
          gap: 8px; padding: 10px 14px calc(10px + env(safe-area-inset-bottom)); background: white; border-top: 1px solid #e9edf2;
        }
        .share-action { min-height: 48px; display: flex; align-items: center; justify-content: center; gap: 6px; border: 1px solid #dce3ec; border-radius: 11px; background: white; color: #174a80; font-size: 12px; font-weight: 700; }
        .bottom-action-bar .apply-button { margin: 0; min-height: 48px; padding: 10px; font-size: 12px; }
        .bottom-action-bar .apply-button:disabled { background: #aab4c1; cursor: not-allowed; }
        .save-action {
          min-height: 48px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: 1px solid #dce3ec;
          border-radius: 11px;
          background: white;
          color: #174a80;
          font-weight: 700;
        }
        .save-action.is-saved { background: #eaf1fa; border-color: #174a80; }
        .bottom-action-bar .apply-button { margin: 0; min-height: 48px; }
        .application-card {
          margin: 18px;
          padding: 20px;
          border: 1px solid #edf0f4;
          border-radius: 14px;
          background: white;
        }
        .application-card h2 { margin: 0 0 8px; font-size: 19px; }
        .application-card p { color: #64748b; font-size: 12px; line-height: 1.6; }
        .application-form { display: grid; gap: 14px; margin-top: 20px; }
        .application-form label { display: grid; gap: 7px; color: #39485c; font-size: 12px; font-weight: 650; }
        .application-form input, .application-form select {
          width: 100%; min-height: 45px; padding: 10px 12px;
          border: 1px solid #dce3ec; border-radius: 9px;
          background: white; color: #253247; font-size: 13px;
        }
        .application-success { padding: 15px; border-radius: 10px; background: #eaf7ef; color: #17633b; font-size: 13px; line-height: 1.6; }
        .apply-button {
          width: 100%;
          border: 0;
          background: #174a80;
          color: white;
          border-radius: 11px;
          padding: 14px;
          font-weight: 700;
          margin-top: 15px;
        }
        .notice {
          padding: 12px;
          border-radius: 9px;
          background: #eaf1fa;
          color: #174a80;
          font-size: 12px;
        }
        .auth-card {
          margin: 18px;
          padding: 22px;
          border: 1px solid #edf0f4;
          border-radius: 14px;
          background: white;
        }
        .auth-card h2 { margin: 0 0 8px; font-size: 20px; color: #253247; }
        .auth-card > p { margin: 0 0 20px; color: #8290a0; font-size: 12px; line-height: 1.6; }
        .auth-form { display: flex; flex-direction: column; gap: 13px; }
        .auth-form label { display: flex; flex-direction: column; gap: 7px; color: #39485c; font-size: 12px; font-weight: 650; }
        .auth-form input {
          width: 100%; height: 45px; padding: 0 12px; border: 1px solid #dce3ec;
          border-radius: 9px; outline: none; background: #fff; color: #253247; font-size: 13px;
        }
        .auth-form input:focus { border-color: #174a80; box-shadow: 0 0 0 3px #174a8018; }
        .auth-error { padding: 10px 12px; border-radius: 8px; background: #fff0f0; color: #b42318; font-size: 12px; }
        .auth-link { border: 0; background: none; color: #174a80; font-size: 12px; font-weight: 700; padding: 12px 0 0; }
        .auth-secondary { width: 100%; border: 1px solid #dce3ec; background: white; color: #174a80; border-radius: 10px; padding: 12px; font-weight: 700; margin-top: 10px; }
        @media (min-width: 501px) {
          .app-container {
            height: 100%;
            box-shadow: 0 0 35px #172b4512;
          }
        }
      `}</style>

      {/* HEADER */}
      {isJobDetailPath ? (
        <header className="detail-page-header">
          <button
            className="icon-button"
            type="button"
            aria-label="Kembali ke daftar lowongan"
            onClick={() => navigate((location.state as { from?: string } | null)?.from ?? "/lowongan")}
          >
            <ArrowLeft size={21} />
          </button>
          <strong>Detail Lowongan</strong>
          <span aria-hidden="true" style={{ width: 38, height: 38 }} />
        </header>
      ) : (
        <header className="header">
          <div className="brand">
            <div className="brand-icon">
              <BriefcaseBusiness size={21} />
            </div>
            BUMN CAREER
          </div>
          <button className="icon-button" aria-label="Notifikasi">
            <Bell size={21} />
          </button>
        </header>
      )}

      <main className={`main-content ${selectedJob ? "detail-main" : ""}`}>
        {isLoadingJobs && (
          <div className="section" role="status">
            <div className="notice">Memuat lowongan terbaru...</div>
          </div>
        )}
        {jobsError && (
          <div className="section" role="alert">
            <div className="source-note">
              {jobsError}
              <button className="link-button" type="button" onClick={() => setJobsRefreshKey((value) => value + 1)}>
                Coba lagi
              </button>
            </div>
          </div>
        )}
        {selectedJob && (
          <section className="detail-page-content">
            <div className="detail-hero">
              {selectedJob.imageUrl && <img className="detail-cover" src={selectedJob.imageUrl} alt={`Gambar utama ${selectedJob.title}`} loading="eager" />}
              <div className="company-logo"><Building2 size={25} /></div>
              <h2>{selectedJob.title}</h2>
              <div className="company-name">{selectedJob.company}</div>
              <div className="job-meta">
                <span><MapPin size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedJob.location}</span>
                <span><Clock size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedJob.type}</span>
                <span><GraduationCap size={14} style={{ display: "inline", verticalAlign: "middle" }} /> {selectedJob.education}</span>
              </div>
              <div className="source-note" style={{ marginTop: 15 }} role="note">
                <CheckCircle2 size={15} style={{ display: "inline", verticalAlign: "middle" }} /> Informasi ditampilkan berdasarkan data API. Konfirmasi status rekrutmen melalui kanal karier resmi perusahaan.
              </div>
            </div>

            <section className="detail-section">
              <h3>Informasi Gaji</h3>
              <div className="salary-highlight">
                <span>Estimasi kompensasi</span>
                <strong>{selectedJob.salary === "Kompetitif" ? "Kompetitif" : selectedJob.salary}</strong>
                <small>{selectedJob.salary === "Kompetitif" ? "Nominal belum dicantumkan oleh sumber." : "Periode dan status gross/net belum dicantumkan."}</small>
              </div>
              <p>Nilai gaji ditampilkan sesuai salary_min, salary_max, dan salary_currency dari data lowongan.</p>
            </section>

            <section className="detail-section">
              <h3>Ringkasan Pekerjaan</h3>
              <div className="detail-grid">
                <div className="detail-fact"><span>Lokasi</span><strong>{selectedJob.location}</strong></div>
                <div className="detail-fact"><span>Jenis pekerjaan</span><strong>{selectedJob.type}</strong></div>
                <div className="detail-fact"><span>Pendidikan</span><strong>{selectedJob.education}</strong></div>
                <div className="detail-fact"><span>Kategori</span><strong>{selectedJob.category || "Tidak dicantumkan"}</strong></div>
              </div>
            </section>

            <section className="detail-section">
              <h3>Deskripsi Pekerjaan</h3>
              {selectedJob.richTextDescription ? (
                <div dangerouslySetInnerHTML={{ __html: sanitizeRichText(selectedJob.richTextDescription) }} />
              ) : (
                <p>{selectedJob.description || "Deskripsi belum tersedia."}</p>
              )}
            </section>

            <section className="detail-section">
              <h3>Kualifikasi dan Persyaratan</h3>
              {selectedJob.qualifications.length ? (
                <ul>{selectedJob.qualifications.map((qualification, index) => <li key={`${selectedJob.id}-qualification-${index}`}>{qualification}</li>)}</ul>
              ) : <p>Kualifikasi belum dicantumkan.</p>}
            </section>

            <section className="detail-section">
              <h3>Informasi Pendaftaran</h3>
              <div className="detail-grid">
                <div className="detail-fact"><span>Batas pendaftaran</span><strong>{selectedJob.deadline}</strong></div>
                <div className="detail-fact"><span>Status</span><strong>{isJobExpired ? "Kedaluwarsa" : "Tanggal penutupan belum terlewati"}</strong></div>
              </div>
              <p>Edge Function belum menyediakan field tautan pendaftaran. Gunakan informasi perusahaan untuk mencari kanal karier resminya.</p>
            </section>

            <section className="detail-section">
              <h3>Informasi Data</h3>
              <div className="detail-grid">
                <div className="detail-fact"><span>ID Lowongan</span><strong>{selectedJob.id}</strong></div>
                <div className="detail-fact"><span>Dibuat</span><strong>{formatDeadline(selectedJob.createdAt)}</strong></div>
                <div className="detail-fact"><span>Diperbarui</span><strong>{formatDeadline(selectedJob.updatedAt)}</strong></div>
              </div>
              <p>Informasi ini dimuat dari Supabase melalui Edge Function get-bumn-jobs.</p>
            </section>

            <section className="detail-section">
              <h3>Lowongan Terkait</h3>
              {jobs.filter((job) => job.id !== selectedJob.id && job.category === selectedJob.category).length ? (
                jobs.filter((job) => job.id !== selectedJob.id && job.category === selectedJob.category).map((job) => (
                  <button className="related-job" key={job.id} type="button" onClick={() => navigate(`/lowongan/${job.id}`)}>
                    <strong>{job.title}</strong><span>{job.company} · {job.location}</span>
                  </button>
                ))
              ) : <p>Belum ada lowongan lain dalam kategori ini.</p>}
            </section>
          </section>
        )}
        {isInvalidJobDetail && (
          <section className="detail-page-content">
            <div className="detail-section">
              <h2>Lowongan tidak ditemukan</h2>
              <p>Periksa kembali tautan atau kembali ke daftar lowongan.</p>
              <button className="apply-button" type="button" onClick={() => navigate("/lowongan")}>Kembali ke daftar lowongan</button>
            </div>
          </section>
        )}
        {!selectedJob && (isLoginPage || isRegisterPage) && (
          <section className="auth-card">
            <h2>{isLoginPage ? "Selamat Datang Kembali" : "Buat Akun BUMN Career"}</h2>
            <p>
              {isLoginPage
                ? "Masuk untuk mengelola profil dan aktivitas pencarian kerja."
                : "Daftar untuk menyimpan lowongan dan mengelola profilmu."}
            </p>
            <form className="auth-form" onSubmit={isLoginPage ? handleLogin : handleRegister}>
              {isRegisterPage && (
                <label>
                  Nama lengkap
                  <input value={authName} onChange={(event) => setAuthName(event.target.value)} autoComplete="name" required placeholder="Nama lengkap" />
                </label>
              )}
              <label>
                Email
                <input type="email" value={authEmail} onChange={(event) => setAuthEmail(event.target.value)} autoComplete="email" required placeholder="nama@email.com" />
              </label>
              <label>
                Password
                <input type="password" value={authPassword} onChange={(event) => setAuthPassword(event.target.value)} autoComplete={isLoginPage ? "current-password" : "new-password"} minLength={8} required placeholder="Minimal 8 karakter" />
              </label>
              {authError && <div className="auth-error" role="alert">{authError}</div>}
              <button className="apply-button" type="submit">
                {isLoginPage ? <><LogIn size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Masuk</> : <><UserPlus size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Daftar</>}
              </button>
            </form>
            <button className="auth-link" onClick={() => { setAuthError(""); setAuthPassword(""); navigate(isLoginPage ? "/daftar" : "/login"); }}>
              {isLoginPage ? "Belum punya akun? Daftar" : "Sudah punya akun? Login"}
            </button>
            <button className="auth-secondary" onClick={() => navigate("/profil")}>Kembali ke Profil</button>
            <p style={{ marginTop: 16, marginBottom: 0, fontSize: 10 }}>
              Akun disimpan hanya di browser/perangkat ini. Ini adalah autentikasi demo, bukan sistem akun produksi.
            </p>
          </section>
        )}

        {applicationJob && (
          <section className="application-card">
            <button className="auth-link" type="button" onClick={() => navigate(`/lowongan/${applicationJob.id}`)}>
              <ArrowLeft size={15} style={{ display: "inline", verticalAlign: "middle" }} /> Kembali ke detail lowongan
            </button>
            <h2>Formulir Lamaran</h2>
            <p><strong>{applicationJob.title}</strong><br />{applicationJob.company} · {applicationJob.location}</p>
            {applicationSubmitted ? (
              <div className="application-success" role="status">
                <strong>Simulasi lamaran berhasil.</strong><br />Data belum dikirim ke perusahaan. Fitur pengiriman lamaran memerlukan backend yang belum tersedia pada V1.
              </div>
            ) : (
              <form className="application-form" onSubmit={submitApplication}>
                <label>Nama lengkap
                  <input value={applicationName} onChange={(event) => setApplicationName(event.target.value)} autoComplete="name" required placeholder="Masukkan nama lengkap" />
                </label>
                <label>Email
                  <input type="email" value={applicationEmail} onChange={(event) => setApplicationEmail(event.target.value)} autoComplete="email" required placeholder="nama@email.com" />
                </label>
                <label>Nomor telepon
                  <input type="tel" value={applicationPhone} onChange={(event) => setApplicationPhone(event.target.value)} autoComplete="tel" required placeholder="08xxxxxxxxxx" />
                </label>
                <label>Pendidikan terakhir
                  <select value={applicationEducation} onChange={(event) => setApplicationEducation(event.target.value)} required>
                    <option value="">Pilih pendidikan</option>
                    <option value="SMA/SMK">SMA/SMK</option>
                    <option value="D3">D3</option>
                    <option value="S1">S1</option>
                    <option value="S2">S2</option>
                    <option value="S3">S3</option>
                  </select>
                </label>
                <button className="apply-button" type="submit">Kirim Simulasi Lamaran</button>
              </form>
            )}
            <p>Catatan: formulir ini hanya simulasi. Data lamaran tidak dikirim ke perusahaan karena API lowongan belum menyediakan endpoint pendaftaran.</p>
          </section>
        )}

        {!selectedJob && !applicationJob && !isLoginPage && !isRegisterPage && activeTab === "home" && (
          <>
            <section className="hero">
              <h1>Temukan Karier Impianmu!</h1>
              <p>
                Jelajahi peluang karier di perusahaan BUMN
                Indonesia dan wujudkan masa depanmu.
              </p>

              <div className="search-box">
                <Search size={19} />
                <input
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setActiveTab("search");
                  }}
                  placeholder="Cari posisi atau perusahaan..."
                />
              </div>

              <div className="stats">
                <div className="stat">
                  <strong>{jobs.length}</strong>
                  <span>Lowongan</span>
                </div>
                <div className="stat">
                  <strong>{companies.length}</strong>
                  <span>Perusahaan</span>
                </div>
                <div className="stat">
                  <strong>{categories.length - 1}</strong>
                  <span>Kategori</span>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h2>Kategori Pekerjaan</h2>
                <button className="link-button" onClick={openSearch}>
                  Lihat Semua
                </button>
              </div>

              <div className="category-grid">
                {categories.slice(1).map((item) => {
                  const Icon = item.icon;
                  return (
                    <button
                      key={item.name}
                      className={`category-item ${
                        category === item.name ? "active" : ""
                      }`}
                      onClick={() => {
                        setCategory(item.name);
                        setActiveTab("search");
                      }}
                    >
                      <Icon size={23} />
                      {item.name}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="section">
              <div className="section-heading">
                <h2>Lowongan Terbaru</h2>
                <button className="link-button" onClick={openSearch}>
                  Lihat Semua →
                </button>
              </div>
              <div className="job-list">
                {jobs.slice(0, 3).map(renderJob)}
              </div>
            </section>

            <section className="section" style={{ paddingBottom: 25 }}>
              <div className="section-heading">
                <h2>Perusahaan BUMN</h2>
                <button className="link-button" onClick={openSearch}>
                  Lihat Semua →
                </button>
              </div>
              <div className="company-grid">
                {companies.map((company) => (
                  <div className="company-tile" key={company}>
                    <Building2 size={24} />
                    {company}
                  </div>
                ))}
              </div>
            </section>
          </>
        )}

        {!selectedJob && !isLoginPage && !isRegisterPage && activeTab === "search" && (
          <>
            <section className="page-header">
              <div>
                <h2>Cari Lowongan Kerja</h2>
                <div className="page-description">
                  Temukan pekerjaan sesuai minatmu.
                </div>
              </div>
            </section>

            <section className="section">
              <div className="search-box" style={{
                marginTop: 0,
                border: "1px solid #e1e6ed"
              }}>
                <Search size={19} />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Posisi, perusahaan, lokasi..."
                />
                {search && (
                  <button className="icon-button" onClick={() => setSearch("")}>
                    <X size={17} />
                  </button>
                )}
              </div>

              <div className="section-heading" style={{ marginTop: 20 }}>
                <h2>Filter Kategori</h2>
                <SlidersHorizontal size={18} color="#174a80" />
              </div>

              <div className="category-scroll">
                {categories.map((item) => (
                  <button
                    key={item.name}
                    className={`category-chip ${
                      category === item.name ? "active" : ""
                    }`}
                    onClick={() => setCategory(item.name)}
                  >
                    {item.name}
                  </button>
                ))}
              </div>
            </section>

            <section className="section" style={{ paddingBottom: 25 }}>
              <div className="section-heading">
                <h2>Hasil Pencarian</h2>
                <span style={{ color: "#8290a0", fontSize: 12 }}>
                  {filteredJobs.length} lowongan
                </span>
              </div>
              <div className="job-list">
                {filteredJobs.length ? (
                  filteredJobs.map(renderJob)
                ) : isLoadingJobs || jobsError ? null : (
                  <div className="empty-state">
                    <Search size={38} />
                    <h3>Lowongan tidak ditemukan</h3>
                    <p>Coba gunakan kata kunci atau kategori lain.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!selectedJob && !isLoginPage && !isRegisterPage && activeTab === "saved" && (
          <>
            <section className="page-header">
              <div>
                <h2>Lowongan Tersimpan</h2>
                <div className="page-description">
                  Daftar pekerjaan favoritmu.
                </div>
              </div>
            </section>
            <section className="section" style={{ paddingBottom: 25 }}>
              <div className="job-list">
                {filteredJobs.length ? (
                  filteredJobs.map(renderJob)
                ) : isLoadingJobs || jobsError ? null : (
                  <div className="empty-state">
                    <Bookmark size={38} />
                    <h3>Belum ada lowongan tersimpan</h3>
                    <p>Simpan lowongan yang menarik untuk dilihat kembali.</p>
                  </div>
                )}
              </div>
            </section>
          </>
        )}

        {!selectedJob && !isLoginPage && !isRegisterPage && activeTab === "profile" && (
          <>
            <section className="page-header">
              <div>
                <h2>Profil Pengguna</h2>
                <div className="page-description">
                  Kelola informasi akun dan lamaranmu.
                </div>
              </div>
            </section>
            <div className="profile-card">
              <div className="profile-avatar">
                <User size={32} />
              </div>
              <h3>{currentUser ? currentUser.name : "Selamat Datang!"}</h3>
              <p>{currentUser ? currentUser.email : "Masuk untuk mengelola profil dan lamaran pekerjaan."}</p>
              {currentUser ? (
                <button className="apply-button" onClick={handleLogout}>
                  <LogOut size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Keluar
                </button>
              ) : (
                <>
                  <button className="apply-button" onClick={() => navigate("/login")}>
                    <LogIn size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Login
                  </button>
                  <button className="auth-secondary" onClick={() => navigate("/daftar")}>
                    <UserPlus size={16} style={{ display: "inline", verticalAlign: "middle" }} /> Daftar Akun
                  </button>
                </>
              )}
            </div>
            <section className="section">
              {[
                "Data Pribadi",
                "Riwayat Pendidikan",
                "Pengalaman Kerja",
                "Lamaran Saya",
                "Pengaturan",
              ].map((item) => (
                <div
                  key={item}
                  style={{
                    background: "white",
                    padding: 17,
                    borderRadius: 10,
                    marginBottom: 9,
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 13,
                  }}
                >
                  {item}
                  <ChevronRight size={17} color="#8290a0" />
                </div>
              ))}
            </section>
          </>
        )}
      </main>

      {/* BOTTOM NAVIGATION */}
      {!applicationJob && !isJobDetailPath && <nav className="bottom-nav">
        {[
          { id: "home" as Tab, label: "Beranda", icon: Home },
          { id: "search" as Tab, label: "Cari Kerja", icon: Search },
          { id: "saved" as Tab, label: "Tersimpan", icon: Bookmark },
          { id: "profile" as Tab, label: "Profil", icon: User },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              className={`nav-item ${
                activeTab === item.id ? "active" : ""
              }`}
              onClick={() => setActiveTab(item.id)}
            >
              <Icon size={21} />
              {item.label}
            </button>
          );
        })}
      </nav>}

      {/* DETAIL PAGE ACTIONS */}
      {selectedJob && (
        <div className="bottom-action-bar" aria-label="Aksi lowongan">
          <button type="button" className={`save-action ${saved.includes(selectedJob.id) ? "is-saved" : ""}`} aria-pressed={saved.includes(selectedJob.id)} onClick={() => toggleSaved(selectedJob.id)}>
            <Bookmark size={17} fill={saved.includes(selectedJob.id) ? "currentColor" : "none"} />
            {saved.includes(selectedJob.id) ? "Tersimpan" : "Simpan"}
          </button>
          <button type="button" className="share-action" onClick={() => void shareJob(selectedJob)}>
            <Share2 size={17} /> Bagikan
          </button>
          <button type="button" className="apply-button" disabled={isJobExpired} onClick={() => startApplication(selectedJob)}>
            {isJobExpired ? "Pendaftaran Ditutup" : "Lamar Sekarang"}
          </button>
        </div>
      )}
      {selectedJob && shareFeedback && <div className="share-feedback" role="status" style={{ textAlign: "center", padding: "4px 10px" }}>{shareFeedback}</div>}

    </div>
  );
}

export default function App() {
  return (
    <HashRouter>
      <Routes>
        <Route path="/*" element={<AppContent />} />
      </Routes>
    </HashRouter>
  );
}
