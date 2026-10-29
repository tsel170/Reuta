import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { MessageIngestionService } from "../services/messageIngestion.js";
import { parseStoreMessage } from "../services/messageParser.js";
import { MemoryRepository, regularDay } from "./helpers.js";

const today = "2026-10-28";

describe("זיהוי הודעות", () => {
  it("מזהה שעות להיום", () => {
    const parsed = parseStoreMessage("היום פתוחים מ-16:00 עד 20:00", { todayDate: today });
    assert.equal(parsed.kind, "temporary_hours");
    assert.equal(parsed.confidence, "high");
    assert.deepEqual(parsed.dates, [today]);
    assert.deepEqual(parsed.windows, [{ open: "16:00", close: "20:00" }]);
  });

  it("מזהה פתיחה מחר עם שעה חלקית כלא ודאית", () => {
    const parsed = parseStoreMessage("מחר נפתח רק בחמש", { todayDate: today });
    assert.equal(parsed.confidence, "low");
    assert.equal(parsed.kind, "temporary_hours");
    assert.deepEqual(parsed.dates, ["2026-10-29"]);
    assert.ok(parsed.notes.some((note) => note.includes("סגירה")));
  });

  it("מזהה סגירה להיום", () => {
    const parsed = parseStoreMessage("היום החנות סגורה", { todayDate: today });
    assert.equal(parsed.kind, "temporary_hours");
    assert.equal(parsed.isClosed, true);
    assert.equal(parsed.confidence, "high");
  });

  it("מזהה אירוע ביום חמישי בלי לשנות שעות", () => {
    const parsed = parseStoreMessage("ביום חמישי יהיה יריד", { todayDate: today });
    assert.equal(parsed.kind, "event");
    assert.equal(parsed.eventType, "fair");
    assert.deepEqual(parsed.dates, ["2026-10-29"]);
  });

  it("הודעה כללית על השבוע נשארת לא ודאית", () => {
    const parsed = parseStoreMessage("השבוע שעות הפתיחה משתנות", { todayDate: today });
    assert.equal(parsed.confidence, "low");
    assert.equal(parsed.kind, "unclear");
  });
});

describe("קליטת הודעות", () => {
  it("מונעת כפילויות לפי מזהה מקור", async () => {
    const repository = new MemoryRepository({
      regularHours: [regularDay(2)],
    });
    const service = new MessageIngestionService(repository);
    const first = await service.ingest({
      source: "manual",
      sourceMessageId: "abc",
      senderName: "מנהלת",
      body: "היום פתוחים מ-16:00 עד 20:00",
    });
    const second = await service.ingest({
      source: "manual",
      sourceMessageId: "abc",
      senderName: "מנהלת",
      body: "היום פתוחים מ-16:00 עד 20:00",
    });
    assert.equal(first.duplicate, false);
    assert.equal(second.duplicate, true);
    assert.equal(repository.data.messages.length, 1);
  });

  it("לא דורסת שעות רגילות בשינוי זמני", async () => {
    const repository = new MemoryRepository({
      regularHours: [regularDay(2)],
    });
    const service = new MessageIngestionService(repository);
    await service.ingest({
      senderName: "מנהלת",
      body: "היום פתוחים מ-17:00 עד 19:00",
      publicationStatus: "approved",
    });
    assert.equal(repository.data.regularHours[0].windows[0].open, "16:00");
    assert.equal(repository.data.overrides[0].windows[0].open, "17:00");
  });

  it("לא מפרסמת שינוי כשיש סתירה בין הודעות", async () => {
    const repository = new MemoryRepository({
      regularHours: [regularDay(2)],
      overrides: [
        {
          id: "existing",
          startDate: today,
          endDate: today,
          isClosed: false,
          windows: [{ open: "16:00", close: "20:00" }],
        },
      ],
    });
    const service = new MessageIngestionService(repository);
    const result = await service.ingest(
      {
        senderName: "מנהלת",
        body: "היום פתוחים מ-10:00 עד 12:00",
      },
      new Date("2026-10-28T12:00:00+02:00"),
    );
    assert.equal(result.message.extracted?.applied, false);
    assert.match(result.message.extracted?.blockedReason ?? "", /סתירה/);
    assert.equal(repository.data.overrides.length, 1);
    assert.equal(result.message.publicationStatus, "pending");
  });

  it("לא מחילה הודעה בלי תאריך ברור", async () => {
    const repository = new MemoryRepository();
    const service = new MessageIngestionService(repository);
    const result = await service.ingest({
      senderName: "מנהלת",
      body: "השבוע שעות הפתיחה משתנות",
    });
    assert.equal(result.message.extracted?.applied, false);
    assert.equal(repository.data.overrides.length, 0);
    assert.equal(result.message.publicationStatus, "pending");
  });
});
