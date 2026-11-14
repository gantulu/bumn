import { ChevronRight, User } from "lucide-react";

const profileSections = ["Data Pribadi", "Riwayat Pendidikan", "Pengalaman Kerja", "Lamaran Saya", "Pengaturan"];

export function ProfilePage() {
  return (
    <>
      <section className="page-header"><div><h2>Profil Pengguna</h2><div className="page-description">Ringkasan profil pada aplikasi demo.</div></div></section>
      <div className="profile-card">
        <div className="profile-avatar"><User size={32} /></div>
        <h3>Selamat Datang!</h3>
        <p>Fitur akun dan pengelolaan profil belum tersedia pada V1. Kamu tetap dapat melihat lowongan dan mengisi simulasi lamaran sebagai tamu.</p>
      </div>
      <section className="section section-end">
        {profileSections.map((section) => <div className="profile-row" key={section} aria-disabled="true">{section}<ChevronRight size={17} aria-hidden="true" /></div>)}
      </section>
    </>
  );
}
