import type { StoreEvent } from "../../types";

export const EVENT_TYPE_OPTIONS: { value: StoreEvent["type"]; label: string }[] = [
  { value: "closure", label: "החנות סגורה" },
  { value: "fair", label: "יריד" },
  { value: "vacation", label: "חופשה" },
  { value: "special_opening", label: "אירוע מיוחד" },
  { value: "notice", label: "הודעה כללית ללקוחות" },
];
