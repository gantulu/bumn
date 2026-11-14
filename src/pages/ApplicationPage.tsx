import { useState, type FormEvent } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate, useParams } from "react-router-dom";
import type { Job } from "../types/job";

interface ApplicationPageProps { jobs: Job[]; }

export function ApplicationPage({ jobs }: ApplicationPageProps) {
  const { id } = useParams();
  const navigate = useNavigate();
  const job = jobs.find((item) => item.id === id);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [education, setEducation] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (!job) {
    return <section className="application-card"><h2>Lowongan tidak ditemukan</h2><button className="apply-button" type="button" onClick={() => navigate("/lowongan")}>Kembali ke daftar lowongan</button></section>;
  }

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
  };

  return (
    <section className="application-card">
      <button className="auth-link" type="button" onClick={() => navigate("/lowongan/" + job.id)}>
        <ArrowLeft size={15} style={{ display: "inline", verticalAlign: "middle" }} /> Kembali ke detail lowongan
      </button>
      <h2>Formulir Simulasi Lamaran</h2>
      <p><strong>{job.title}</strong><br />{job.company} · {job.location}</p>
      {submitted ? <div className="application-success" role="status">
        <strong>Simulasi lamaran berhasil.</strong><br />Data yang kamu isi tidak disimpan dan tidak dikirim ke perusahaan. Pengiriman lamaran sungguhan memerlukan backend yang belum tersedia pada V1.
      </div> : <form className="application-form" onSubmit={handleSubmit}>
        <label>Nama lengkap<input value={name} onChange={(event) => setName(event.target.value)} autoComplete="name" required placeholder="Masukkan nama lengkap" /></label>
        <label>Email<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required placeholder="nama@email.com" /></label>
        <label>Nomor telepon<input type="tel" value={phone} onChange={(event) => setPhone(event.target.value)} autoComplete="tel" required placeholder="08xxxxxxxxxx" /></label>
        <label>Pendidikan terakhir<select value={education} onChange={(event) => setEducation(event.target.value)} required>
          <option value="">Pilih pendidikan</option><option value="SMA/SMK">SMA/SMK</option><option value="D3">D3</option><option value="S1">S1</option><option value="S2">S2</option><option value="S3">S3</option>
        </select></label>
        <button className="apply-button" type="submit">Kirim Simulasi Lamaran</button>
      </form>}
      <p>Catatan: seluruh lowongan yang ditampilkan saat ini merupakan data contoh dan bukan pengumuman resmi.</p>
    </section>
  );
}
