import { localMessages, localSchedule } from "./schedule";
import type {
  DayScheduleView,
  MessagesResponse,
  PublicMessage,
  ScheduleResponse,
  StoreEvent,
  StoreSettings,
  TimeWindow,
} from "./types";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("לא ניתן לטעון את הנתונים כרגע");
  }
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) {
    throw new Error("לא ניתן לטעון את הנתונים כרגע");
  }
  return response.json() as Promise<T>;
}

const ADMIN_TOKEN_COOKIE = "reuota_admin_client";
const ADMIN_TOKEN_MAX_AGE = 30 * 24 * 60 * 60;

function readClientToken(): string {
  if (typeof document === "undefined") return "";
  for (const part of document.cookie.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === ADMIN_TOKEN_COOKIE) return decodeURIComponent(rest.join("="));
  }
  return "";
}

function persistClientToken(token: string) {
  const expires = new Date(Date.now() + ADMIN_TOKEN_MAX_AGE * 1000).toUTCString();
  document.cookie = `${ADMIN_TOKEN_COOKIE}=${encodeURIComponent(token)}; Path=/; Max-Age=${ADMIN_TOKEN_MAX_AGE}; Expires=${expires}; SameSite=Lax`;
}

function clearClientToken() {
  document.cookie = `${ADMIN_TOKEN_COOKIE}=; Path=/; Max-Age=0; SameSite=Lax`;
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const token = readClientToken();
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra,
  };
}

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: "include",
    ...init,
    headers: authHeaders({
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    }),
  });
  const raw = await response.text();
  let data: unknown = {};
  if (raw) {
    try {
      data = JSON.parse(raw);
    } catch {
      data = {};
    }
  }
  if (!response.ok) {
    throw new Error((data as { error?: string }).error || "הפעולה נכשלה");
  }
  return data as T;
}

async function withFallback<T>(path: string, fallback: () => T): Promise<T> {
  try {
    return await request<T>(path);
  } catch {
    return fallback();
  }
}

async function serverWhatsAppUrl(): Promise<string | null> {
  try {
    const data = await request<{ whatsappInviteUrl: string | null }>("/api/config");
    return data.whatsappInviteUrl;
  } catch {
    return null;
  }
}

export const api = {
  schedule: () => withFallback<ScheduleResponse>("/api/schedule", localSchedule),
  store: () => withFallback<StoreSettings>("/api/store", () => localSchedule().store),
  messages: async () => {
    const [data, invite] = await Promise.all([
      withFallback<MessagesResponse>("/api/messages", localMessages),
      serverWhatsAppUrl(),
    ]);
    return {
      ...data,
      whatsappInviteUrl: invite ?? data.whatsappInviteUrl,
    };
  },
};

export type DayHoursPayload = {
  action: "override" | "closed" | "restore";
  windows?: TimeWindow[];
  reason?: string;
  applyToWeekday?: boolean;
};

export type EventPayload = {
  title: string;
  description?: string;
  type: StoreEvent["type"];
  startDate?: string;
  endDate?: string;
};

export type CalendarResponse = {
  month: string;
  days: DayScheduleView[];
  store: StoreSettings;
};

export const adminApi = {
  me: async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      try {
        const response = await fetch("/api/admin/auth/me", {
          credentials: "include",
          headers: authHeaders(),
        });
        if (response.status === 401) return null;
        if (!response.ok) throw new Error("me-failed");
        return (await response.json()) as { email: string };
      } catch {
        if (attempt === 2) return null;
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }
    return null;
  },
  login: async (email: string) => {
    const result = await requestJson<{ ok: true; email: string; token: string }>(
      "/api/admin/auth/login",
      {
        method: "POST",
        body: JSON.stringify({ email }),
      },
    );
    persistClientToken(result.token);
    return result;
  },
  logout: async () => {
    try {
      return await requestJson<{ ok: true }>("/api/admin/auth/logout", {
        method: "POST",
        body: "{}",
      });
    } finally {
      clearClientToken();
    }
  },
  schedule: () => requestJson<ScheduleResponse>("/api/admin/schedule"),
  calendar: (year: number, month: number) =>
    requestJson<CalendarResponse>(`/api/admin/calendar?year=${year}&month=${month}`),
  saveDay: (date: string, body: { hours?: DayHoursPayload; event?: EventPayload | null }) =>
    requestJson<{ schedule: ScheduleResponse }>(`/api/admin/days/${date}`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
  createEvent: (body: EventPayload) =>
    requestJson<{ event: StoreEvent; schedule: ScheduleResponse }>("/api/admin/events", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  updateEvent: (id: string, body: Partial<EventPayload>) =>
    requestJson<{ event: StoreEvent; schedule: ScheduleResponse }>(`/api/admin/events/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),
  deleteEvent: (id: string) =>
    requestJson<{ schedule: ScheduleResponse }>(`/api/admin/events/${id}`, {
      method: "DELETE",
    }),
  messages: () => requestJson<{ messages: PublicMessage[] }>("/api/admin/messages"),
  addMessage: (body: string, photos?: string[], senderName?: string) =>
    requestJson<{ message: PublicMessage; schedule: ScheduleResponse }>("/api/admin/messages", {
      method: "POST",
      body: JSON.stringify({ body, photos, senderName }),
    }),
  updateMessage: (id: string, body: string, photos?: string[]) =>
    requestJson<{ message: PublicMessage; schedule: ScheduleResponse }>(`/api/admin/messages/${id}`, {
      method: "PATCH",
      body: JSON.stringify({ body, photos }),
    }),
  deleteMessage: (id: string) =>
    requestJson<{ ok: true }>(`/api/admin/messages/${id}`, {
      method: "DELETE",
    }),
  applyMessage: (
    id: string,
    body: {
      hours?: {
        startDate: string;
        endDate?: string;
        isClosed: boolean;
        windows?: TimeWindow[];
        reason?: string;
      } | null;
      event?: EventPayload | null;
    },
  ) =>
    requestJson<{ message: PublicMessage; schedule: ScheduleResponse }>(
      `/api/admin/messages/${id}/apply`,
      {
        method: "POST",
        body: JSON.stringify(body),
      },
    ),
};
