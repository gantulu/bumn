import { Search, X, SlidersHorizontal } from "lucide-react";
import { categories } from "../data/jobs";
import type { Job } from "../types/job";
import { JobCard } from "../components/jobs/JobCard";

interface SearchPageProps {
  jobs: Job[];
  query: string;
  category: string;
  savedIds: string[];
  onQueryChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onToggleSaved: (id: string) => void;
  onOpenJob: (job: Job) => void;
}

export function SearchPage({ jobs, query, category, savedIds, onQueryChange, onCategoryChange, onToggleSaved, onOpenJob }: SearchPageProps) {
  return (
    <>
      <section className="page-header">
        <div><h2>Cari Lowongan Kerja</h2><div className="page-description">Temukan pekerjaan sesuai minatmu.</div></div>
      </section>
      <section className="section">
        <label className="search-box search-box-light">
          <Search size={19} />
          <span className="sr-only">Cari posisi, perusahaan, atau lokasi</span>
          <input value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="Posisi, perusahaan, lokasi..." />
          {query && <button className="icon-button" type="button" onClick={() => onQueryChange("")} aria-label="Hapus pencarian"><X size={17} /></button>}
        </label>
        <div className="section-heading section-heading-spaced">
          <h2>Filter Kategori</h2><SlidersHorizontal size={18} color="#174a80" aria-hidden="true" />
        </div>
        <div className="category-scroll">
          {categories.map((item) => <button key={item} type="button" className={"category-chip " + (category === item ? "active" : "")}
            aria-pressed={category === item} onClick={() => onCategoryChange(item)}>{item}</button>)}
        </div>
      </section>
      <section className="section section-end">
        <div className="section-heading"><h2>Hasil Pencarian</h2><span className="result-count">{jobs.length} lowongan</span></div>
        <div className="job-list">
          {jobs.length ? jobs.map((job) => <JobCard key={job.id} job={job} saved={savedIds.includes(job.id)} onToggleSaved={onToggleSaved} onOpen={onOpenJob} />) :
            <div className="empty-state"><Search size={38} /><h3>Lowongan tidak ditemukan</h3><p>Coba gunakan kata kunci atau kategori lain.</p></div>}
        </div>
      </section>
    </>
  );
}
