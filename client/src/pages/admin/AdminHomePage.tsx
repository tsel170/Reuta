import { CalendarDays, LogOut, MessageCircle } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api";
import { DayEditor } from "../../components/admin/DayEditor";
import { EventEditor } from "../../components/admin/EventEditor";
import { LoadingState, MessageState } from "../../components/StateViews";
import { TodayCard } from "../../components/TodayCard";
import { WeekList } from "../../components/WeekList";
import type { DayScheduleView, ScheduleResponse, StoreEvent } from "../../types";

type Props = {
  email: string;
  onLogout: () => void;
};

export function AdminHomePage({ email, onLogout }: Props) {
  const [data, setData] = useState<ScheduleResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedDay, setSelectedDay] = useState<DayScheduleView | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<StoreEvent | null>(null);

  const load = useCallback(() => {
    setError(null);
    adminApi
      .schedule()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (data?.store.name) document.title = `${data.store.name} · ניהול`;
  }, [data?.store.name]);

  return (
    <main className="app-shell">
      <header className="page-header admin-header">
        <div>
          <p className="muted">אזור מנהלים · {email}</p>
          <h1>{data?.store.name || "ניהול שעות"}</h1>
        </div>
        <div className="admin-actions">
          <Link className="button ghost" to="/admin/calendar">
            <CalendarDays size={18} aria-hidden="true" />
            לוח שנה
          </Link>
          <Link className="button ghost" to="/admin/chat">
            <MessageCircle size={18} aria-hidden="true" />
            הודעות
          </Link>
          <button className="button ghost" type="button" onClick={onLogout}>
            <LogOut size={18} aria-hidden="true" />
            יציאה
          </button>
        </div>
      </header>

      {!data && !error ? <LoadingState /> : null}
      {error ? (
        <MessageState title="שגיאה בטעינת הנתונים" text={error} actionLabel="נסו שוב" onAction={load} />
      ) : null}

      {data ? (
        <>
          <TodayCard
            today={data.today}
            onOpenEvent={setSelectedEvent}
            onCountdownElapsed={load}
            onSelectDay={setSelectedDay}
          />
          <WeekList week={data.week} onOpenEvent={setSelectedEvent} onSelectDay={setSelectedDay} />
        </>
      ) : null}

      {selectedDay ? (
        <DayEditor day={selectedDay} onClose={() => setSelectedDay(null)} onSaved={load} />
      ) : null}
      {selectedEvent ? (
        <EventEditor event={selectedEvent} onClose={() => setSelectedEvent(null)} onSaved={load} />
      ) : null}
    </main>
  );
}
