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
  return (
    <>
      <h2>Selamat Datang Kembali</h2>
      <p>Nomor {props.phone} sudah terdaftar. Masukkan password untuk login.</p>
      <form className="auth-form" onSubmit={props.onSubmit}>
        <label>Password
          <input type="password" value={props.password} onChange={(event) => props.onPasswordChange(event.target.value)} autoComplete="current-password" required placeholder="Masukkan password" />
        </label>
        {props.error && <div className="auth-error" role="alert">{props.error}</div>}
        <button className="apply-button" type="submit" disabled={props.loading}>{props.loading ? "Memproses..." : "Masuk"}</button>
      </form>
      <button className="auth-link" type="button" onClick={props.onBack}>Gunakan nomor lain</button>
    </>
  );
}
