import { Building2, Calculator, Monitor, Settings, Users, BriefcaseBusiness } from "lucide-react";
import { companies, categories } from "../data/jobs";
import type { Job } from "../types/job";
import { JobCard } from "../components/jobs/JobCard";

const categoryIcons = [BriefcaseBusiness, Monitor, Calculator, Settings, Users, Building2];

interface HomePageProps {
  jobs: Job[];
  savedIds: string[];
  onSearchChange: (value: string) => void;
  onSearchSubmit: () => void;
  onSelectCategory: (category: string) => void;
  onToggleSaved: (id: string) => void;
  onOpenJob: (job: Job) => void;
}

export function HomePage({ jobs, savedIds, onSearchChange, onSearchSubmit, onSelectCategory, onToggleSaved, onOpenJob }: HomePageProps) {
  return (
    <>
      <section className="hero">
        <h1>Temukan Karier Impianmu!</h1>
        <p>Jelajahi peluang karier di perusahaan BUMN Indonesia dan wujudkan masa depanmu.</p>
        <label className="search-box">
          <span className="sr-only">Cari lowongan berdasarkan posisi, perusahaan, atau lokasi</span>
          <input onChange={(event) => onSearchChange(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter") onSearchSubmit(); }}
            placeholder="Cari posisi atau perusahaan..." />
        </label>
        <div className="stats">
          <div className="stat"><strong>{jobs.length}</strong><span>Lowongan contoh</span></div>
          <div className="stat"><strong>{companies.length}</strong><span>Perusahaan</span></div>
          <div className="stat"><strong>{categories.length - 1}</strong><span>Kategori</span></div>
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Kategori Pekerjaan</h2>
          <button className="link-button" type="button" onClick={() => onSelectCategory("Semua")}>Lihat Semua</button>
        </div>
        <div className="category-grid">
          {categories.slice(1).map((category) => {
            const Icon = categoryIcons[categories.indexOf(category)];
            return <button key={category} className="category-item" type="button" onClick={() => onSelectCategory(category)}>
              <Icon size={23} />{category}
            </button>;
          })}
        </div>
      </section>

      <section className="section">
        <div className="section-heading">
          <h2>Lowongan Terbaru</h2>
          <button className="link-button" type="button" onClick={() => onSelectCategory("Semua")}>Lihat Semua</button>
        </div>
        <div className="job-list">
          {jobs.slice(0, 3).map((job) => <JobCard key={job.id} job={job} saved={savedIds.includes(job.id)} onToggleSaved={onToggleSaved} onOpen={onOpenJob} />)}
        </div>
      </section>

      <section className="section" style={{ paddingBottom: 25 }}>
        <div className="section-heading"><h2>Perusahaan BUMN</h2></div>
        <div className="company-grid">
          {companies.map((company) => <div className="company-tile" key={company}><Building2 size={24} />{company}</div>)}
        </div>
      </section>
    </>
  );
}
