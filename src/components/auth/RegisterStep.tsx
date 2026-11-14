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
  return (
    <>
      <h2>Buat Akun BUMN Career</h2>
      <p>Nomor {props.phone} belum terdaftar. Lengkapi data untuk membuat akun.</p>
      <form className="auth-form" onSubmit={props.onSubmit}>
        <label>Nama lengkap
          <input value={props.fullName} onChange={(event) => props.onFullNameChange(event.target.value)} autoComplete="name" required minLength={2} maxLength={120} placeholder="Nama lengkap" />
        </label>
        <label>Email <span style={{ fontWeight: 400 }}>(opsional)</span>
          <input type="email" value={props.email} onChange={(event) => props.onEmailChange(event.target.value)} autoComplete="email" placeholder="nama@email.com" />
        </label>
        <label>Password
          <input type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} autoComplete="new-password" minLength={8} maxLength={128} required placeholder="Minimal 8 karakter" />
        </label>
        <label>Konfirmasi password
          <input type="password" value={props.confirmPassword} onChange={(event) => props.onConfirmPasswordChange(event.target.value)} autoComplete="new-password" minLength={8} required placeholder="Ulangi password" />
        </label>
        {props.error && <div className="auth-error" role="alert">{props.error}</div>}
        <button className="apply-button" type="submit" disabled={props.loading}>{props.loading ? "Mendaftarkan..." : "Daftar"}</button>
      </form>
      <button className="auth-link" type="button" onClick={props.onBack}>Gunakan nomor lain</button>
    </>
  );
}
