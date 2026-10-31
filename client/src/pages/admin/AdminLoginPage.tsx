import { useState, type FormEvent } from "react";
import { adminApi } from "../../api";

type Props = {
  onLoggedIn: (email: string) => void;
};

export function AdminLoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const sendCode = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.requestOtp(email);
      setMessage(result.message);
      setStep("code");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.verifyOtp(email, code);
      onLoggedIn(result.email);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="app-shell admin-login">
      <section className="week-panel admin-login-card">
        <p className="muted">אזור מנהלים</p>
        <h1>כניסה לרעותה</h1>
        {step === "email" ? (
          <form onSubmit={sendCode} className="admin-form">
            <label>
              כתובת אימייל
              <input
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <button className="button" type="submit" disabled={busy}>
              {busy ? "שולח..." : "המשך"}
            </button>
          </form>
        ) : (
          <form onSubmit={verify} className="admin-form">
            {message ? <p>{message}</p> : null}
            <label>
              קוד בן 6 ספרות
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="\d{6}"
                maxLength={6}
                required
                value={code}
                onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              />
            </label>
            <button className="button" type="submit" disabled={busy || code.length !== 6}>
              {busy ? "בודק..." : "כניסה"}
            </button>
            <button
              className="button ghost"
              type="button"
              onClick={() => {
                setStep("email");
                setCode("");
                setError(null);
              }}
            >
              חזרה לאימייל
            </button>
          </form>
        )}
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  );
}
