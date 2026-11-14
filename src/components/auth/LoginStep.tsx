import { useState } from "react";
import { Eye, EyeOff } from "lucide-react";

type LoginStepProps = {
  phone: string;
  password: string;
  loading: boolean;
  error: string;
  onPasswordChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
  onBack: () => void;
};

export default function LoginStep(props: LoginStepProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <>
      <h2>Selamat Datang Kembali</h2>
      <p>Nomor +{props.phone} sudah terdaftar. Masukkan password untuk login.</p>
      <form className="auth-form" onSubmit={props.onSubmit}>
        <label htmlFor="login-password">
          Password
          <div className="auth-input-wrap">
            <input
              id="login-password"
              name="current-password"
              type={showPassword ? "text" : "password"}
              value={props.password}
              onChange={(event) => props.onPasswordChange(event.target.value)}
              autoComplete="current-password"
              required
              maxLength={128}
              placeholder="Masukkan password"
              disabled={props.loading}
              aria-invalid={Boolean(props.error)}
              aria-describedby={props.error ? "login-error" : undefined}
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
        {props.error && <div className="auth-error" id="login-error" role="alert">{props.error}</div>}
        <button className="apply-button" type="submit" disabled={props.loading || !props.password}>
          {props.loading ? "Memproses login..." : "Masuk"}
        </button>
      </form>
      <button className="auth-link" type="button" onClick={props.onBack} disabled={props.loading}>
        Gunakan nomor lain
      </button>
    </>
  );
}
