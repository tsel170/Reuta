import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { saveAdminDay } from "../services/adminSchedule.js";
import { getSchedule } from "../services/scheduleService.js";
import { MemoryRepository, regularDay } from "./helpers.js";

describe("עריכת יום בידי מנהל", () => {
  it("שומר שינוי שעות ואירוע יחד", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: "Asia/Jerusalem", isDemoData: true },
      regularHours: [0, 1, 2, 3, 4].map((day) => regularDay(day as 0 | 1 | 2 | 3 | 4)),
    });

    const result = await saveAdminDay(repository, "2026-10-30", {
      hours: {
        action: "override",
        windows: [{ open: "09:00", close: "15:00" }],
        reason: "יריד",
      },
      event: {
        title: "יריד קהילתי",
        description: "החנות נסגרת מוקדם בגלל יריד",
        type: "fair",
      },
    });

    assert.equal(result.override?.isClosed, false);
    assert.equal(result.override?.windows[0]?.close, "15:00");
    assert.equal(result.event?.title, "יריד קהילתי");

    const schedule = await getSchedule(repository, new Date("2026-10-30T08:00:00+03:00"));
    assert.equal(schedule.today.hasTemporaryChange, true);
    assert.equal(schedule.today.effectiveWindows?.[0]?.close, "15:00");
    assert.equal(schedule.today.events[0]?.title, "יריד קהילתי");
  });

  it("מבטל שינוי וחוזר לשעות הרגילות", async () => {
    const repository = new MemoryRepository({
      settings: { id: "store", name: "בדיקה", timezone: "Asia/Jerusalem", isDemoData: true },
      regularHours: [regularDay(5, "09:00", "13:00")],
    });

    await saveAdminDay(repository, "2026-10-30", {
      hours: { action: "closed" },
    });
    await saveAdminDay(repository, "2026-10-30", {
      hours: { action: "restore" },
    });

    const schedule = await getSchedule(repository, new Date("2026-10-30T10:00:00+03:00"));
    assert.equal(schedule.today.hasTemporaryChange, false);
    assert.equal(schedule.today.isClosed, false);
  });
});
