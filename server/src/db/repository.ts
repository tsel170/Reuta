import type {
  ArchivedMessage,
  DailyScheduleOverride,
  RegularOpeningHours,
  StoreData,
  StoreEvent,
  StoreSettings,
} from "../types.js";

export type MessageQuery = {
  publicationStatus?: ArchivedMessage["publicationStatus"];
};

export interface StoreRepository {
  kind: "file" | "mongo";
  ready(): Promise<void>;
  isEmpty(): Promise<boolean>;
  replaceAll(data: StoreData): Promise<void>;
  getSettings(): Promise<StoreSettings>;
  updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings>;
  getRegularHours(): Promise<RegularOpeningHours[]>;
  replaceRegularHours(hours: RegularOpeningHours[]): Promise<void>;
  getOverrides(): Promise<DailyScheduleOverride[]>;
  upsertOverride(override: DailyScheduleOverride): Promise<DailyScheduleOverride>;
  removeOverride(id: string): Promise<void>;
  getEvents(): Promise<StoreEvent[]>;
  addEvent(event: StoreEvent): Promise<StoreEvent>;
  getMessages(query?: MessageQuery): Promise<ArchivedMessage[]>;
  findMessageBySource(source: string, sourceMessageId: string): Promise<ArchivedMessage | null>;
  insertMessage(message: ArchivedMessage): Promise<ArchivedMessage>;
  updateMessage(id: string, patch: Partial<ArchivedMessage>): Promise<ArchivedMessage>;
}
