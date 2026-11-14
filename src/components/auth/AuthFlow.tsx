import { useState } from "react";
import {
  checkPhone,
  loginBumnUser,
  registerBumnUser,
  type BumnAuthUser,
} from "../../services/bumn-auth";
import PhoneStep from "./PhoneStep";
import RegisterStep from "./RegisterStep";
import LoginStep from "./LoginStep";

type AuthFlowProps = {
  onAuthenticated: (user: BumnAuthUser) => void;
};

type AuthStep = "phone" | "register" | "login";

export default function AuthFlow({ onAuthenticated }: AuthFlowProps) {
  const [step, setStep] = useState<AuthStep>("phone");
  const [phone, setPhone] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handlePhoneSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const exists = await checkPhone(phone.trim());
      setStep(exists ? "login" : "register");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nomor telepon gagal diperiksa.");
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Konfirmasi password tidak sesuai.");
      return;
    }
    setLoading(true);
    try {
      const user = await registerBumnUser({
        full_name: fullName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password,
      });
      setPassword("");
      setConfirmPassword("");
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Pendaftaran gagal.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const user = await loginBumnUser({ phone: phone.trim(), password });
      setPassword("");
      onAuthenticated(user);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login gagal.");
    } finally {
      setLoading(false);
    }
  };

  const backToPhone = () => {
    setStep("phone");
    setPassword("");
    setConfirmPassword("");
    setError("");
  };

  return (
    <section className="auth-card">
      {step === "phone" && (
        <PhoneStep
          phone={phone}
          loading={loading}
          error={error}
          onPhoneChange={setPhone}
          onSubmit={handlePhoneSubmit}
        />
      )}
      {step === "register" && (
        <RegisterStep
          phone={phone}
          fullName={fullName}
          email={email}
          password={password}
          confirmPassword={confirmPassword}
          loading={loading}
          error={error}
          onFullNameChange={setFullName}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onConfirmPasswordChange={setConfirmPassword}
          onSubmit={handleRegister}
          onBack={backToPhone}
        />
      )}
      {step === "login" && (
        <LoginStep
          phone={phone}
          password={password}
          loading={loading}
          error={error}
          onPasswordChange={setPassword}
          onSubmit={handleLogin}
          onBack={backToPhone}
        />
      )}
      <p style={{ marginTop: 16, marginBottom: 0, fontSize: 10 }}>
        Login berlaku untuk sesi halaman ini. Setelah halaman dimuat ulang, pengguna perlu login kembali.
      </p>
    </section>
  );
}
