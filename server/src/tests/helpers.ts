import type { StoreRepository } from "../db/repository.js";
import type {
  ArchivedMessage,
  DailyScheduleOverride,
  RegularOpeningHours,
  StoreData,
  StoreEvent,
  StoreSettings,
} from "../types.js";

export class MemoryRepository implements StoreRepository {
  kind = "file" as const;
  data: StoreData;

  constructor(data: Partial<StoreData> = {}) {
    this.data = {
      settings: data.settings ?? {
        id: "store",
        name: "חנות בדיקה",
        timezone: "Asia/Jerusalem",
        isDemoData: true,
      },
      regularHours: data.regularHours ?? [],
      overrides: data.overrides ?? [],
      events: data.events ?? [],
      messages: data.messages ?? [],
    };
  }

  async ready(): Promise<void> {}
  async isEmpty(): Promise<boolean> {
    return this.data.regularHours.length === 0;
  }
  async replaceAll(data: StoreData): Promise<void> {
    this.data = data;
  }
  async getSettings(): Promise<StoreSettings> {
    return this.data.settings;
  }
  async updateSettings(patch: Partial<StoreSettings>): Promise<StoreSettings> {
    this.data.settings = { ...this.data.settings, ...patch };
    return this.data.settings;
  }
  async getRegularHours(): Promise<RegularOpeningHours[]> {
    return this.data.regularHours;
  }
  async replaceRegularHours(hours: RegularOpeningHours[]): Promise<void> {
    this.data.regularHours = hours;
  }
  async getOverrides(): Promise<DailyScheduleOverride[]> {
    return this.data.overrides;
  }
  async upsertOverride(override: DailyScheduleOverride): Promise<DailyScheduleOverride> {
    const index = this.data.overrides.findIndex((item) => item.id === override.id);
    if (index >= 0) this.data.overrides[index] = override;
    else this.data.overrides.push(override);
    return override;
  }
  async removeOverride(id: string): Promise<void> {
    this.data.overrides = this.data.overrides.filter((item) => item.id !== id);
  }
  async getEvents(): Promise<StoreEvent[]> {
    return this.data.events;
  }
  async addEvent(event: StoreEvent): Promise<StoreEvent> {
    this.data.events.push(event);
    return event;
  }
  async getMessages(): Promise<ArchivedMessage[]> {
    return this.data.messages;
  }
  async findMessageBySource(source: string, sourceMessageId: string) {
    return (
      this.data.messages.find(
        (message) => message.source === source && message.sourceMessageId === sourceMessageId,
      ) ?? null
    );
  }
  async insertMessage(message: ArchivedMessage): Promise<ArchivedMessage> {
    this.data.messages.push(message);
    return message;
  }
  async updateMessage(id: string, patch: Partial<ArchivedMessage>): Promise<ArchivedMessage> {
    const index = this.data.messages.findIndex((message) => message.id === id);
    this.data.messages[index] = { ...this.data.messages[index], ...patch, id };
    return this.data.messages[index];
  }
}

export function regularDay(
  weekday: 0 | 1 | 2 | 3 | 4 | 5 | 6,
  open = "16:00",
  close = "20:00",
): RegularOpeningHours {
  return {
    id: `r-${weekday}`,
    weekday,
    isOpen: true,
    windows: [{ open, close }],
  };
}
