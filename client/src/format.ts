import type { TimeWindow } from "./types";

export function formatWindows(windows: TimeWindow[] | null | undefined): string {
  if (!windows?.length) return "סגור";
  return windows
    .map((window) =>
      window.open && window.close
        ? `\u2066${window.open}\u2013${window.close}\u2069`
        : window.open || "לא פורסם",
    )
    .join("\n");
}

export function formatDateRange(startDate: string, endDate?: string): string {
  const start = formatDate(startDate);
  if (!endDate || endDate === startDate) return start;
  return `${start} עד ${formatDate(endDate)}`;
}

export function formatDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, day));
}

export function formatDateTime(iso: string): string {
  return new Intl.DateTimeFormat("he-IL", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

export function storeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "ח";
  return parts
    .slice(0, 2)
    .map((part) => part[0])
    .join("");
}
