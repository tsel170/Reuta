import { Countdown } from "./Countdown";
import { EventChip } from "./EventChip";
import { formatWindows } from "../format";
import type { StoreEvent, TodayView } from "../types";

type Props = {
  today: TodayView;
  onOpenEvent: (event: StoreEvent) => void;
  onCountdownElapsed: () => void;
};

export function TodayCard({ today, onOpenEvent, onCountdownElapsed }: Props) {
  return (
    <section className={`hero ${today.status}`} aria-live="polite">
      <p className="hero-kicker">
        <span className={`live-dot ${today.status}`} />
        {today.weekdayName} · {formatDateLabel(today.date)}
      </p>
      <h2 className="hero-status">{today.statusLabel}</h2>
      <TodayHours today={today} />
      {today.countdown ? (
        <Countdown countdown={today.countdown} onElapsed={onCountdownElapsed} />
      ) : null}
      {today.hasTemporaryChange ? (
        <div className="hero-note">
          <span className="badge change">שינוי זמני</span>
          {today.regularHours ? (
            <p className="regular-hours">שעות רגילות: {regularLabel(today)}</p>
          ) : null}
        </div>
      ) : null}
      {today.events.length ? (
        <div className="event-row">
          {today.events.map((event) => (
            <EventChip key={event.id} event={event} onOpen={onOpenEvent} />
          ))}
        </div>
      ) : null}
    </section>
  );
}

function TodayHours({ today }: { today: TodayView }) {
  if (!today.hoursPublished) {
    return <p className="hero-hours muted">אין עדיין מידע על שעות הפתיחה להיום.</p>;
  }

  if (today.isClosed || !today.effectiveWindows?.length) {
    return <p className="hero-hours">סגור היום</p>;
  }

  return (
    <div className="hero-hours-block">
      <p className="hero-hours-label">שעות הפתיחה היום</p>
      <p className="hero-hours">{formatWindows(today.effectiveWindows)}</p>
    </div>
  );
}

function regularLabel(today: TodayView): string {
  if (!today.regularHours?.isOpen) return "סגור";
  return formatWindows(today.regularHours.windows);
}

function formatDateLabel(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}
