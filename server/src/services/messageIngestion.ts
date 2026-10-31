import { randomUUID } from "node:crypto";
import type { StoreRepository } from "../db/repository.js";
import { datesInclusive, getZonedNow } from "../time.js";
import type {
  ArchivedMessage,
  ExtractedMessageData,
  IngestMessageInput,
  MessageKind,
  StoreEvent,
  StoreEventType,
  TimeWindow,
} from "../types.js";
import { AdminHttpError, assertDate, cleanWindows } from "./adminSchedule.js";
import { parseStoreMessage } from "./messageParser.js";
import { sanitizeMessagePhotos } from "./messagePhotos.js";

const isValidWhatsAppInvite = (url?: string) =>
  Boolean(url && /^https:\/\/(chat\.whatsapp\.com|wa\.me)\//i.test(url));

export class MessageIngestionService {
  constructor(private readonly repository: StoreRepository) {}

  async ingest(
    input: IngestMessageInput,
    now = new Date(),
  ): Promise<{
    message: ArchivedMessage;
    duplicate: boolean;
  }> {
    const settings = await this.repository.getSettings();
    const zoned = getZonedNow(settings.timezone || "Asia/Jerusalem", now);
    const source = input.source ?? "manual";
    const sourceMessageId = input.sourceMessageId ?? randomUUID();

    const existing = await this.repository.findMessageBySource(source, sourceMessageId);
    if (existing) {
      return { message: existing, duplicate: true };
    }

    const photos = sanitizeMessagePhotos(input.photos);
    const body = input.body?.trim() ?? "";
    if (!body && !photos.length) {
      throw new AdminHttpError("יש להזין טקסט או לצרף תמונה");
    }

    const parsed = parseStoreMessage(body, { todayDate: zoned.date });
    const extracted: ExtractedMessageData = {
      ...parsed,
      applied: false,
    };

    const shouldAutoApply =
      input.apply !== false && parsed.confidence === "high" && parsed.dates.length > 0;
    let publicationStatus = input.publicationStatus;
    if (!publicationStatus) {
      publicationStatus =
        source === "seed" || (shouldAutoApply && source === "manual")
          ? "approved"
          : parsed.confidence === "high"
            ? "approved"
            : "pending";
    }

    if (source === "whatsapp" && parsed.confidence !== "high") {
      publicationStatus = input.publicationStatus ?? "pending";
    }

    if (shouldAutoApply && publicationStatus !== "rejected") {
      const applied = await this.applyParsedUpdate(parsed, sourceMessageId);
      extracted.applied = applied.applied;
      extracted.blockedReason = applied.blockedReason;
      if (!applied.applied && parsed.kind !== "event") {
        publicationStatus = input.publicationStatus ?? "pending";
      }
    }

    const messageKind: MessageKind =
      parsed.kind === "event" ? "event" : parsed.kind === "unclear" ? "unclear" : "hours";

    const message = await this.repository.insertMessage({
      id: randomUUID(),
      source,
      sourceMessageId,
      senderName: input.senderName,
      isFromStaff: input.isFromStaff ?? true,
      body,
      photos,
      sentAt: input.sentAt ?? now.toISOString(),
      receivedAt: now.toISOString(),
      publicationStatus,
      messageKind,
      extracted,
    });

    return { message, duplicate: false };
  }

  async update(
    id: string,
    input: { body: string; photos?: string[] },
    now = new Date(),
  ): Promise<ArchivedMessage> {
    const current = (await this.repository.getMessages()).find((message) => message.id === id);
    if (!current) throw new AdminHttpError("ההודעה לא נמצאה", 404);

    const photos = sanitizeMessagePhotos(input.photos);
    const body = input.body?.trim() ?? "";
    if (!body && !photos.length) {
      throw new AdminHttpError("יש להזין טקסט או לצרף תמונה");
    }

    await this.revertBySource(current.sourceMessageId);

    const settings = await this.repository.getSettings();
    const zoned = getZonedNow(settings.timezone || "Asia/Jerusalem", now);
    const parsed = parseStoreMessage(body, { todayDate: zoned.date });
    const extracted: ExtractedMessageData = {
      ...parsed,
      applied: false,
    };

    const messageKind: MessageKind =
      parsed.kind === "event" ? "event" : parsed.kind === "unclear" ? "unclear" : "hours";

    return this.repository.updateMessage(id, {
      body,
      photos,
      editedAt: now.toISOString(),
      publicationStatus: "approved",
      messageKind,
      extracted,
    });
  }

  async applyReviewed(
    id: string,
    input: {
      hours?: {
        startDate: string;
        endDate?: string;
        isClosed: boolean;
        windows?: TimeWindow[];
        reason?: string;
      } | null;
      event?: {
        title: string;
        description?: string;
        type: StoreEventType;
        startDate: string;
        endDate?: string;
      } | null;
    },
  ): Promise<ArchivedMessage> {
    const current = (await this.repository.getMessages()).find((message) => message.id === id);
    if (!current) throw new AdminHttpError("ההודעה לא נמצאה", 404);

    await this.revertBySource(current.sourceMessageId);

    const extracted: ExtractedMessageData = {
      ...(current.extracted ?? {
        confidence: "medium",
        kind: "unclear",
        dates: [],
        notes: [],
      }),
      applied: false,
    };

    if (input.hours) {
      const startDate = assertDate(input.hours.startDate, "תאריך השעות");
      const endDate = input.hours.endDate ? assertDate(input.hours.endDate, "תאריך סיום השעות") : startDate;
      if (endDate < startDate) throw new AdminHttpError("תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה");
      const isClosed = Boolean(input.hours.isClosed);
      const windows = isClosed ? [] : cleanWindows(input.hours.windows, true);
      for (const date of datesInclusive(startDate, endDate)) {
        await this.repository.upsertOverride({
          id: randomUUID(),
          startDate: date,
          endDate: date,
          isClosed,
          windows,
          reason: input.hours.reason?.trim() || (isClosed ? "סגירה לפי הודעה" : "שינוי שעות לפי הודעה"),
          sourceMessageId: current.sourceMessageId,
        });
      }
      extracted.kind = "temporary_hours";
      extracted.dates = datesInclusive(startDate, endDate);
      extracted.isClosed = isClosed;
      extracted.windows = windows;
      extracted.applied = true;
    }

    if (input.event) {
      const title = input.event.title?.trim();
      if (!title) throw new AdminHttpError("יש להזין כותרת לאירוע");
      const startDate = assertDate(input.event.startDate, "תאריך האירוע");
      const endDate = input.event.endDate ? assertDate(input.event.endDate, "תאריך סיום האירוע") : startDate;
      if (endDate < startDate) throw new AdminHttpError("תאריך הסיום אינו יכול להיות לפני תאריך ההתחלה");
      await this.repository.addEvent({
        id: randomUUID(),
        title,
        description: input.event.description?.trim() || current.body,
        type: input.event.type,
        importance: "normal",
        startDate,
        endDate,
        sourceMessageId: current.sourceMessageId,
      });
      extracted.kind = input.hours ? extracted.kind : "event";
      extracted.eventTitle = title;
      extracted.eventType = input.event.type;
      if (!extracted.dates.length) extracted.dates = [startDate];
      extracted.applied = true;
    }

    if (!input.hours && !input.event) {
      extracted.applied = false;
      extracted.blockedReason = "נשמרה ההודעה בלי שינוי בלוח";
    } else {
      extracted.blockedReason = undefined;
    }

    return this.repository.updateMessage(id, { extracted });
  }

  async remove(id: string): Promise<void> {
    const current = (await this.repository.getMessages()).find((message) => message.id === id);
    if (!current) throw new AdminHttpError("ההודעה לא נמצאה", 404);
    await this.revertBySource(current.sourceMessageId);
    await this.repository.removeMessage(id);
  }

  async ingestWebhook(payload: Record<string, unknown>): Promise<{ accepted: true; note: string }> {
    const text =
      (payload.body as string | undefined) ??
      (payload.text as string | undefined) ??
      (payload.message as string | undefined);

    if (!text) {
      return {
        accepted: true,
        note: "ה-Webhook התקבל, אך אין עדיין מיפוי לספק WhatsApp פעיל.",
      };
    }

    await this.ingest({
      source: "whatsapp",
      sourceMessageId: String(payload.id ?? payload.messageId ?? randomUUID()),
      senderName: String(payload.senderName ?? payload.from ?? "מנהל"),
      isFromStaff: true,
      body: text,
      sentAt: typeof payload.timestamp === "string" ? payload.timestamp : undefined,
      publicationStatus: "pending",
    });

    return {
      accepted: true,
      note: "ההודעה נשמרה כממתינה לאישור. אין חיבור רשמי פעיל לקבוצת WhatsApp.",
    };
  }

  static validateInviteUrl(url?: string): boolean {
    return isValidWhatsAppInvite(url);
  }

  private async revertBySource(sourceMessageId: string): Promise<void> {
    const [overrides, events] = await Promise.all([
      this.repository.getOverrides(),
      this.repository.getEvents(),
    ]);
    await Promise.all([
      ...overrides
        .filter((item) => item.sourceMessageId === sourceMessageId)
        .map((item) => this.repository.removeOverride(item.id)),
      ...events
        .filter((item) => item.sourceMessageId === sourceMessageId)
        .map((item) => this.repository.removeEvent(item.id)),
    ]);
  }

  private async applyParsedUpdate(
    parsed: ReturnType<typeof parseStoreMessage>,
    sourceMessageId: string,
  ): Promise<{ applied: boolean; blockedReason?: string }> {
    if (parsed.kind === "regular_hours") {
      return {
        applied: false,
        blockedReason: "שינוי לשעות רגילות אינו מתבצע אוטומטית",
      };
    }

    if (parsed.kind === "temporary_hours") {
      const contradiction = await this.hasContradiction(parsed);
      if (contradiction) {
        return { applied: false, blockedReason: contradiction };
      }

      const dates = [...parsed.dates].sort();
      for (const date of dates) {
        await this.repository.upsertOverride({
          id: randomUUID(),
          startDate: date,
          endDate: date,
          isClosed: Boolean(parsed.isClosed),
          windows: parsed.isClosed ? [] : (parsed.windows ?? []),
          reason: parsed.isClosed ? "סגירה זמנית לפי הודעה" : "שינוי זמני לפי הודעה",
          sourceMessageId,
        });
      }
      return { applied: true };
    }

    if (parsed.kind === "event" && parsed.eventTitle && parsed.eventType) {
      const event: StoreEvent = {
        id: randomUUID(),
        title: parsed.eventTitle,
        description: "אירוע שזוהה מהודעת עדכון. האירוע אינו משנה את שעות הפתיחה.",
        type: parsed.eventType,
        importance: "normal",
        startDate: parsed.dates[0],
        endDate: parsed.dates[parsed.dates.length - 1],
        sourceMessageId,
      };
      await this.repository.addEvent(event);
      return { applied: true };
    }

    return { applied: false, blockedReason: "אין מספיק ודאות ליישום אוטומטי" };
  }

  private async hasContradiction(
    parsed: ReturnType<typeof parseStoreMessage>,
  ): Promise<string | undefined> {
    const overrides = await this.repository.getOverrides();
    for (const date of parsed.dates) {
      const existing = overrides.find(
        (item) => date >= item.startDate && date <= item.endDate,
      );
      if (!existing) continue;
      const sameClosed = Boolean(existing.isClosed) === Boolean(parsed.isClosed);
      const sameWindows =
        JSON.stringify(existing.windows) === JSON.stringify(parsed.windows ?? []);
      if (!sameClosed || !sameWindows) {
        return `קיימת סתירה מול עדכון קיים לתאריך ${date}`;
      }
    }
    return undefined;
  }
}
