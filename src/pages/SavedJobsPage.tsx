import { Bookmark } from "lucide-react";
import type { Job } from "../types/job";
import { JobCard } from "../components/jobs/JobCard";

interface SavedJobsPageProps {
  jobs: Job[];
  savedIds: string[];
  onToggleSaved: (id: string) => void;
  onOpenJob: (job: Job) => void;
}

export function SavedJobsPage({ jobs, savedIds, onToggleSaved, onOpenJob }: SavedJobsPageProps) {
  return (
    <>
      <section className="page-header"><div><h2>Lowongan Tersimpan</h2><div className="page-description">Daftar pekerjaan favoritmu.</div></div></section>
      <section className="section section-end">
        <div className="job-list">
          {jobs.length ? jobs.map((job) => <JobCard key={job.id} job={job} saved={savedIds.includes(job.id)} onToggleSaved={onToggleSaved} onOpen={onOpenJob} />) :
            <div className="empty-state"><Bookmark size={38} /><h3>Belum ada lowongan tersimpan</h3><p>Simpan lowongan yang menarik untuk dilihat kembali.</p></div>}
        </div>
      </section>
    </>
  );
}
