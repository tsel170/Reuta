import type { MessagesResponse, ScheduleResponse, StoreSettings } from "./types";

async function request<T>(path: string): Promise<T> {
  const response = await fetch(path);
  if (!response.ok) {
    throw new Error("לא ניתן לטעון את הנתונים כרגע");
  }
  return response.json() as Promise<T>;
}

export const api = {
  schedule: () => request<ScheduleResponse>("/api/schedule"),
  store: () => request<StoreSettings>("/api/store"),
  messages: () => request<MessagesResponse>("/api/messages"),
};
