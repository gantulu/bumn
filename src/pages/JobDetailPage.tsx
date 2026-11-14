import { useState } from "react";
import { Bookmark, Building2, CalendarDays, CheckCircle2, MapPin, Share2 } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { Job } from "../types/job";

interface JobDetailPageProps {
  jobs: Job[];
  savedIds: string[];
  onToggleSaved: (id: string) => void;
  onApply: (job: Job) => void;
}

function formatSalary(job: Job): string {
  if (!job.salary) return "Tidak dicantumkan";
  const formatter = new Intl.NumberFormat("id-ID", { style: "currency", currency: job.salary.currency, maximumFractionDigits: 0 });
  if (job.salary.minimum !== undefined && job.salary.maximum !== undefined) return formatter.format(job.salary.minimum) + " – " + formatter.format(job.salary.maximum);
  if (job.salary.minimum !== undefined) return "Mulai " + formatter.format(job.salary.minimum);
  if (job.salary.maximum !== undefined) return "Hingga " + formatter.format(job.salary.maximum);
  return "Tidak dicantumkan";
}

function formatDate(value?: string): string {
  if (!value) return "Belum tersedia";
  const date = new Date(value + "T00:00:00");
  if (Number.isNaN(date.getTime())) return "Belum tersedia";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

export function JobDetailPage({ jobs, savedIds, onToggleSaved, onApply }: JobDetailPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const [shareFeedback, setShareFeedback] = useState("");
  const job = jobs.find((item) => item.id === id);

  if (!job) {
    return <section className="detail-page-content"><div className="detail-section">
      <h2>Lowongan tidak ditemukan</h2><p>Periksa kembali tautan atau kembali ke daftar lowongan.</p>
      <button className="apply-button" type="button" onClick={() => navigate("/lowongan")}>Kembali ke daftar lowongan</button>
    </div></section>;
  }

  const saved = savedIds.includes(job.id);
  const closingTime = job.closingAt ? new Date(job.closingAt + "T23:59:59") : null;
  const isExpired = closingTime ? closingTime.getTime() < Date.now() : false;
  const verificationMessage = job.verificationStatus === "verified"
    ? "Sumber lowongan telah diverifikasi."
    : job.verificationStatus === "unverified"
      ? "Sumber lowongan belum terverifikasi. Periksa situs karier perusahaan sebelum melamar."
      : "Ini adalah data contoh untuk demonstrasi aplikasi, bukan pengumuman rekrutmen resmi.";

  const shareJob = async () => {
    const url = window.location.href;
    const shareData = { title: job.title + " — " + job.company, text: "Informasi lowongan " + job.title + " di " + job.company, url };
    try {
      if (navigator.share) await navigator.share(shareData);
      else if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(url);
        setShareFeedback("Tautan lowongan berhasil disalin.");
      } else setShareFeedback("Fitur berbagi tidak didukung browser ini.");
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") setShareFeedback("Tautan belum dapat dibagikan.");
    }
  };

  const relatedJobs = jobs.filter((item) => item.id !== job.id && item.category === job.category);

  return (
    <div className="detail-page-content">
      <section className="detail-hero">
        {job.coverImageUrl && <img className="detail-cover" src={job.coverImageUrl} alt={"Gambar ilustrasi " + job.title} loading="eager" />}
        <div className="company-logo"><Building2 size={25} /></div>
        <h2>{job.title}</h2>
        <div className="company-name">{job.company}</div>
        <div className="job-meta">
          <span><MapPin size={14} />{job.location}</span>
          <span><CalendarDays size={14} />Ditutup {formatDate(job.closingAt)}</span>
        </div>
        <div className="detail-actions-secondary">
          <span className="source-note">{verificationMessage}</span>
        </div>
      </section>

      <section className="detail-section">
        <h3>Ringkasan Lowongan</h3>
        <div className="detail-grid">
          <div className="detail-fact"><span>Perusahaan</span><strong>{job.company}</strong></div>
          <div className="detail-fact"><span>Kategori</span><strong>{job.category}</strong></div>
          <div className="detail-fact"><span>Jenis pekerjaan</span><strong>{job.employmentType}</strong></div>
          <div className="detail-fact"><span>Pendidikan</span><strong>{job.education}</strong></div>
          <div className="detail-fact"><span>Lokasi</span><strong>{job.location}</strong></div>
          <div className="detail-fact"><span>Status data</span><strong>{job.verificationStatus === "sample" ? "Contoh" : job.verificationStatus === "verified" ? "Terverifikasi" : "Belum terverifikasi"}</strong></div>
        </div>
      </section>

      <section className="detail-section"><h3>Deskripsi Pekerjaan</h3><p>{job.description}</p></section>
      <section className="detail-section"><h3>Kualifikasi dan Persyaratan</h3><ul>{job.qualifications.map((item) => <li key={item}>{item}</li>)}</ul></section>
      <section className="detail-section">
        <h3>Estimasi Gaji</h3>
        <div className="salary-highlight"><span>Informasi kompensasi</span><strong>{formatSalary(job)}</strong>{job.salary?.period && <small>Periode: {job.salary.period}</small>}</div>
      </section>
      <section className="detail-section">
        <h3>Informasi Pendaftaran</h3>
        <div className="detail-grid">
          <div className="detail-fact"><span>Batas pendaftaran</span><strong>{formatDate(job.closingAt)}</strong></div>
          <div className="detail-fact"><span>Status</span><strong>{isExpired ? "Kedaluwarsa" : "Belum melewati tanggal penutupan"}</strong></div>
        </div>
        <p>{job.applicationUrl ? "Tautan pendaftaran tersedia pada sumber lowongan." : "Tautan pendaftaran resmi belum tersedia pada data aplikasi."}</p>
        {job.sourceUrl && <p><a href={job.sourceUrl} target="_blank" rel="noreferrer">Lihat sumber lowongan</a></p>}
      </section>
      <section className="detail-section"><h3>Sumber dan Verifikasi</h3><div className="source-note">{verificationMessage}</div></section>
      <section className="detail-section">
        <h3>Lowongan Terkait</h3>
        {relatedJobs.length ? relatedJobs.map((item) => <button className="related-job" key={item.id} type="button" onClick={() => navigate("/lowongan/" + item.id)}>
          <strong>{item.title}</strong><span>{item.company} · {item.location}</span>
        </button>) : <p>Belum ada lowongan lain dalam kategori ini.</p>}
      </section>

      <div className="bottom-action-bar" aria-label="Aksi lowongan">
        <button type="button" className={"save-action " + (saved ? "is-saved" : "")} aria-pressed={saved} onClick={() => onToggleSaved(job.id)}>
          <Bookmark size={17} fill={saved ? "currentColor" : "none"} />{saved ? "Tersimpan" : "Simpan"}
        </button>
        <button type="button" className="share-action" onClick={() => void shareJob()}><Share2 size={17} />Bagikan</button>
        <button type="button" className="apply-button" disabled={isExpired} onClick={() => onApply(job)}>
          {isExpired ? "Pendaftaran Ditutup" : "Lamar Sekarang"}
        </button>
      </div>
      {shareFeedback && <div className="share-feedback" role="status" style={{ textAlign: "center", padding: "4px 10px" }}>{shareFeedback}</div>}
    </div>
  );
}
