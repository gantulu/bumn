import type { Job } from "../types/job";

export const jobs: Job[] = [
  {
    id: "LKG-001",
    title: "Management Trainee",
    company: "PT Pertamina (Persero)",
    category: "Bisnis",
    location: "Jakarta",
    employmentType: "Full Time",
    education: "S1",
    description: "Program pengembangan calon pemimpin masa depan melalui pelatihan dan pengalaman kerja lintas divisi.",
    qualifications: ["Pendidikan minimal S1", "IPK minimal 3.00", "Mampu berkomunikasi dengan baik", "Memiliki kemampuan analisis"],
    closingAt: "2026-11-30",
    verificationStatus: "sample"
  },
  {
    id: "LKG-002",
    title: "IT Specialist",
    company: "PT Telkom Indonesia",
    category: "IT & Digital",
    location: "Bandung",
    employmentType: "Full Time",
    education: "S1",
    description: "Mengembangkan dan memelihara sistem teknologi informasi serta infrastruktur digital perusahaan.",
    qualifications: ["S1 Teknik Informatika atau Sistem Informasi", "Memahami pengembangan aplikasi", "Menguasai teknologi database", "Mampu bekerja dalam tim"],
    closingAt: "2026-11-25",
    verificationStatus: "sample"
  },
  {
    id: "LKG-003",
    title: "Staff Administrasi",
    company: "PT Bank Mandiri (Persero) Tbk",
    category: "Administrasi",
    location: "Jakarta Selatan",
    employmentType: "Full Time",
    education: "D3 / S1",
    salary: { minimum: 5000000, maximum: 7000000, currency: "IDR" },
    description: "Bertanggung jawab mengelola administrasi, dokumentasi dan operasional kantor.",
    qualifications: ["Pendidikan minimal D3", "Menguasai Microsoft Office", "Teliti dan bertanggung jawab"],
    closingAt: "2026-11-20",
    verificationStatus: "sample",
    coverImageUrl: "https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=85"
  },
  {
    id: "LKG-004",
    title: "Electrical Engineer",
    company: "PT PLN (Persero)",
    category: "Teknik",
    location: "Surabaya",
    employmentType: "Full Time",
    education: "S1",
    description: "Mendukung kegiatan operasional, pemeliharaan dan pengembangan sistem kelistrikan.",
    qualifications: ["S1 Teknik Elektro", "Memahami sistem tenaga listrik", "Mampu bekerja secara tim"],
    closingAt: "2026-12-15",
    verificationStatus: "sample"
  },
  {
    id: "LKG-005",
    title: "Finance Analyst",
    company: "PT Bank Rakyat Indonesia",
    category: "Keuangan",
    location: "Jakarta",
    employmentType: "Full Time",
    education: "S1",
    description: "Melakukan analisis keuangan, laporan dan evaluasi kinerja bisnis.",
    qualifications: ["S1 Akuntansi atau Manajemen", "Memahami analisis keuangan", "Menguasai Microsoft Excel"],
    closingAt: "2026-12-10",
    verificationStatus: "sample"
  }
];

export const categories = ["Semua", "IT & Digital", "Keuangan", "Teknik", "Administrasi", "Bisnis"];
export const companies = ["Pertamina", "Bank Mandiri", "Telkom Indonesia", "PLN", "BRI", "KAI"];
