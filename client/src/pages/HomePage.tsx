import { MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { EventDialog } from "../components/EventDialog";
import { LogoDialog } from "../components/LogoDialog";
import { LoadingState, MessageState } from "../components/StateViews";
import { TodayCard } from "../components/TodayCard";
import { WeekList } from "../components/WeekList";
import { storeInitials } from "../format";
import type { ScheduleResponse, StoreEvent } from "../types";

export function HomePage() {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<StoreEvent | null>(null);
  const [logoOpen, setLogoOpen] = useState(false);

  const load = useCallback(() => {
    setError(null);
    api
      .schedule()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
    const refresh = window.setInterval(load, 60_000);
    return () => window.clearInterval(refresh);
  }, [load]);

  useEffect(() => {
    if (data?.store.name) document.title = `${data.store.name} · שעות פתיחה`;
  }, [data?.store.name]);

  return (
    <main className="app-shell">
      {data ? (
        <header className="page-header">
          <div className="brand">
            {data.store.logoUrl ? (
              <button
                type="button"
                className="logo-button"
                onClick={() => setLogoOpen(true)}
                aria-haspopup="dialog"
                aria-expanded={logoOpen}
              >
                <img src={data.store.logoUrl} alt="לוגו רעותה" />
              </button>
            ) : (
              <div className="brand-mark" aria-hidden="true">
                {storeInitials(data.store.name)}
              </div>
            )}
            <div>
              <h1>{data.store.name || "החנות"}</h1>
              <p>{data.store.tagline || "שעות פתיחה ועדכונים"}</p>
            </div>
          </div>
          <Link className="button ghost header-action" to="/messages">
            <MessageCircle size={18} aria-hidden="true" />
            הודעות ועדכונים
          </Link>
        </header>
      ) : null}

      {!data && !error ? <LoadingState /> : null}
      {error ? (
        <MessageState
          title="שגיאה בטעינת השעות"
          text={error}
          actionLabel="נסו שוב"
          onAction={load}
        />
      ) : null}
      {data ? (
        <>
          <TodayCard
            today={data.today}
            onOpenEvent={setSelectedEvent}
            onCountdownElapsed={load}
          />
          <WeekList week={data.week} onOpenEvent={setSelectedEvent} />
        </>
      ) : null}

      {selectedEvent ? (
        <EventDialog event={selectedEvent} onClose={() => setSelectedEvent(null)} />
      ) : null}
      {logoOpen && data?.store.logoUrl ? (
        <LogoDialog
          src={data.store.logoUrl}
          alt="מחירון ולוגו של רעותה בגדים באהבה"
          onClose={() => setLogoOpen(false)}
        />
      ) : null}
    </main>
  );
}
