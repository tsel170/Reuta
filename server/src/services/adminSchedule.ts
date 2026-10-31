import { randomUUID } from "node:crypto";
import type { StoreRepository } from "../db/repository.js";
import { pickOverride } from "./scheduleService.js";
import { weekdayFromDate } from "../time.js";
import type {
  DailyScheduleOverride,
  StoreEvent,
  StoreEventType,
  TimeWindow,
} from "../types.js";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EVENT_TYPES: StoreEventType[] = [
  "closure",
  "fair",
  "special_opening",
  "vacation",
  "notice",
];

export type DayHoursInput = {
  action: "override" | "closed" | "restore";
  windows?: TimeWindow[];
  reason?: string;
  applyToWeekday?: boolean;
};

export type DayEventInput = {
  title: string;
  description?: string;
  type: StoreEventType;
  startDate?: string;
  endDate?: string;
};

export class AdminHttpError extends Error {
  constructor(
    message: string,
    public status = 400,
  ) {
    super(message);
  }
}

export function assertDate(value: string, label = "תאריך"): string {
  if (!DATE_RE.test(value)) {
    throw new AdminHttpError(`${label} אינו תקין`);
  }
  return value;
}

export function cleanWindows(windows: TimeWindow[] | undefined, required: boolean): TimeWindow[] {
  const cleaned = (windows ?? [])
    .map((window) => ({
      open: String(window.open ?? "").trim(),
      close: String(window.close ?? "").trim(),
    }))
    .filter((window) => window.open || window.close);

  if (required && cleaned.length === 0) {
    throw new AdminHttpError("יש להזין לפחות חלון פתיחה אחד");
  }
  for (const window of cleaned) {
    if (!TIME_RE.test(window.open) || !TIME_RE.test(window.close)) {
      throw new AdminHttpError("שעות הפתיחה חייבות להיות בפורמט 00:00");
    }
  }
  return cleaned;
}

export async function saveAdminDay(
  repository: StoreRepository,
  date: string,
  input: { hours?: DayHoursInput; event?: DayEventInput | null },
): Promise<{ override: DailyScheduleOverride | null; event: StoreEvent | null }> {
  assertDate(date);
  if (!input.hours && !input.event) {
    throw new AdminHttpError("לא נבחרו שינויים לשמירה");
  }

  let override: DailyScheduleOverride | null = null;
  if (input.hours) {
    override = await applyHours(repository, date, input.hours);
  }

  let event: StoreEvent | null = null;
  if (input.event) {
    event = await createEvent(repository, {
      ...input.event,
      startDate: input.event.startDate ?? date,
    });
  }

  return { override, event };
}

async function applyHours(
  repository: StoreRepository,
  date: string,
  hours: DayHoursInput,
): Promise<DailyScheduleOverride | null> {
  const weekday = weekdayFromDate(date);
  const regularHours = await repository.getRegularHours();
  const current = regularHours.find((item) => item.weekday === weekday);

  if (hours.applyToWeekday && hours.action !== "restore") {
    const next = [...regularHours];
    const windows = hours.action === "closed" ? [] : cleanWindows(hours.windows, hours.action === "override");
    const updated = {
      id: current?.id ?? `regular-${weekday}`,
      weekday,
      isOpen: hours.action !== "closed" && windows.length > 0,
      windows: hours.action === "closed" ? [] : windows,
    };
    const index = next.findIndex((item) => item.weekday === weekday);
    if (index >= 0) next[index] = updated;
    else next.push(updated);
    await repository.replaceRegularHours(next);
  }

  if (hours.action === "restore") {
    const existing = pickOverride(date, await repository.getOverrides());
    if (existing) await repository.removeOverride(existing.id);
    return null;
  }

  const existing = pickOverride(date, await repository.getOverrides());
  const isClosed = hours.action === "closed";
  const windows = isClosed ? [] : cleanWindows(hours.windows, true);
  const override: DailyScheduleOverride = {
    id: existing && existing.startDate === date && existing.endDate === date ? existing.id : randomUUID(),
    startDate: date,
    endDate: date,
    isClosed,
    windows,
    reason: hours.reason?.trim() || undefined,
  };
  return repository.upsertOverride(override);
}

export async function createEvent(
  repository: StoreRepository,
  input: DayEventInput,
): Promise<StoreEvent> {
  const title = input.title?.trim();
  if (!title) throw new AdminHttpError("יש להזין כותרת לאירוע");
  if (!EVENT_TYPES.includes(input.type)) throw new AdminHttpError("סוג האירוע אינו תקין");
  const startDate = assertDate(input.startDate ?? "", "תאריך ההתחלה");
  const endDate = input.endDate ? assertDate(input.endDate, "תאריך הסיום") : startDate;
  if (endDate < startDate) throw new AdminHttpError("תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה");

  return repository.addEvent({
    id: randomUUID(),
    title,
    description: input.description?.trim() ?? "",
    type: input.type,
    importance: "normal",
    startDate,
    endDate,
  });
}

export async function patchEvent(
  repository: StoreRepository,
  id: string,
  input: Partial<DayEventInput>,
): Promise<StoreEvent> {
  const patch: Partial<StoreEvent> = {};
  if (input.title !== undefined) {
    const title = input.title.trim();
    if (!title) throw new AdminHttpError("יש להזין כותרת לאירוע");
    patch.title = title;
  }
  if (input.description !== undefined) patch.description = input.description.trim();
  if (input.type !== undefined) {
    if (!EVENT_TYPES.includes(input.type)) throw new AdminHttpError("סוג האירוע אינו תקין");
    patch.type = input.type;
  }
  if (input.startDate !== undefined) patch.startDate = assertDate(input.startDate, "תאריך ההתחלה");
  if (input.endDate !== undefined) {
    patch.endDate = input.endDate ? assertDate(input.endDate, "תאריך הסיום") : undefined;
  }
  return repository.updateEvent(id, patch);
}

