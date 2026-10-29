import { localMessages, localSchedule } from "./schedule";
import type { MessagesResponse, ScheduleResponse, StoreSettings } from "./types";

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

async function withFallback<T>(path: string, fallback: () => T): Promise<T> {
  try {
    return await request<T>(path);
  } catch {
    return fallback();
  }
}

export const api = {
  schedule: () => withFallback<ScheduleResponse>("/api/schedule", localSchedule),
  store: () => withFallback<StoreSettings>("/api/store", () => localSchedule().store),
  messages: () => withFallback<MessagesResponse>("/api/messages", localMessages),
};
