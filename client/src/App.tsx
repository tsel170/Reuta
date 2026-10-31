import { Navigate, Route, Routes } from "react-router-dom";
import { ScrollToTop } from "./components/ScrollToTop";
import { AdminApp } from "./pages/admin/AdminApp";
import { HomePage } from "./pages/HomePage";
import { MessagesPage } from "./pages/MessagesPage";

export function App() {
  return (
    <>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/chat" element={<MessagesPage />} />
        <Route path="/messages" element={<Navigate to="/chat" replace />} />
        <Route path="/admin/*" element={<AdminApp />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
