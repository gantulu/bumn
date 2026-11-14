import { ArrowLeft, Bell, BriefcaseBusiness } from "lucide-react";

interface HeaderProps {
  isDetail?: boolean;
  onBack?: () => void;
}

export function Header({ isDetail = false, onBack }: HeaderProps) {
  if (isDetail) {
    return (
      <header className="detail-page-header">
        <button className="icon-button" type="button" aria-label="Kembali ke daftar lowongan" onClick={onBack}>
          <ArrowLeft size={21} />
        </button>
        <strong>Detail Lowongan</strong>
        <span aria-hidden="true" style={{ width: 38, height: 38 }} />
      </header>
    );
  }

  return (
    <header className="header">
      <div className="brand">
        <div className="brand-icon"><BriefcaseBusiness size={21} /></div>
        BUMN CAREER
      </div>
      <span className="icon-button" title="Notifikasi belum tersedia" aria-label="Notifikasi belum tersedia">
        <Bell size={21} />
      </span>
    </header>
  );
}
