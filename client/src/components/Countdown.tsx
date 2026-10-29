import { Fragment, useEffect, useRef, useState } from "react";
import type { CountdownInfo } from "../types";

type Props = {
  countdown: CountdownInfo;
  onElapsed?: () => void;
};

type TimeParts = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function partsFrom(ms: number): TimeParts {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function pad(value: number) {
  return String(value).padStart(2, "0");
}

export function Countdown({ countdown, onElapsed }: Props) {
  const [remaining, setRemaining] = useState(() =>
    new Date(countdown.targetIso).getTime() - Date.now(),
  );

  const firedFor = useRef<string | null>(null);

  useEffect(() => {
    const tick = () => setRemaining(new Date(countdown.targetIso).getTime() - Date.now());
    tick();
    const timer = window.setInterval(tick, 1000);
    return () => window.clearInterval(timer);
  }, [countdown.targetIso]);

  useEffect(() => {
    if (remaining > 0 || firedFor.current === countdown.targetIso) return;
    firedFor.current = countdown.targetIso;
    onElapsed?.();
  }, [remaining, countdown.targetIso, onElapsed]);

  const parts = partsFrom(remaining);
  const blocks = [
    parts.days > 0 ? { key: "days", value: String(parts.days), label: "ימים" } : null,
    parts.hours > 0 ? { key: "hours", value: pad(parts.hours), label: "שעות" } : null,
    { key: "minutes", value: pad(parts.minutes), label: "דקות" },
    { key: "seconds", value: pad(parts.seconds), label: "שניות" },
  ].filter((block): block is { key: string; value: string; label: string } => block !== null);

  return (
    <div className="countdown" aria-live="polite">
      <p className="countdown-caption">{countdown.caption}</p>
      <div className="countdown-grid" dir="ltr">
        {blocks.map((block, index) => (
          <Fragment key={block.key}>
            {index > 0 ? (
              <span className="countdown-sep" aria-hidden="true">
                :
              </span>
            ) : null}
            <TimeBlock value={block.value} label={block.label} />
          </Fragment>
        ))}
      </div>
    </div>
  );
}

function TimeBlock({ value, label }: { value: string; label: string }) {
  return (
    <div className="countdown-block">
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  );
}
