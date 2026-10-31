import { ArrowRight } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api";
import { DayEditor } from "../../components/admin/DayEditor";
import { EventEditor } from "../../components/admin/EventEditor";
import { LoadingState, MessageState } from "../../components/StateViews";
import { formatWindows } from "../../format";
import type { DayScheduleView, StoreEvent } from "../../types";

const WEEKDAYS = ["א", "ב", "ג", "ד", "ה", "ו", "ש"];

type Props = {
  onLogout: () => void;
};

export function AdminCalendarPage({ onLogout }: Props) {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [days, setDays] = useState<DayScheduleView[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedDay, setSelectedDay] = useState<DayScheduleView | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<StoreEvent | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    adminApi
      .calendar(year, month)
      .then((data) => setDays(data.days))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  }, [year, month]);

  useEffect(() => {
    load();
    document.title = "לוח שנה · ניהול";
  }, [load]);

  const shiftMonth = (delta: number) => {
    const next = new Date(year, month - 1 + delta, 1);
    setYear(next.getFullYear());
    setMonth(next.getMonth() + 1);
  };

  const blanks = useMemo(() => {
    const first = days[0];
    return first ? first.weekday : 0;
  }, [days]);

  const title = new Intl.DateTimeFormat("he-IL", { month: "long", year: "numeric" }).format(
    new Date(year, month - 1, 1),
  );

  return (
    <main className="app-shell">
      <header className="page-header admin-header">
        <Link className="button ghost" to="/admin">
          <ArrowRight size={18} aria-hidden="true" />
          חזרה
        </Link>
        <div className="admin-actions">
          <button className="button ghost" type="button" onClick={() => shiftMonth(-1)}>
            חודש קודם
          </button>
          <button className="button ghost" type="button" onClick={() => shiftMonth(1)}>
            חודש הבא
          </button>
          <button className="button ghost" type="button" onClick={onLogout}>
            יציאה
          </button>
        </div>
      </header>

      <section className="week-panel">
        <div className="week-heading">
          <h2>{title}</h2>
        </div>
        {loading ? <LoadingState /> : null}
        {error ? (
          <MessageState title="שגיאה בטעינת לוח השנה" text={error} actionLabel="נסו שוב" onAction={load} />
        ) : null}
        {!loading && !error ? (
          <div className="calendar-grid">
            {WEEKDAYS.map((label) => (
              <div key={label} className="calendar-weekday">
                {label}
              </div>
            ))}
            {Array.from({ length: blanks }).map((_, index) => (
              <div key={`blank-${index}`} className="calendar-cell is-empty" />
            ))}
            {days.map((day) => (
              <div
                key={day.date}
                role="button"
                tabIndex={0}
                className={`calendar-cell${day.isToday ? " is-today" : ""}${calendarTone(day)}`}
                onClick={() => setSelectedDay(day)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") setSelectedDay(day);
                }}
              >
                <span className="calendar-date">{Number(day.date.slice(-2))}</span>
                <span className="calendar-hours">
                  {day.isClosed || !day.effectiveWindows?.length
                    ? "סגור"
                    : formatWindows(day.effectiveWindows)}
                </span>
                {day.events.length ? (
                  <span className="calendar-events">
                    {day.events.map((event) => (
                      <button
                        key={event.id}
                        type="button"
                        className={`calendar-event type-${event.type}`}
                        onClick={(click) => {
                          click.stopPropagation();
                          setSelectedEvent(event);
                        }}
                      >
                        {event.title}
                      </button>
                    ))}
                  </span>
                ) : null}
              </div>
            ))}
          </div>
        ) : null}
      </section>

      {selectedDay ? (
        <DayEditor
          day={selectedDay}
          onClose={() => setSelectedDay(null)}
          onSaved={() => {
            setSelectedDay(null);
            load();
          }}
        />
      ) : null}
      {selectedEvent ? (
        <EventEditor
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onSaved={() => {
            setSelectedEvent(null);
            load();
          }}
        />
      ) : null}
    </main>
  );
}

function calendarTone(day: DayScheduleView): string {
  if (day.hasTemporaryChange) return day.isClosed ? " is-closed has-change" : " has-change";
  if (day.isClosed || !day.effectiveWindows?.length) return " is-closed";
  if (day.hoursPublished) return " is-open";
  return " is-unpublished";
}
