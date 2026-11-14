import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type RegisterStepProps = {
  phone: string;
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  loading: boolean;
  error: string;
  onFullNameChange: (value: string) => void;
  onEmailChange: (value: string) => void;
  onPasswordChange: (value: string) => void;
  onConfirmPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export default function RegisterStep(props: RegisterStepProps) {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  return (
    <>
      <h2>Buat Akun BUMN Career</h2>
      <p>Nomor +{props.phone} belum terdaftar. Lengkapi data berikut untuk membuat akun.</p>
      <form className="auth-form" onSubmit={props.onSubmit}>
        <label htmlFor="register-full-name">
          Nama lengkap
          <input
            id="register-full-name"
            name="full_name"
            value={props.fullName}
            onChange={(event) => props.onFullNameChange(event.target.value)}
            autoComplete="name"
            required
            minLength={2}
            maxLength={120}
            placeholder="Nama lengkap"
            disabled={props.loading}
          />
        </label>
        <label htmlFor="register-email">
          Email <span style={{ fontWeight: 400 }}>(opsional)</span>
          <input
            id="register-email"
            name="email"
            type="email"
            value={props.email}
            onChange={(event) => props.onEmailChange(event.target.value)}
            autoComplete="email"
            maxLength={254}
            placeholder="nama@email.com"
            disabled={props.loading}
          />
        </label>
        <label htmlFor="register-password">
          Password
          <div className="auth-input-wrap">
            <input
              id="register-password"
              name="new-password"
              type={showPassword ? "text" : "password"}
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              placeholder="Minimal 8 karakter"
              disabled={props.loading}
              aria-describedby="register-password-hint"
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowPassword((visible) => !visible)}
              aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
              aria-pressed={showPassword}
              disabled={props.loading}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        <p className="auth-field-hint" id="register-password-hint">Gunakan minimal 8 karakter.</p>
        <label htmlFor="register-confirm-password">
          Konfirmasi password
          <div className="auth-input-wrap">
            <input
              id="register-confirm-password"
              name="confirm-password"
              type={showConfirmPassword ? "text" : "password"}
              value={props.confirmPassword}
              onChange={(event) => props.onConfirmPasswordChange(event.target.value)}
              autoComplete="new-password"
              minLength={8}
              maxLength={128}
              required
              placeholder="Ulangi password"
              disabled={props.loading}
            />
            <button
              className="auth-password-toggle"
              type="button"
              onClick={() => setShowConfirmPassword((visible) => !visible)}
              aria-label={showConfirmPassword ? "Sembunyikan konfirmasi password" : "Tampilkan konfirmasi password"}
              aria-pressed={showConfirmPassword}
              disabled={props.loading}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </label>
        {props.error && <div className="auth-error" id="register-error" role="alert">{props.error}</div>}
        <button className="apply-button" type="submit" disabled={props.loading}>
          {props.loading ? "Mendaftarkan akun..." : "Daftar"}
        </button>
      </form>
      <button className="auth-link" type="button" onClick={props.onBack} disabled={props.loading}>
        Gunakan nomor lain
      </button>
    </>
  );
}
