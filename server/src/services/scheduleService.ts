import type { StoreRepository } from "../db/repository.js";
import { withStoreIdentity } from "../storeIdentity.js";
import {
  addDays,
  dateInRange,
  getZonedNow,
  toMinutes,
  weekdayFromDate,
  weekdayName,
  zonedDateTimeToUtc,
} from "../time.js";
import type {
  CountdownInfo,
  DailyScheduleOverride,
  DayScheduleView,
  NextOpening,
  RegularOpeningHours,
  ScheduleResponse,
  StoreEvent,
  TimeWindow,
  TodayView,
} from "../types.js";

export function windowsOverlapNow(windows: TimeWindow[], minutes: number): TimeWindow | null {
  for (const window of windows) {
    const open = toMinutes(window.open);
    const close = toMinutes(window.close);
    if (close > open) {
      if (minutes >= open && minutes < close) return window;
    } else if (close < open) {
      if (minutes >= open || minutes < close) return window;
    }
  }
  return null;
}

export function nextWindowToday(windows: TimeWindow[], minutes: number): TimeWindow | null {
  const upcoming = windows
    .filter((window) => toMinutes(window.open) > minutes)
    .sort((a, b) => toMinutes(a.open) - toMinutes(b.open));
  return upcoming[0] ?? null;
}

export function lastCloseToday(windows: TimeWindow[]): string | null {
  if (!windows.length) return null;
  return [...windows].sort((a, b) => toMinutes(a.close) - toMinutes(b.close)).at(-1)?.close ?? null;
}

export function resolveDay(
  date: string,
  regularHours: RegularOpeningHours[],
  overrides: DailyScheduleOverride[],
  events: StoreEvent[],
  todayDate: string,
): DayScheduleView {
  const weekday = weekdayFromDate(date);
  const regular = regularHours.find((item) => item.weekday === weekday) ?? null;
  const override = pickOverride(date, overrides);

  let effectiveWindows: TimeWindow[] | null = null;
  let isClosed = false;
  let hoursPublished = false;

  if (override) {
    hoursPublished = true;
    isClosed = override.isClosed;
    effectiveWindows = override.isClosed ? [] : override.windows;
  } else if (regular) {
    hoursPublished = true;
    isClosed = !regular.isOpen;
    effectiveWindows = regular.isOpen ? regular.windows : [];
  }

  const dayEvents = events.filter((event) => {
    if (event.isGeneralNotice) return false;
    const end = event.endDate ?? event.startDate;
    if (!dateInRange(date, event.startDate, end)) return false;
    if (event.weekdays?.length) return event.weekdays.includes(weekday);
    return true;
  });

  return {
    date,
    weekday,
    weekdayName: weekdayName(weekday),
    isToday: date === todayDate,
    regularHours: regular,
    override,
    effectiveWindows,
    isClosed,
    hoursPublished,
    hasTemporaryChange: Boolean(override),
    events: dayEvents,
  };
}

export function findNextOpening(
  fromDate: string,
  fromMinutes: number,
  regularHours: RegularOpeningHours[],
  overrides: DailyScheduleOverride[],
  events: StoreEvent[],
): NextOpening | null {
  for (let offset = 0; offset < 21; offset += 1) {
    const date = addDays(fromDate, offset);
    const day = resolveDay(date, regularHours, overrides, events, fromDate);
    if (!day.hoursPublished || day.isClosed || !day.effectiveWindows?.length) continue;

    const window =
      offset === 0
        ? nextWindowToday(day.effectiveWindows, fromMinutes)
        : [...day.effectiveWindows].sort((a, b) => toMinutes(a.open) - toMinutes(b.open))[0];

    if (!window) continue;
    return {
      date,
      weekday: day.weekday,
      weekdayName: day.weekdayName,
      time: window.open,
    };
  }
  return null;
}

export function buildTodayView(
  day: DayScheduleView,
  minutes: number,
  nextOpen: NextOpening | null,
  timeZone: string,
): TodayView {
  if (!day.hoursPublished) {
    return {
      ...day,
      status: "unpublished",
      statusLabel: "שעות הפתיחה טרם פורסמו",
      nextOpen,
      countdown: null,
    };
  }

  if (day.isClosed || !day.effectiveWindows?.length) {
    return {
      ...day,
      status: "closed_for_day",
      statusLabel: nextOpen
        ? `סגור כרגע · נפתח ${formatNextOpen(nextOpen, day.date)}`
        : "סגור כרגע",
      nextOpen,
      countdown: countdownUntilOpen(nextOpen, timeZone),
    };
  }

  const current = windowsOverlapNow(day.effectiveWindows, minutes);
  if (current) {
    return {
      ...day,
      status: "open",
      statusLabel: "פתוח עכשיו",
      closesAt: current.close,
      nextOpen,
      countdown: {
        kind: "until_close",
        targetIso: zonedDateTimeToUtc(timeZone, day.date, current.close),
        caption: "נסגר בעוד",
      },
    };
  }

  const later = nextWindowToday(day.effectiveWindows, minutes);
  if (later) {
    const next = {
      date: day.date,
      weekday: day.weekday,
      weekdayName: day.weekdayName,
      time: later.open,
    };
    return {
      ...day,
      status: "closed_opens_later",
      statusLabel: `נפתח בשעה ${later.open}`,
      opensAt: later.open,
      nextOpen: next,
      countdown: countdownUntilOpen(next, timeZone),
    };
  }

  return {
    ...day,
    status: "closed_for_day",
    statusLabel: nextOpen
      ? `סגור כרגע · נפתח ${formatNextOpen(nextOpen, day.date)}`
      : "סגור כרגע",
    nextOpen,
    countdown: countdownUntilOpen(nextOpen, timeZone),
  };
}

function countdownUntilOpen(nextOpen: NextOpening | null, timeZone: string): CountdownInfo | null {
  if (!nextOpen) return null;
  return {
    kind: "until_open",
    targetIso: zonedDateTimeToUtc(timeZone, nextOpen.date, nextOpen.time),
    caption: "נפתח בעוד",
  };
}

function formatNextOpen(next: NextOpening, todayDate: string): string {
  if (next.date === todayDate) return `בשעה ${next.time}`;
  if (next.date === addDays(todayDate, 1)) return `מחר בשעה ${next.time}`;
  return `ב${next.weekdayName} בשעה ${next.time}`;
}

export function pickOverride(
  date: string,
  overrides: DailyScheduleOverride[],
): DailyScheduleOverride | null {
  const matching = overrides.filter((item) => dateInRange(date, item.startDate, item.endDate));
  matching.sort((a, b) => {
    const spanA = dateSpan(a.startDate, a.endDate);
    const spanB = dateSpan(b.startDate, b.endDate);
    return spanA - spanB;
  });
  return matching[0] ?? null;
}

function dateSpan(startDate: string, endDate: string): number {
  const start = Date.parse(`${startDate}T00:00:00Z`);
  const end = Date.parse(`${endDate}T00:00:00Z`);
  return Math.max(0, Math.round((end - start) / 86_400_000)) + 1;
}

export async function getMonthSchedule(
  repository: StoreRepository,
  year: number,
  month: number,
  now = new Date(),
) {
  const [settings, regularHours, overrides, events] = await Promise.all([
    repository.getSettings(),
    repository.getRegularHours(),
    repository.getOverrides(),
    repository.getEvents(),
  ]);
  const store = withStoreIdentity(settings);
  const zoned = getZonedNow(store.timezone || "Asia/Jerusalem", now);
  const start = `${year}-${String(month).padStart(2, "0")}-01`;
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const days = Array.from({ length: daysInMonth }, (_, index) =>
    resolveDay(addDays(start, index), regularHours, overrides, events, zoned.date),
  );
  return {
    month: `${year}-${String(month).padStart(2, "0")}`,
    generatedAt: zoned.iso,
    store,
    days,
  };
}

export async function getSchedule(
  repository: StoreRepository,
  now = new Date(),
): Promise<ScheduleResponse> {
  const [settings, regularHours, overrides, events] = await Promise.all([
    repository.getSettings(),
    repository.getRegularHours(),
    repository.getOverrides(),
    repository.getEvents(),
  ]);

  const store = withStoreIdentity(settings);
  const zoned = getZonedNow(store.timezone || "Asia/Jerusalem", now);
  const today = resolveDay(zoned.date, regularHours, overrides, events, zoned.date);
  const week = Array.from({ length: 7 }, (_, index) =>
    resolveDay(addDays(zoned.date, index + 1), regularHours, overrides, events, zoned.date),
  );

  const nextOpen = findNextOpening(
    zoned.date,
    zoned.minutes,
    regularHours,
    overrides,
    events,
  );

  const notices: StoreEvent[] = [];

  return {
    isDemoData: settings.isDemoData,
    generatedAt: zoned.iso,
    store,
    today: buildTodayView(today, zoned.minutes, nextOpen, store.timezone || "Asia/Jerusalem"),
    week,
    notices,
  };
}
