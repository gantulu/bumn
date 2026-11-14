import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { Camera, LoaderCircle, LogOut, Save, Trash2, UserRound } from "lucide-react";
import {
  deleteAvatar,
  getProfile,
  updateProfile,
  uploadAvatar,
  type BumnAuthUser,
  type BumnProfile,
  type BumnProfileInput,
} from "../../services/bumn-auth";
import "./ProfilePage.css";

type Props = {
  onLogout: () => void;
  onUserUpdated: (user: BumnAuthUser) => void;
};

const emptyProfile: BumnProfileInput = {
  full_name: "",
  email: "",
  birth_place: "",
  birth_date: "",
  gender: null,
  address: "",
  city: "",
  province: "",
  postal_code: "",
};

function profileToInput(profile: BumnProfile): BumnProfileInput {
  return {
    full_name: profile.full_name ?? "",
    email: profile.email ?? "",
    birth_place: profile.birth_place ?? "",
    birth_date: profile.birth_date ?? "",
    gender: profile.gender,
    address: profile.address ?? "",
    city: profile.city ?? "",
    province: profile.province ?? "",
    postal_code: profile.postal_code ?? "",
  };
}

export default function ProfilePage({ onLogout, onUserUpdated }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<BumnProfile | null>(null);
  const [form, setForm] = useState<BumnProfileInput>(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const applyProfile = (next: BumnProfile) => {
    setProfile(next);
    setForm(profileToInput(next));
    onUserUpdated(next);
  };

  useEffect(() => {
    let active = true;
    getProfile()
      .then((data) => {
        if (active) applyProfile(data);
      })
      .catch((err: unknown) => {
        if (active) setError(err instanceof Error ? err.message : "Gagal memuat profil.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    return () => {
      if (preview) URL.revokeObjectURL(preview);
    };
  }, [preview]);

  const updateField = <K extends keyof BumnProfileInput>(key: K, value: BumnProfileInput[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
  };

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setError("");
    setNotice("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setError("Format foto harus JPG, PNG, atau WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("Ukuran foto maksimal 5 MB.");
      event.target.value = "";
      return;
    }
    setPreview((current) => {
      if (current) URL.revokeObjectURL(current);
      return URL.createObjectURL(file);
    });
    setSelectedFile(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    setError("");
    setNotice("");
    try {
      const avatar = await uploadAvatar(selectedFile);
      const next = await getProfile();
      applyProfile({ ...next, avatar });
      setSelectedFile(null);
      setPreview((current) => {
        if (current) URL.revokeObjectURL(current);
        return null;
      });
      if (fileInput.current) fileInput.current.value = "";
      setNotice("Foto profil berhasil diperbarui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload avatar gagal.");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!profile?.avatar || !window.confirm("Hapus foto profil?")) return;
    setDeletingAvatar(true);
    setError("");
    setNotice("");
    try {
      await deleteAvatar();
      const next = await getProfile();
      applyProfile(next);
      setNotice("Foto profil berhasil dihapus.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menghapus avatar.");
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setNotice("");
    try {
      const next = await updateProfile({
        ...form,
        full_name: form.full_name.trim(),
        email: form.email?.trim().toLowerCase() || null,
        birth_place: form.birth_place?.trim() || null,
        birth_date: form.birth_date || null,
        address: form.address?.trim() || null,
        city: form.city?.trim() || null,
        province: form.province?.trim() || null,
        postal_code: form.postal_code?.trim() || null,
      });
      applyProfile(next);
      setNotice("Profil berhasil diperbarui.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan profil.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bumn-profile-state"><LoaderCircle className="bumn-spin" /> Memuat profil...</div>;
  }

  if (!profile) {
    return (
      <section className="bumn-profile-panel">
        <p className="bumn-profile-error" role="alert">{error || "Profil tidak dapat dimuat."}</p>
        <button className="bumn-profile-button secondary" type="button" onClick={onLogout}>Masuk kembali</button>
      </section>
    );
  }

  const avatarSrc = preview || profile.avatar;

  return (
    <section className="bumn-profile-page">
      <header className="bumn-profile-heading">
        <div>
          <h2>Profil Saya</h2>
          <p>Kelola informasi pribadi dan foto profil Anda.</p>
        </div>
        <button className="bumn-profile-button secondary" type="button" onClick={onLogout}>
          <LogOut size={16} /> Keluar
        </button>
      </header>

      {error && <p className="bumn-profile-alert error" role="alert">{error}</p>}
      {notice && <p className="bumn-profile-alert success" role="status">{notice}</p>}

      <div className="bumn-profile-card">
        <div className="bumn-profile-avatar">
          {avatarSrc ? <img src={avatarSrc} alt={profile.full_name} /> : <UserRound size={38} />}
        </div>
        <div className="bumn-profile-avatar-copy">
          <strong>{profile.full_name}</strong>
          <span>{profile.phone}</span>
          <span>{profile.email || "Email belum ditambahkan"}</span>
        </div>
        <div className="bumn-profile-avatar-actions">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            hidden
            aria-label="Pilih foto profil"
          />
          <button className="bumn-profile-button secondary" type="button" onClick={() => fileInput.current?.click()} disabled={uploading || deletingAvatar}>
            <Camera size={16} /> Pilih Foto
          </button>
          {selectedFile && (
            <button className="bumn-profile-button primary" type="button" onClick={handleUpload} disabled={uploading}>
              {uploading ? <LoaderCircle className="bumn-spin" size={16} /> : <Save size={16} />}
              {uploading ? "Mengunggah..." : "Unggah Foto"}
            </button>
          )}
          {profile.avatar && (
            <button className="bumn-profile-button danger" type="button" onClick={handleDeleteAvatar} disabled={deletingAvatar || uploading}>
              {deletingAvatar ? <LoaderCircle className="bumn-spin" size={16} /> : <Trash2 size={16} />}
              Hapus
            </button>
          )}
          <small>JPG, PNG, WebP · Maksimal 5 MB</small>
        </div>
      </div>

      <form className="bumn-profile-form" onSubmit={handleSubmit}>
        <section className="bumn-profile-card">
          <h3>Informasi Pribadi</h3>
          <div className="bumn-profile-grid">
            <label>Nama lengkap
              <input required minLength={2} maxLength={120} value={form.full_name} onChange={(e) => updateField("full_name", e.target.value)} />
            </label>
            <label>Email
              <input type="email" maxLength={254} value={form.email ?? ""} onChange={(e) => updateField("email", e.target.value)} placeholder="nama@email.com" />
            </label>
            <label>Nomor telepon
              <input value={profile.phone} readOnly />
            </label>
            <label>Tempat lahir
              <input maxLength={100} value={form.birth_place ?? ""} onChange={(e) => updateField("birth_place", e.target.value)} />
            </label>
            <label>Tanggal lahir
              <input type="date" value={form.birth_date ?? ""} onChange={(e) => updateField("birth_date", e.target.value)} />
            </label>
            <label>Jenis kelamin
              <select value={form.gender ?? ""} onChange={(e) => updateField("gender", (e.target.value || null) as BumnProfileInput["gender"])}>
                <option value="">Pilih jenis kelamin</option>
                <option value="Laki-laki">Laki-laki</option>
                <option value="Perempuan">Perempuan</option>
              </select>
            </label>
          </div>
        </section>

        <section className="bumn-profile-card">
          <h3>Alamat</h3>
          <div className="bumn-profile-grid">
            <label className="full">Alamat lengkap
              <textarea rows={3} maxLength={500} value={form.address ?? ""} onChange={(e) => updateField("address", e.target.value)} />
            </label>
            <label>Kota
              <input maxLength={100} value={form.city ?? ""} onChange={(e) => updateField("city", e.target.value)} />
            </label>
            <label>Provinsi
              <input maxLength={100} value={form.province ?? ""} onChange={(e) => updateField("province", e.target.value)} />
            </label>
            <label>Kode pos
              <input maxLength={10} value={form.postal_code ?? ""} onChange={(e) => updateField("postal_code", e.target.value)} />
            </label>
          </div>
        </section>

        <div className="bumn-profile-form-actions">
          <button className="bumn-profile-button primary" type="submit" disabled={saving || uploading || deletingAvatar}>
            {saving ? <LoaderCircle className="bumn-spin" size={16} /> : <Save size={16} />}
            {saving ? "Menyimpan..." : "Simpan Perubahan"}
          </button>
        </div>
      </form>
    </section>
  );
}
