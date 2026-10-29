import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { config } from "../config.js";
import type {
  ArchivedMessage,
  DailyScheduleOverride,
  RegularOpeningHours,
  StoreData,
  StoreEvent,
  StoreSettings,
} from "../types.js";
import type { MessageQuery, StoreRepository } from "./repository.js";

const emptySettings = (): StoreSettings => ({
  id: "store",
  name: "",
  timezone: config.storeTimezone,
  isDemoData: false,
});

const emptyData = (): StoreData => ({
  settings: emptySettings(),
  regularHours: [],
  overrides: [],
  events: [],
  messages: [],
});

export class FileRepository implements StoreRepository {
  kind = "file" as const;
  private data: StoreData = emptyData();
  private loaded = false;

  constructor(private readonly filePath = config.dataFile) {}

  async ready(): Promise<void> {
    if (this.loaded) return;
    try {
      const raw = await readFile(this.filePath, "utf8");
      this.data = { ...emptyData(), ...JSON.parse(raw) };
    } catch {
      this.data = emptyData();
      await this.persist();
    }
    this.loaded = true;
  }

  async isEmpty(): Promise<boolean> {
    await this.ready();
    return (
      !this.data.settings.name &&
      this.data.regularHours.length === 0 &&
      this.data.messages.length === 0
    );
  }

  async replaceAll(data: StoreData): Promise<void> {
    this.data = data;
    await this.persist();
  }

  async getSettings(): Promise<StoreSettings> {
    await this.ready();
    return this.data.settings;
  }

  async updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    await this.ready();
    this.data.settings = { ...this.data.settings, ...patch };
    await this.persist();
    return this.data.settings;
  }

  async getRegularHours(): Promise<RegularOpeningHours[]> {
    await this.ready();
    return [...this.data.regularHours].sort((a, b) => a.weekday - b.weekday);
  }

  async replaceRegularHours(hours: RegularOpeningHours[]): Promise<void> {
    await this.ready();
    this.data.regularHours = hours;
    await this.persist();
  }

  async getOverrides(): Promise<DailyScheduleOverride[]> {
    await this.ready();
    return [...this.data.overrides];
  }

  async upsertOverride(override: DailyScheduleOverride): Promise<DailyScheduleOverride> {
    await this.ready();
    const index = this.data.overrides.findIndex((item) => item.id === override.id);
    if (index >= 0) this.data.overrides[index] = override;
    else this.data.overrides.push(override);
    await this.persist();
    return override;
  }

  async removeOverride(id: string): Promise<void> {
    await this.ready();
    this.data.overrides = this.data.overrides.filter((item) => item.id !== id);
    await this.persist();
  }

  async getEvents(): Promise<StoreEvent[]> {
    await this.ready();
    return [...this.data.events];
  }

  async addEvent(event: StoreEvent): Promise<StoreEvent> {
    await this.ready();
    this.data.events.push(event);
    await this.persist();
    return event;
  }

  async getMessages(query?: MessageQuery): Promise<ArchivedMessage[]> {
    await this.ready();
    return this.data.messages
      .filter((message) =>
        query?.publicationStatus ? message.publicationStatus === query.publicationStatus : true,
      )
      .sort((a, b) => a.sentAt.localeCompare(b.sentAt));
  }

  async findMessageBySource(
    source: string,
    sourceMessageId: string,
  ): Promise<ArchivedMessage | null> {
    await this.ready();
    return (
      this.data.messages.find(
        (message) => message.source === source && message.sourceMessageId === sourceMessageId,
      ) ?? null
    );
  }

  async insertMessage(message: ArchivedMessage): Promise<ArchivedMessage> {
    await this.ready();
    this.data.messages.push(message);
    await this.persist();
    return message;
  }

  async updateMessage(id: string, patch: Partial<ArchivedMessage>): Promise<ArchivedMessage> {
    await this.ready();
    const index = this.data.messages.findIndex((message) => message.id === id);
    if (index < 0) throw new Error("ההודעה לא נמצאה");
    this.data.messages[index] = { ...this.data.messages[index], ...patch, id };
    await this.persist();
    return this.data.messages[index];
  }

  private async persist(): Promise<void> {
    await mkdir(path.dirname(this.filePath), { recursive: true });
    await writeFile(this.filePath, JSON.stringify(this.data, null, 2), "utf8");
  }
}
