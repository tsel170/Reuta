import { randomUUID } from "node:crypto";
import type { StoreRepository } from "../db/repository.js";
import { getZonedNow } from "../time.js";
import type {
  ArchivedMessage,
  DailyScheduleOverride,
  ExtractedMessageData,
  IngestMessageInput,
  MessageKind,
  StoreEvent,
} from "../types.js";
import { parseStoreMessage } from "./messageParser.js";

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

    const parsed = parseStoreMessage(input.body, { todayDate: zoned.date });
    const extracted: ExtractedMessageData = {
      ...parsed,
      applied: false,
    };

    const shouldAutoApply = parsed.confidence === "high" && parsed.dates.length > 0;
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
      body: input.body,
      sentAt: input.sentAt ?? now.toISOString(),
      receivedAt: now.toISOString(),
      publicationStatus,
      messageKind,
      extracted,
    });

    return { message, duplicate: false };
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
