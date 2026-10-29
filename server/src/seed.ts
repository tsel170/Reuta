import { randomUUID } from "node:crypto";
import { getRepository } from "./db/index.js";
import { config } from "./config.js";
import { addDays, getZonedNow } from "./time.js";
import type {
  ArchivedMessage,
  DailyScheduleOverride,
  RegularOpeningHours,
  StoreData,
  StoreEvent,
  TimeWindow,
  WeekdayIndex,
} from "./types.js";

export async function seedInitialStore(now = new Date()): Promise<StoreData> {
  const repository = await getRepository();
  const timezone = config.storeTimezone;
  const today = getZonedNow(timezone, now).date;
  const tomorrow = addDays(today, 1);
  const inThreeDays = addDays(today, 3);

  const regularHours: RegularOpeningHours[] = [
    hours(0, [{ open: "09:00", close: "11:00" }]),
    hours(1, [
      { open: "11:00", close: "14:00" },
      { open: "17:00", close: "19:00" },
    ]),
    hours(2, [{ open: "21:30", close: "22:30" }]),
    hours(3, [{ open: "17:00", close: "19:00" }]),
    hours(4, [{ open: "16:30", close: "18:30" }]),
    hours(5, []),
    hours(6, []),
  ];

  const overrides: DailyScheduleOverride[] = [
    {
      id: randomUUID(),
      startDate: tomorrow,
      endDate: tomorrow,
      isClosed: false,
      windows: [{ open: "10:00", close: "13:00" }],
      reason: "פתיחה מיוחדת",
    },
    {
      id: randomUUID(),
      startDate: inThreeDays,
      endDate: addDays(today, 4),
      isClosed: false,
      windows: [{ open: "16:00", close: "18:00" }],
      reason: "שינוי לכמה ימים",
    },
  ];

  const events: StoreEvent[] = [
    {
      id: randomUUID(),
      title: "מעילי חורף חדשים",
      description: "הגיעו מעילי ילדים ומבוגרים במצב מצוין. שעות הפתיחה נשארות כרגיל.",
      type: "notice",
      importance: "normal",
      startDate: today,
      endDate: today,
    },
    {
      id: randomUUID(),
      title: "יריד קהילתי",
      description: "יתקיים יריד קטן ליד החנות. האירוע אינו משנה את שעות הפתיחה.",
      type: "fair",
      importance: "normal",
      startDate: inThreeDays,
      endDate: inThreeDays,
    },
  ];

  const messages: ArchivedMessage[] = [
    {
      id: randomUUID(),
      source: "manual",
      sourceMessageId: "demo-1",
      senderName: "רעותה",
      isFromStaff: true,
      body: "היום פתוחים כרגיל 16:30 עד 18:30 💚",
      sentAt: new Date(`${today}T08:12:00+03:00`).toISOString(),
      receivedAt: new Date(`${today}T08:12:04+03:00`).toISOString(),
      publicationStatus: "approved",
      messageKind: "hours",
    },
    {
      id: randomUUID(),
      source: "manual",
      sourceMessageId: "demo-2",
      senderName: "רעותה",
      isFromStaff: true,
      body: "הגיעו מעילי חורף לילדים ולמבוגרים. מוזמנים לעבור!",
      sentAt: new Date(`${today}T09:40:00+03:00`).toISOString(),
      receivedAt: new Date(`${today}T09:40:03+03:00`).toISOString(),
      publicationStatus: "approved",
      messageKind: "event",
    },
    {
      id: randomUUID(),
      source: "manual",
      sourceMessageId: "demo-3",
      senderName: "רעותה",
      isFromStaff: true,
      body: "מחר תהיה פתיחה מיוחדת בבוקר, מ-10:00 עד 13:00.",
      sentAt: new Date(`${today}T11:05:00+03:00`).toISOString(),
      receivedAt: new Date(`${today}T11:05:02+03:00`).toISOString(),
      publicationStatus: "approved",
      messageKind: "hours",
    },
  ];

  const data: StoreData = {
    settings: {
      id: "store",
      name: "רעותה",
      timezone,
      tagline: "בגדים באהבה",
      logoUrl: "/reuota-poster.jpg",
      whatsappInviteUrl: config.whatsappInviteUrl || undefined,
      isDemoData: false,
    },
    regularHours,
    overrides,
    events,
    messages,
  };

  await repository.replaceAll(data);
  return data;
}

function hours(weekday: WeekdayIndex, windows: TimeWindow[]): RegularOpeningHours {
  return {
    id: `regular-${weekday}`,
    weekday,
    isOpen: windows.length > 0,
    windows,
  };
}

if (process.argv[1]?.includes("seed.ts")) {
  seedInitialStore()
    .then(() => {
      console.log("נתוני החנות הראשוניים נשמרו.");
      process.exit(0);
    })
    .catch((error) => {
      console.error(error);
      process.exit(1);
    });
}
