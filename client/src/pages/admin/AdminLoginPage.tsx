import { useState, type FormEvent } from "react";
import { adminApi } from "../../api";

type Props = {
  onLoggedIn: (email: string) => void;
};

export function AdminLoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.login(email);
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
        <form onSubmit={submit} className="admin-form">
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
            {busy ? "בודק..." : "כניסה"}
          </button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
      </section>
    </main>
  );
}
