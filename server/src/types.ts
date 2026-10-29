export const WEEKDAY_NAMES = [
  "יום ראשון",
  "יום שני",
  "יום שלישי",
  "יום רביעי",
  "יום חמישי",
  "יום שישי",
  "שבת",
] as const;

export type WeekdayIndex = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type TimeWindow = {
  open: string;
  close: string;
};

export type StoreSettings = {
  id: string;
  name: string;
  timezone: string;
  whatsappInviteUrl?: string;
  logoUrl?: string;
  tagline?: string;
  isDemoData: boolean;
};

export type RegularOpeningHours = {
  id: string;
  weekday: WeekdayIndex;
  isOpen: boolean;
  windows: TimeWindow[];
};

export type DailyScheduleOverride = {
  id: string;
  startDate: string;
  endDate: string;
  isClosed: boolean;
  windows: TimeWindow[];
  reason?: string;
  sourceMessageId?: string;
};

export type StoreEventType =
  | "closure"
  | "fair"
  | "special_opening"
  | "vacation"
  | "notice";

export type StoreEvent = {
  id: string;
  title: string;
  description: string;
  type: StoreEventType;
  importance: "normal" | "high";
  startDate: string;
  endDate?: string;
  weekdays?: WeekdayIndex[];
  sourceMessageId?: string;
  isGeneralNotice?: boolean;
};

export type PublicationStatus = "pending" | "approved" | "rejected";
export type MessageSource = "manual" | "whatsapp" | "seed";
export type MessageKind = "hours" | "event" | "general" | "unclear";

export type ExtractedMessageData = {
  confidence: "high" | "medium" | "low";
  kind: "regular_hours" | "temporary_hours" | "event" | "unclear";
  dates: string[];
  isClosed?: boolean;
  windows?: TimeWindow[];
  eventType?: StoreEventType;
  eventTitle?: string;
  notes: string[];
  applied: boolean;
  blockedReason?: string;
};

export type ArchivedMessage = {
  id: string;
  source: MessageSource;
  sourceMessageId: string;
  senderName: string;
  isFromStaff: boolean;
  body: string;
  sentAt: string;
  receivedAt: string;
  publicationStatus: PublicationStatus;
  messageKind: MessageKind;
  extracted?: ExtractedMessageData;
};

export type StoreStatusKind =
  | "open"
  | "closed_opens_later"
  | "closed_for_day"
  | "unpublished";

export type NextOpening = {
  date: string;
  weekday: WeekdayIndex;
  weekdayName: string;
  time: string;
};

export type DayScheduleView = {
  date: string;
  weekday: WeekdayIndex;
  weekdayName: string;
  isToday: boolean;
  regularHours: RegularOpeningHours | null;
  override: DailyScheduleOverride | null;
  effectiveWindows: TimeWindow[] | null;
  isClosed: boolean;
  hoursPublished: boolean;
  hasTemporaryChange: boolean;
  events: StoreEvent[];
};

export type CountdownInfo = {
  kind: "until_open" | "until_close";
  targetIso: string;
  caption: string;
};

export type TodayView = DayScheduleView & {
  status: StoreStatusKind;
  statusLabel: string;
  closesAt?: string;
  opensAt?: string;
  nextOpen: NextOpening | null;
  countdown: CountdownInfo | null;
};

export type ScheduleResponse = {
  isDemoData: boolean;
  generatedAt: string;
  store: StoreSettings;
  today: TodayView;
  week: DayScheduleView[];
  notices: StoreEvent[];
};

export type IngestMessageInput = {
  source?: MessageSource;
  sourceMessageId?: string;
  senderName: string;
  isFromStaff?: boolean;
  body: string;
  sentAt?: string;
  publicationStatus?: PublicationStatus;
};

export type StoreData = {
  settings: StoreSettings;
  regularHours: RegularOpeningHours[];
  overrides: DailyScheduleOverride[];
  events: StoreEvent[];
  messages: ArchivedMessage[];
};
