import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { getSchedule } from "../services/scheduleService.js";
import { MemoryRepository, regularDay } from "./helpers.js";

const tz = "Asia/Jerusalem";

function atJerusalem(isoLocal: string): Date {
  const asUtc = new Date(`${isoLocal}+02:00`);
  return asUtc;
}

const weekHours = [0, 1, 2, 3, 4].map((day) => regularDay(day as 0 | 1 | 2 | 3 | 4));

describe("חישוב סטטוס החנות", () => {
  it("החנות פתוחה כעת", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.equal(schedule.today.status, "open");
    assert.equal(schedule.today.closesAt, "20:00");
    assert.match(schedule.today.statusLabel, /פתוח עכשיו/);
    assert.equal(schedule.today.countdown?.kind, "until_close");
    assert.ok(schedule.today.countdown?.targetIso);
  });

  it("החנות סגורה כעת ותיפתח בהמשך היום", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T15:00:00"));
    assert.equal(schedule.today.status, "closed_opens_later");
    assert.equal(schedule.today.opensAt, "16:00");
    assert.match(schedule.today.statusLabel, /נפתח בשעה 16:00/);
    assert.equal(schedule.today.countdown?.kind, "until_open");
    assert.ok(schedule.today.countdown?.targetIso);
  });

  it("החנות סגורה היום", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
      overrides: [
        {
          id: "closed",
          startDate: "2026-10-28",
          endDate: "2026-10-28",
          isClosed: true,
          windows: [],
          reason: "סגירה חד-יומית",
        },
      ],
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.equal(schedule.today.status, "closed_for_day");
    assert.equal(schedule.today.isClosed, true);
    assert.equal(schedule.today.hasTemporaryChange, true);
  });

  it("השעות השתנו ליום אחד בלבד", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
      overrides: [
        {
          id: "one-day",
          startDate: "2026-10-28",
          endDate: "2026-10-28",
          isClosed: false,
          windows: [{ open: "17:00", close: "19:00" }],
        },
      ],
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.equal(schedule.today.hasTemporaryChange, true);
    assert.deepEqual(schedule.today.effectiveWindows, [{ open: "17:00", close: "19:00" }]);
    assert.deepEqual(schedule.today.regularHours?.windows, [{ open: "16:00", close: "20:00" }]);
    const thursday = schedule.week.find((day) => day.date === "2026-10-29");
    assert.equal(thursday?.hasTemporaryChange, false);
    assert.deepEqual(thursday?.effectiveWindows, [{ open: "16:00", close: "20:00" }]);
  });

  it("השעות השתנו לכמה ימים", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
      overrides: [
        {
          id: "range",
          startDate: "2026-10-28",
          endDate: "2026-10-30",
          isClosed: false,
          windows: [{ open: "12:00", close: "15:00" }],
        },
      ],
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T13:00:00"));
    const changed = schedule.week
      .filter((day) => day.hasTemporaryChange)
      .map((day) => day.date)
      .sort();
    assert.deepEqual(changed, ["2026-10-29", "2026-10-30"]);
    assert.equal(schedule.today.hasTemporaryChange, true);
  });

  it("אירוע חריג ללא שינוי בשעות", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
      events: [
        {
          id: "fair",
          title: "יריד",
          description: "יריד בחצר",
          type: "fair",
          importance: "high",
          startDate: "2026-10-28",
          endDate: "2026-10-28",
        },
      ],
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.equal(schedule.today.status, "open");
    assert.equal(schedule.today.hasTemporaryChange, false);
    assert.equal(schedule.today.events[0]?.title, "יריד");
    assert.deepEqual(schedule.today.effectiveWindows, [{ open: "16:00", close: "20:00" }]);
  });

  it("אין עדיין מידע על שעות הפתיחה", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: [],
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.equal(schedule.today.status, "unpublished");
    assert.match(schedule.today.statusLabel, /טרם פורסמו/);
    assert.equal(schedule.today.isClosed, false);
  });

  it("אחרי שעות הפעילות מוצג מועד הפתיחה הבא", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T21:00:00"));
    assert.equal(schedule.today.status, "closed_for_day");
    assert.equal(schedule.today.nextOpen?.date, "2026-10-29");
    assert.equal(schedule.today.nextOpen?.time, "16:00");
  });

  it("רשימת הימים מתחילה ממחר ומסתיימת באותו יום בשבוע הבא", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: tz, isDemoData: true },
      regularHours: weekHours,
    });
    const schedule = await getSchedule(repository, atJerusalem("2026-10-28T17:30:00"));
    assert.deepEqual(
      schedule.week.map((day) => day.date),
      [
        "2026-10-29",
        "2026-10-30",
        "2026-10-31",
        "2026-11-01",
        "2026-11-02",
        "2026-11-03",
        "2026-11-04",
      ],
    );
    assert.equal(schedule.week.every((day) => !day.isToday), true);
  });
});
