import { useNavigate } from "react-router-dom";

export function NotFoundPage() {
  const navigate = useNavigate();
  return <section className="detail-page-content"><div className="detail-section">
    <h2>Halaman tidak ditemukan</h2>
    <p>Halaman yang kamu cari tidak tersedia.</p>
    <button className="apply-button" type="button" onClick={() => navigate("/")}>Kembali ke Beranda</button>
  </div></section>;
}
