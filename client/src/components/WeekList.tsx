import { formatWindows } from "../format";
import type { DayScheduleView, StoreEvent } from "../types";
import { EventChip } from "./EventChip";

type Props = {
  week: DayScheduleView[];
  onOpenEvent: (event: StoreEvent) => void;
};

export function WeekList({ week, onOpenEvent }: Props) {
  return (
    <section className="week-panel" aria-label="שעות הפתיחה הקרובות">
      <div className="week-heading">
        <h2>הימים הקרובים</h2>
      </div>
      <div className="week-list">
        {week.map((day) => (
          <article key={day.date} className="day-row">
            <div className="day-main">
              <div className="day-name">
                <h3>{day.weekdayName}</h3>
                <span className="day-date">{formatShortDate(day.date)}</span>
                {day.hasTemporaryChange ? <span className="badge change">שינוי זמני</span> : null}
                {day.isClosed && !day.hasTemporaryChange && !isWeekend(day.weekday) ? (
                  <span className="badge closed">סגור</span>
                ) : null}
                {!day.hoursPublished ? <span className="badge warn">טרם פורסם</span> : null}
              </div>
              <DayHours day={day} />
            </div>
            {day.events.length ? (
              <div className="event-row">
                {day.events.map((event) => (
                  <EventChip key={event.id} event={event} onOpen={onOpenEvent} />
                ))}
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

function DayHours({ day }: { day: DayScheduleView }) {
  if (!day.hoursPublished) {
    return <p className="day-hours muted">שעות הפתיחה עדיין אינן ידועות</p>;
  }

  if (day.hasTemporaryChange) {
    return (
      <div className="hours-block">
        {day.regularHours ? (
          <p className="regular-hours">
            {day.regularHours.isOpen ? formatWindows(day.regularHours.windows) : "סגור"}
          </p>
        ) : null}
        <p className={`updated-hours${day.isClosed ? " is-closed" : ""}`}>
          {day.isClosed ? "סגור" : formatWindows(day.effectiveWindows)}
        </p>
      </div>
    );
  }

  if (day.isClosed) {
    return (
      <p className={`day-hours ${isWeekend(day.weekday) ? "muted" : "closed-hours"}`}>
        סגור
      </p>
    );
  }

  return <p className="day-hours">{formatWindows(day.effectiveWindows)}</p>;
}

function isWeekend(weekday: number): boolean {
  return weekday === 5 || weekday === 6;
}

function formatShortDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
  }).format(new Date(year, month - 1, day));
}
