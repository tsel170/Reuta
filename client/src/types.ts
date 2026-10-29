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
  weekday: number;
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
  isGeneralNotice?: boolean;
};

export type StoreStatusKind =
  | "open"
  | "closed_opens_later"
  | "closed_for_day"
  | "unpublished";

export type NextOpening = {
  date: string;
  weekday: number;
  weekdayName: string;
  time: string;
};

export type DayScheduleView = {
  date: string;
  weekday: number;
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

export type PublicMessage = {
  id: string;
  senderName: string;
  isFromStaff: boolean;
  body: string;
  sentAt: string;
  source: "manual" | "whatsapp" | "seed";
  messageKind: "hours" | "event" | "general" | "unclear";
};

export type MessagesResponse = {
  isDemoData: boolean;
  isLiveWhatsApp: boolean;
  whatsappInviteUrl: string | null;
  messages: PublicMessage[];
};
