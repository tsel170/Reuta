import { addDays, weekdayFromDate } from "../time.js";
import type { StoreEventType, TimeWindow, WeekdayIndex } from "../types.js";

export type ParseContext = {
  todayDate: string;
};

export type ParseResult = {
  confidence: "high" | "medium" | "low";
  kind: "regular_hours" | "temporary_hours" | "event" | "unclear";
  dates: string[];
  isClosed?: boolean;
  windows?: TimeWindow[];
  eventType?: StoreEventType;
  eventTitle?: string;
  notes: string[];
};

const WEEKDAY_PATTERNS: Array<{ index: WeekdayIndex; pattern: RegExp }> = [
  { index: 0, pattern: /יום\s*ראשון|ביום\s*ראשון|בראשון/ },
  { index: 1, pattern: /יום\s*שני|ביום\s*שני|בשני/ },
  { index: 2, pattern: /יום\s*שלישי|ביום\s*שלישי|בשלישי/ },
  { index: 3, pattern: /יום\s*רביעי|ביום\s*רביעי|ברביעי/ },
  { index: 4, pattern: /יום\s*חמישי|ביום\s*חמישי|בחמישי/ },
  { index: 5, pattern: /יום\s*שישי|ביום\s*שישי|בשישי/ },
  { index: 6, pattern: /יום\s*שבת|ביום\s*שבת|בשבת|שבת/ },
];

const HEBREW_HOURS: Record<string, number> = {
  אחת: 1,
  שתיים: 2,
  שתים: 2,
  שלוש: 3,
  ארבע: 4,
  חמש: 5,
  שש: 6,
  שבע: 7,
  שמונה: 8,
  תשע: 9,
  עשר: 10,
  אחתעשרה: 11,
  שתיםעשרה: 12,
};

function normalize(text: string): string {
  return text
    .replace(/[־–—]/g, "-")
    .replace(/\u00a0/g, " ")
    .replace(/[”“"']/g, "")
    .trim();
}

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toTime(hours: number, minutes = 0): string | null {
  if (Number.isNaN(hours) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }
  return `${pad(hours)}:${pad(minutes)}`;
}

function parseClock(raw: string): string | null {
  const match = raw.match(/^(\d{1,2})(?:[:.](\d{2}))?$/);
  if (!match) return null;
  return toTime(Number(match[1]), match[2] ? Number(match[2]) : 0);
}

function parseHebrewHour(raw: string, eveningBias: boolean): string | null {
  const key = raw.replace(/\s+/g, "");
  const hour = HEBREW_HOURS[key];
  if (hour == null) return null;
  const adjusted = eveningBias && hour <= 10 ? hour + 12 : hour;
  return toTime(adjusted);
}

function upcomingWeekday(todayDate: string, weekday: WeekdayIndex): string {
  const todayWeekday = weekdayFromDate(todayDate);
  const delta = (weekday - todayWeekday + 7) % 7;
  return addDays(todayDate, delta);
}

function extractDates(text: string, todayDate: string, notes: string[]): string[] {
  const dates = new Set<string>();

  if (/היום/.test(text)) dates.add(todayDate);
  if (/מחרתיים/.test(text)) dates.add(addDays(todayDate, 2));
  else if (/מחר/.test(text)) dates.add(addDays(todayDate, 1));

  for (const item of WEEKDAY_PATTERNS) {
    if (item.pattern.test(text)) dates.add(upcomingWeekday(todayDate, item.index));
  }

  if (/השבוע/.test(text) && dates.size === 0) {
    notes.push("ההודעה מתייחסת לשבוע בלי ימים מדויקים");
  }

  return [...dates];
}

function extractTimes(text: string, notes: string[]): TimeWindow[] {
  const eveningBias = /ערב|אחה.?צ|רק|נפתח/.test(text);
  const windows: TimeWindow[] = [];

  const range = text.match(
    /(?:מ-?|בין\s+)?(\d{1,2}(?:[:.]\d{2})?)\s*(?:עד|ל-?|-)\s*(\d{1,2}(?:[:.]\d{2})?)/,
  );
  if (range) {
    const open = parseClock(range[1]);
    const close = parseClock(range[2]);
    if (open && close) windows.push({ open, close });
  }

  if (!windows.length) {
    const hebrewRange = text.match(
      /(?:מ-?|רק\s+)?(?:ב)?(אחת|שתיים|שתים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)\s*(?:עד|ל-?)\s*(אחת|שתיים|שתים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)/,
    );
    if (hebrewRange) {
      const open = parseHebrewHour(hebrewRange[1], eveningBias);
      const close = parseHebrewHour(hebrewRange[2], eveningBias);
      if (open && close) windows.push({ open, close });
    }
  }

  if (!windows.length) {
    const singleClock = text.match(/(?:ב-?|בשעה\s+)?(\d{1,2}(?:[:.]\d{2}))/);
    const singleWord = text.match(/(?:ב|רק\s+ב)(אחת|שתיים|שתים|שלוש|ארבע|חמש|שש|שבע|שמונה|תשע|עשר)/);
    const open = singleClock
      ? parseClock(singleClock[1])
      : singleWord
        ? parseHebrewHour(singleWord[1], eveningBias)
        : null;
    if (open) {
      notes.push("זוהתה שעת פתיחה בלי שעת סגירה");
      windows.push({ open, close: "" });
    }
  }

  return windows;
}

function detectEvent(text: string): { type: StoreEventType; title: string } | null {
  if (/יריד|שוק/.test(text)) return { type: "fair", title: "יריד" };
  if (/חופשה|סגירה לכמה ימים|סגורים כמה ימים/.test(text)) {
    return { type: "vacation", title: "חופשה / סגירה ממושכת" };
  }
  if (/פתיחה מיוחדת/.test(text)) return { type: "special_opening", title: "פתיחה מיוחדת" };
  if (/אירוע/.test(text)) return { type: "notice", title: "אירוע מיוחד" };
  return null;
}

export function parseStoreMessage(rawBody: string, context: ParseContext): ParseResult {
  const text = normalize(rawBody);
  const notes: string[] = [];
  const dates = extractDates(text, context.todayDate, notes);
  const closed = /סגור(ה|ים)?|לא נפתח|יום שבתון/.test(text);
  const hoursMentioned = /פתוח|פתוחים|נפתח|שעות|עד|מ-/.test(text) || /\d{1,2}[:.]\d{2}/.test(text);
  const regularIntent = /קבוע|רגילות|מעתה|מעכשיו באופן קבוע/.test(text);
  const temporaryIntent = /היום|מחר|זמני|רק|השבוע/.test(text);
  const event = detectEvent(text);
  const windows = extractTimes(text, notes);
  const completeWindows = windows.filter((window) => window.open && window.close);

  if (closed && dates.length && !event) {
    return {
      confidence: "high",
      kind: "temporary_hours",
      dates,
      isClosed: true,
      windows: [],
      notes,
    };
  }

  if (completeWindows.length && dates.length) {
    return {
      confidence: regularIntent && !temporaryIntent ? "medium" : "high",
      kind: regularIntent && !temporaryIntent ? "regular_hours" : "temporary_hours",
      dates,
      isClosed: false,
      windows: completeWindows,
      notes: regularIntent && !temporaryIntent
        ? [...notes, "שינוי לשעות רגילות דורש אישור"]
        : notes,
    };
  }

  if (event && dates.length) {
    return {
      confidence: "high",
      kind: "event",
      dates,
      eventType: event.type,
      eventTitle: event.title,
      notes,
    };
  }

  if (event && !dates.length) {
    return {
      confidence: "medium",
      kind: "event",
      dates: [],
      eventType: event.type,
      eventTitle: event.title,
      notes: [...notes, "זוהה אירוע בלי תאריך ברור"],
    };
  }

  if (windows.length && !completeWindows.length) {
    return {
      confidence: "low",
      kind: "temporary_hours",
      dates,
      windows,
      notes: [...notes, "חסרה שעת סגירה, לא מפרסמים שינוי אוטומטי"],
    };
  }

  if (hoursMentioned && !dates.length) {
    return {
      confidence: "low",
      kind: "unclear",
      dates: [],
      notes: [...notes, "הוזכרו שעות בלי תאריך ברור"],
    };
  }

  return {
    confidence: "low",
    kind: "unclear",
    dates,
    notes: notes.length ? notes : ["לא ניתן לזהות שעות או אירוע באופן חד-משמעי"],
  };
}
