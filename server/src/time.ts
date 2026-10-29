import { WEEKDAY_NAMES, type WeekdayIndex } from "./types.js";

export type ZonedNow = {
  date: string;
  time: string;
  minutes: number;
  weekday: WeekdayIndex;
  iso: string;
};

const WEEKDAY_SHORT: Record<string, WeekdayIndex> = {
  Sun: 0,
  Mon: 1,
  Tue: 2,
  Wed: 3,
  Thu: 4,
  Fri: 5,
  Sat: 6,
};

export function pad(value: number): string {
  return String(value).padStart(2, "0");
}

export function toMinutes(hhmm: string): number {
  const [hours, minutes] = hhmm.split(":").map(Number);
  return hours * 60 + minutes;
}

export function formatMinutes(total: number): string {
  const normalized = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  return `${pad(Math.floor(normalized / 60))}:${pad(normalized % 60)}`;
}

export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
}

export function weekdayFromDate(isoDate: string): WeekdayIndex {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay() as WeekdayIndex;
}

export function weekdayName(weekday: WeekdayIndex): string {
  return WEEKDAY_NAMES[weekday];
}

export function startOfWeekSunday(isoDate: string): string {
  return addDays(isoDate, -weekdayFromDate(isoDate));
}

export function datesInclusive(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  let current = startDate;
  while (current <= endDate) {
    dates.push(current);
    current = addDays(current, 1);
  }
  return dates;
}

export function dateInRange(date: string, startDate: string, endDate: string): boolean {
  return date >= startDate && date <= endDate;
}

export function getZonedNow(timeZone: string, now = new Date()): ZonedNow {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const read = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  const date = `${read("year")}-${read("month")}-${read("day")}`;
  const time = `${read("hour")}:${read("minute")}`;
  const weekday = WEEKDAY_SHORT[read("weekday")] ?? 0;

  return {
    date,
    time,
    minutes: toMinutes(time),
    weekday,
    iso: now.toISOString(),
  };
}

export function zonedDateTimeToUtc(timeZone: string, date: string, hhmm: string): string {
  const [year, month, day] = date.split("-").map(Number);
  const [hour, minute] = hhmm.split(":").map(Number);
  const desired = Date.UTC(year, month - 1, day, hour, minute);

  const stamp = (instant: Date) => {
    const zoned = getZonedNow(timeZone, instant);
    const [zYear, zMonth, zDay] = zoned.date.split("-").map(Number);
    const [zHour, zMinute] = zoned.time.split(":").map(Number);
    return Date.UTC(zYear, zMonth - 1, zDay, zHour, zMinute);
  };

  let guess = new Date(desired);
  for (let index = 0; index < 4; index += 1) {
    const diff = desired - stamp(guess);
    if (diff === 0) break;
    guess = new Date(guess.getTime() + diff);
  }
  return guess.toISOString();
}

export function formatHebrewDate(isoDate: string, timeZone: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day, 12));
  return new Intl.DateTimeFormat("he-IL", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(utc);
}
