import { useEffect, useRef, useState } from "react";
import type { CountdownInfo } from "../types";

type Props = {
  countdown: CountdownInfo;
  onElapsed?: () => void;
};

function partsFrom(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  return {
    hours: Math.floor(total / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
    done: total <= 0,
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

  const { hours, minutes, seconds } = partsFrom(remaining);

  return (
    <div className="countdown" aria-live="polite">
      <p className="countdown-caption">{countdown.caption}</p>
      <div className="countdown-grid" dir="ltr">
        <TimeBlock value={pad(hours)} label="שעות" />
        <span className="countdown-sep" aria-hidden="true">
          :
        </span>
        <TimeBlock value={pad(minutes)} label="דקות" />
        <span className="countdown-sep" aria-hidden="true">
          :
        </span>
        <TimeBlock value={pad(seconds)} label="שניות" />
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
