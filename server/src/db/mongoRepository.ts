import mongoose from "mongoose";
import { randomUUID } from "node:crypto";
import { config } from "../config.js";
import type {
  ArchivedMessage,
  DailyScheduleOverride,
  RegularOpeningHours,
  StoreData,
  StoreEvent,
  StoreSettings,
  WeekdayIndex,
} from "../types.js";
import {
  ArchivedMessageModel,
  DailyScheduleOverrideModel,
  RegularOpeningHoursModel,
  StoreEventModel,
  StoreSettingsModel,
} from "./mongoModels.js";
import type { MessageQuery, StoreRepository } from "./repository.js";

const toSettings = (doc: Record<string, unknown>): StoreSettings => ({
  id: String(doc._id ?? "store"),
  name: String(doc.name ?? ""),
  timezone: String(doc.timezone ?? config.storeTimezone),
  whatsappInviteUrl: doc.whatsappInviteUrl ? String(doc.whatsappInviteUrl) : undefined,
  logoUrl: doc.logoUrl ? String(doc.logoUrl) : undefined,
  tagline: doc.tagline ? String(doc.tagline) : undefined,
  isDemoData: Boolean(doc.isDemoData),
});

export class MongoRepository implements StoreRepository {
  kind = "mongo" as const;

  async ready(): Promise<void> {
    if (mongoose.connection.readyState === 1) return;
    await mongoose.connect(config.mongoUri);
  }

  async isEmpty(): Promise<boolean> {
    await this.ready();
    const [settings, hours, messages] = await Promise.all([
      StoreSettingsModel.findOne({ _key: "store" }),
      RegularOpeningHoursModel.countDocuments(),
      ArchivedMessageModel.countDocuments(),
    ]);
    return !settings?.name && hours === 0 && messages === 0;
  }

  async replaceAll(data: StoreData): Promise<void> {
    await this.ready();
    await Promise.all([
      StoreSettingsModel.deleteMany({}),
      RegularOpeningHoursModel.deleteMany({}),
      DailyScheduleOverrideModel.deleteMany({}),
      StoreEventModel.deleteMany({}),
      ArchivedMessageModel.deleteMany({}),
    ]);
    await StoreSettingsModel.create({ _key: "store", ...data.settings, _id: undefined });
    if (data.regularHours.length) await RegularOpeningHoursModel.insertMany(data.regularHours);
    if (data.overrides.length) await DailyScheduleOverrideModel.insertMany(data.overrides);
    if (data.events.length) await StoreEventModel.insertMany(data.events);
    if (data.messages.length) await ArchivedMessageModel.insertMany(data.messages);
  }

  async getSettings(): Promise<StoreSettings> {
    await this.ready();
    const doc =
      (await StoreSettingsModel.findOne({ _key: "store" })) ??
      (await StoreSettingsModel.create({
        _key: "store",
        name: "",
        timezone: config.storeTimezone,
        isDemoData: false,
      }));
    return toSettings(doc.toObject());
  }

  async updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    await this.ready();
    const doc = await StoreSettingsModel.findOneAndUpdate(
      { _key: "store" },
      { $set: patch },
      { new: true, upsert: true },
    );
    return toSettings(doc!.toObject());
  }

  async getRegularHours(): Promise<RegularOpeningHours[]> {
    await this.ready();
    const docs = await RegularOpeningHoursModel.find().sort({ weekday: 1 });
    return docs.map((doc) => {
      const value = doc.toObject();
      return {
        id: String(value._id),
        weekday: value.weekday as WeekdayIndex,
        isOpen: value.isOpen,
        windows: (value.windows ?? []).map((window) => ({
          open: String(window.open ?? ""),
          close: String(window.close ?? ""),
        })),
      };
    });
  }

  async replaceRegularHours(hours: RegularOpeningHours[]): Promise<void> {
    await this.ready();
    await RegularOpeningHoursModel.deleteMany({});
    if (hours.length) await RegularOpeningHoursModel.insertMany(hours);
  }

  async getOverrides(): Promise<DailyScheduleOverride[]> {
    await this.ready();
    const docs = await DailyScheduleOverrideModel.find();
    return docs.map((doc) => {
      const value = doc.toObject();
      return {
        id: String(value._id),
        startDate: value.startDate,
        endDate: value.endDate,
        isClosed: value.isClosed,
        windows: (value.windows ?? []).map((window) => ({
          open: String(window.open ?? ""),
          close: String(window.close ?? ""),
        })),
        reason: value.reason ?? undefined,
        sourceMessageId: value.sourceMessageId ?? undefined,
      };
    });
  }

  async upsertOverride(override: DailyScheduleOverride): Promise<DailyScheduleOverride> {
    await this.ready();
    const doc = await DailyScheduleOverrideModel.findByIdAndUpdate(
      override.id,
      override,
      { new: true, upsert: true, setDefaultsOnInsert: true },
    );
    return { ...override, id: String(doc!._id) };
  }

  async removeOverride(id: string): Promise<void> {
    await this.ready();
    await DailyScheduleOverrideModel.findByIdAndDelete(id);
  }

  async getEvents(): Promise<StoreEvent[]> {
    await this.ready();
    const docs = await StoreEventModel.find();
    return docs.map((doc) => {
      const value = doc.toObject();
      return {
        id: String(value._id),
        title: value.title,
        description: value.description,
        type: value.type as StoreEvent["type"],
        importance: (value.importance as StoreEvent["importance"]) ?? "normal",
        startDate: value.startDate,
        endDate: value.endDate ?? undefined,
        weekdays: (value.weekdays ?? []) as WeekdayIndex[],
        sourceMessageId: value.sourceMessageId ?? undefined,
        isGeneralNotice: value.isGeneralNotice,
      };
    });
  }

  async addEvent(event: StoreEvent): Promise<StoreEvent> {
    await this.ready();
    const doc = await StoreEventModel.create(event);
    return { ...event, id: String(doc._id) };
  }

  async getMessages(query?: MessageQuery): Promise<ArchivedMessage[]> {
    await this.ready();
    const filter = query?.publicationStatus
      ? { publicationStatus: query.publicationStatus }
      : {};
    const docs = await ArchivedMessageModel.find(filter).sort({ sentAt: 1 });
    return docs.map((doc) => this.toMessage(doc.toObject()));
  }

  async findMessageBySource(
    source: string,
    sourceMessageId: string,
  ): Promise<ArchivedMessage | null> {
    await this.ready();
    const doc = await ArchivedMessageModel.findOne({ source, sourceMessageId });
    return doc ? this.toMessage(doc.toObject()) : null;
  }

  async insertMessage(message: ArchivedMessage): Promise<ArchivedMessage> {
    await this.ready();
    const doc = await ArchivedMessageModel.create(message);
    return this.toMessage(doc.toObject());
  }

  async updateMessage(id: string, patch: Partial<ArchivedMessage>): Promise<ArchivedMessage> {
    await this.ready();
    const doc = await ArchivedMessageModel.findByIdAndUpdate(id, { $set: patch }, { new: true });
    if (!doc) throw new Error("ההודעה לא נמצאה");
    return this.toMessage(doc.toObject());
  }

  private toMessage(value: Record<string, unknown>): ArchivedMessage {
    return {
      id: String(value._id ?? value.id ?? randomUUID()),
      source: value.source as ArchivedMessage["source"],
      sourceMessageId: String(value.sourceMessageId),
      senderName: String(value.senderName),
      isFromStaff: Boolean(value.isFromStaff),
      body: String(value.body),
      sentAt: String(value.sentAt),
      receivedAt: String(value.receivedAt),
      publicationStatus: value.publicationStatus as ArchivedMessage["publicationStatus"],
      messageKind: value.messageKind as ArchivedMessage["messageKind"],
      extracted: value.extracted as ArchivedMessage["extracted"],
    };
  }
}
