
import React, { useMemo, useState } from "react";
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
  CalendarDays,
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
  description: string;
  qualifications: string[];
};

const jobs: Job[] = [
  {
    id: "LKG-001",
    title: "Management Trainee",
    company: "PT Pertamina (Persero)",
    category: "Bisnis",
    location: "Jakarta",
    type: "Full Time",
    education: "S1",
    salary: "Kompetitif",
    deadline: "30 November 2026",
    description:
      "Program pengembangan calon pemimpin masa depan melalui pelatihan dan pengalaman kerja lintas divisi.",
    qualifications: [
      "Pendidikan minimal S1",
      "IPK minimal 3.00",
      "Mampu berkomunikasi dengan baik",
      "Memiliki kemampuan analisis",
    ],
  },
  {
    id: "LKG-002",
    title: "IT Specialist",
    company: "PT Telkom Indonesia",
    category: "IT & Digital",
    location: "Bandung",
    type: "Full Time",
    education: "S1",
    salary: "Kompetitif",
    deadline: "25 November 2026",
    description:
      "Mengembangkan dan memelihara sistem teknologi informasi serta infrastruktur digital perusahaan.",
    qualifications: [
      "S1 Teknik Informatika atau Sistem Informasi",
      "Memahami pengembangan aplikasi",
      "Menguasai teknologi database",
      "Mampu bekerja dalam tim",
    ],
  },
  {
    id: "LKG-003",
    title: "Staff Administrasi",
    company: "PT Bank Mandiri (Persero) Tbk",
    category: "Administrasi",
    location: "Jakarta Selatan",
    type: "Full Time",
    education: "D3 / S1",
    salary: "Rp5–7 Juta",
    deadline: "20 November 2026",
    description:
      "Bertanggung jawab mengelola administrasi, dokumentasi dan operasional kantor.",
    qualifications: [
      "Pendidikan minimal D3",
      "Menguasai Microsoft Office",
      "Teliti dan bertanggung jawab",
    ],
  },
  {
    id: "LKG-004",
    title: "Electrical Engineer",
    company: "PT PLN (Persero)",
    category: "Teknik",
    location: "Surabaya",
    type: "Full Time",
    education: "S1",
    salary: "Kompetitif",
    deadline: "15 Desember 2026",
    description:
      "Mendukung kegiatan operasional, pemeliharaan dan pengembangan sistem kelistrikan.",
    qualifications: [
      "S1 Teknik Elektro",
      "Memahami sistem tenaga listrik",
      "Mampu bekerja secara tim",
    ],
  },
  {
    id: "LKG-005",
    title: "Finance Analyst",
    company: "PT Bank Rakyat Indonesia",
    category: "Keuangan",
    location: "Jakarta",
    type: "Full Time",
    education: "S1",
    salary: "Kompetitif",
    deadline: "10 Desember 2026",
    description:
      "Melakukan analisis keuangan, laporan dan evaluasi kinerja bisnis.",
    qualifications: [
      "S1 Akuntansi atau Manajemen",
      "Memahami analisis keuangan",
      "Menguasai Microsoft Excel",
    ],
  },
];

const categories = [
  { name: "Semua", icon: BriefcaseBusiness },
  { name: "IT & Digital", icon: Monitor },
  { name: "Keuangan", icon: Calculator },
  { name: "Teknik", icon: Settings },
  { name: "Administrasi", icon: Users },
  { name: "Bisnis", icon: Building2 },
];

const companies = [
  "Pertamina",
  "Bank Mandiri",
  "Telkom Indonesia",
  "PLN",
  "BRI",
  "KAI",
];

type Tab = "home" | "search" | "saved" | "profile";

export default function App() {
  const [activeTab, setActiveTab] = useState<Tab>("home");
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("Semua");
  const [saved, setSaved] = useState<string[]>([]);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);

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
  }, [search, category, activeTab, saved]);

  const toggleSaved = (id: string) => {
    setSaved((prev) =>
      prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id]
    );
  };

  const openSearch = () => {
    setActiveTab("search");
    setSelectedJob(null);
  };

  const renderJob = (job: Job) => (
    <article className="job-card" key={job.id}>
      <div className="job-top">
        <div className="company-logo">
          <Building2 size={23} />
        </div>
        <div className="company-info">
          <strong>{job.company}</strong>
          <span>Perusahaan BUMN</span>
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
        .detail-overlay {
          position: absolute;
          inset: 0;
          z-index: 5;
          background: #14233866;
          display: flex;
          align-items: end;
        }
        .detail-panel {
          background: #f6f8fb;
          width: 100%;
          max-height: 90%;
          overflow-y: auto;
          border-radius: 22px 22px 0 0;
          padding: 20px;
        }
        .detail-panel h2 { font-size: 20px; }
        .detail-panel h3 { font-size: 14px; }
        .detail-panel p, .detail-panel li {
          font-size: 13px;
          color: #64748b;
          line-height: 1.7;
        }
        .detail-panel li { margin-bottom: 5px; }
        .detail-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }
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
        @media (min-width: 501px) {
          .app-container {
            height: 100%;
            box-shadow: 0 0 35px #172b4512;
          }
        }
      `}</style>

      {/* HEADER */}
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

      <main className="main-content">
        {activeTab === "home" && (
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

        {activeTab === "search" && (
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
                ) : (
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

        {activeTab === "saved" && (
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
                ) : (
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

        {activeTab === "profile" && (
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
              <h3>Selamat Datang!</h3>
              <p>Masuk untuk mengelola profil dan lamaran pekerjaan.</p>
              <button className="apply-button">
                Login / Daftar
              </button>
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
      <nav className="bottom-nav">
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
              onClick={() => {
                setActiveTab(item.id);
                setSelectedJob(null);
              }}
            >
              <Icon size={21} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* JOB DETAIL */}
      {selectedJob && (
        <div
          className="detail-overlay"
          onClick={() => setSelectedJob(null)}
        >
          <div
            className="detail-panel"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="detail-header">
              <button
                className="icon-button"
                onClick={() => setSelectedJob(null)}
              >
                <ArrowLeft size={21} />
              </button>
              <strong>Detail Lowongan</strong>
              <button
                className="icon-button"
                onClick={() => toggleSaved(selectedJob.id)}
              >
                <Bookmark
                  size={20}
                  fill={
                    saved.includes(selectedJob.id)
                      ? "currentColor"
                      : "none"
                  }
                />
              </button>
            </div>

            <div style={{ paddingTop: 20 }}>
              <div className="company-logo">
                <Building2 size={25} />
              </div>
              <h2>{selectedJob.title}</h2>
              <strong>{selectedJob.company}</strong>
              <p>
                <MapPin size={14} style={{ display: "inline" }} />{" "}
                {selectedJob.location}
              </p>
              <div className="notice">
                <CheckCircle2 size={15} style={{ display: "inline" }} />{" "}
                Informasi contoh lowongan, bukan pengumuman resmi.
              </div>

              <h3>Deskripsi Pekerjaan</h3>
              <p>{selectedJob.description}</p>

              <h3>Kualifikasi</h3>
              <ul>
                {selectedJob.qualifications.map((q) => (
                  <li key={q}>{q}</li>
                ))}
              </ul>

              <h3>Informasi Lowongan</h3>
              <p>Jenis pekerjaan: {selectedJob.type}</p>
              <p>Pendidikan: {selectedJob.education}</p>
              <p>Estimasi gaji: {selectedJob.salary}</p>
              <p>
                <CalendarDays size={14} style={{ display: "inline" }} />{" "}
                Batas pendaftaran: {selectedJob.deadline}
              </p>

              <button
                className="apply-button"
                onClick={() =>
                  alert("Hubungkan lowongan ini dengan URL pendaftaran resmi.")
                }
              >
                Lamar Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
