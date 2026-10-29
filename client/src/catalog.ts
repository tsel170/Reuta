import type {
  DailyScheduleOverride,
  PublicMessage,
  RegularOpeningHours,
  StoreEvent,
  StoreSettings,
  TimeWindow,
} from "./types";

export type StoreCatalog = {
  settings: StoreSettings;
  regularHours: RegularOpeningHours[];
  overrides: DailyScheduleOverride[];
  events: StoreEvent[];
  messages: PublicMessage[];
};

function hours(weekday: number, windows: TimeWindow[]): RegularOpeningHours {
  return {
    id: `regular-${weekday}`,
    weekday,
    isOpen: windows.length > 0,
    windows,
  };
}

export const catalog: StoreCatalog = {
  settings: {
    id: "store",
    name: "רעותה",
    timezone: "Asia/Jerusalem",
    tagline: "בגדים באהבה",
    logoUrl: `${import.meta.env.BASE_URL}reuota-poster.jpg`,
    whatsappInviteUrl: import.meta.env.VITE_WHATSAPP_INVITE_URL?.trim() || undefined,
    isDemoData: false,
  },
  regularHours: [
    hours(0, [{ open: "09:00", close: "11:00" }]),
    hours(1, [
      { open: "11:00", close: "14:00" },
      { open: "17:00", close: "19:00" },
    ]),
    hours(2, [{ open: "21:30", close: "22:30" }]),
    hours(3, [{ open: "17:00", close: "19:00" }]),
    hours(4, [{ open: "16:30", close: "18:30" }]),
    hours(5, []),
    hours(6, []),
  ],
  overrides: [],
  events: [],
  messages: [],
};
