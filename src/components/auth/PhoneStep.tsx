type PhoneStepProps = {
  phone: string;
  loading: boolean;
  error: string;
  onPhoneChange: (value: string) => void;
  onSubmit: (event: React.FormEvent<HTMLFormElement>) => void;
};

export default function PhoneStep({
  phone,
  loading,
  error,
  onPhoneChange,
  onSubmit,
}: PhoneStepProps) {
  return (
    <>
      <h2>Masuk atau Daftar</h2>
      <p>Masukkan nomor WhatsApp atau nomor telepon untuk melanjutkan.</p>
      <form className="auth-form" onSubmit={onSubmit}>
        <label>
          Nomor telepon
          <input
            type="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
            minLength={9}
            maxLength={20}
            placeholder="08xxxxxxxxxx"
          />
        </label>
        {error && <div className="auth-error" role="alert">{error}</div>}
        <button className="apply-button" type="submit" disabled={loading}>
          {loading ? "Memeriksa..." : "Lanjutkan"}
        </button>
      </form>
    </>
  );
}
