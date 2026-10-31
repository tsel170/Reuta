import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { adminApi } from "../../api";
import { LoadingState } from "../../components/StateViews";
import { AdminCalendarPage } from "./AdminCalendarPage";
import { AdminChatPage } from "./AdminChatPage";
import { AdminHomePage } from "./AdminHomePage";
import { AdminLoginPage } from "./AdminLoginPage";

export function AdminApp() {
  const [email, setEmail] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    adminApi
      .me()
      .then((session) => setEmail(session?.email ?? null))
      .finally(() => setReady(true));
  }, []);

  const logout = async () => {
    await adminApi.logout().catch(() => undefined);
    setEmail(null);
  };

  if (!ready) {
    return (
      <main className="app-shell">
        <LoadingState />
      </main>
    );
  }

  if (!email) {
    return <AdminLoginPage onLoggedIn={setEmail} />;
  }

  return (
    <Routes>
      <Route index element={<AdminHomePage email={email} onLogout={() => void logout()} />} />
      <Route path="calendar" element={<AdminCalendarPage onLogout={() => void logout()} />} />
      <Route path="chat" element={<AdminChatPage onLogout={() => void logout()} />} />
      <Route path="*" element={<Navigate to="/admin" replace />} />
    </Routes>
  );
}
