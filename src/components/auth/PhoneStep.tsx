import { isValidBumnPhone, normalizeBumnPhone } from "../../services/bumn-auth";

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
  const normalizedPhone = normalizeBumnPhone(phone);
  const hasValidPhone = isValidBumnPhone(phone);

  return (
    <>
      <h2>Masuk atau Daftar</h2>
      <p>Masukkan nomor WhatsApp atau nomor telepon aktif untuk melanjutkan.</p>
      <form className="auth-form" onSubmit={onSubmit} noValidate>
        <label htmlFor="auth-phone">
          Nomor telepon
          <input
            id="auth-phone"
            name="phone"
            type="tel"
            value={phone}
            onChange={(event) => onPhoneChange(event.target.value)}
            autoComplete="tel"
            inputMode="tel"
            required
            maxLength={20}
            placeholder="08xxxxxxxxxx"
            aria-invalid={Boolean(error)}
            aria-describedby={error ? "phone-error" : "phone-hint"}
            disabled={loading}
          />
        </label>
        {hasValidPhone ? (
          <p className="auth-phone-normalized" id="phone-hint">
            Nomor akan dikirim sebagai +{normalizedPhone}
          </p>
        ) : (
          <p className="auth-field-hint" id="phone-hint">
            Gunakan nomor Indonesia, contoh 081234567890.
          </p>
        )}
        {error && <div className="auth-error" id="phone-error" role="alert">{error}</div>}
        <button className="apply-button" type="submit" disabled={loading || !phone.trim()}>
          {loading ? "Memeriksa nomor..." : "Lanjutkan"}
        </button>
      </form>
    </>
  );
}
