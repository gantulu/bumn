import { Bookmark, Building2, ChevronRight, Clock, GraduationCap, MapPin } from "lucide-react";
import type { Job } from "../../types/job";

interface JobCardProps {
  job: Job;
  saved: boolean;
  onToggleSaved: (id: string) => void;
  onOpen: (job: Job) => void;
}

function formatSalary(job: Job): string {
  if (!job.salary) return "Tidak dicantumkan";
  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: job.salary.currency, maximumFractionDigits: 0 });
  if (job.salary.minimum !== undefined && job.salary.maximum !== undefined) {
    return formatter.format(job.salary.minimum) + " – " + formatter.format(job.salary.maximum);
  }
  if (job.salary.minimum !== undefined) return "Mulai " + formatter.format(job.salary.minimum);
  if (job.salary.maximum !== undefined) return "Hingga " + formatter.format(job.salary.maximum);
  return "Tidak dicantumkan";
}

export function JobCard({ job, saved, onToggleSaved, onOpen }: JobCardProps) {
  return (
    <article className="job-card">
      <div className="job-top">
        <div className="company-logo"><Building2 size={23} /></div>
        <div className="company-info">
          <strong>{job.company}</strong>
          <span>Data contoh — belum terverifikasi</span>
        </div>
        <button className={"icon-button " + (saved ? "is-saved" : "")} type="button"
          onClick={() => onToggleSaved(job.id)} aria-label={saved ? "Hapus dari tersimpan" : "Simpan lowongan"} aria-pressed={saved}>
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>
      <h3>{job.title}</h3>
      <div className="job-meta">
        <span><MapPin size={14} />{job.location}</span>
        <span><Clock size={14} />{job.employmentType}</span>
        <span><GraduationCap size={14} />{job.education}</span>
      </div>
      <div className="job-bottom">
        <div>
          <span className="salary-label">Estimasi gaji</span>
          <strong className="salary">{formatSalary(job)}</strong>
        </div>
        <button className="detail-button" type="button" onClick={() => onOpen(job)}>
          Detail <ChevronRight size={16} />
        </button>
      </div>
    </article>
  );
}
