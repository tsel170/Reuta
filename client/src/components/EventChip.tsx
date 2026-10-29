import { CalendarDays, Info, PartyPopper, Store, Umbrella } from "lucide-react";
import type { StoreEvent } from "../types";

const ICONS = {
  closure: Store,
  fair: PartyPopper,
  special_opening: CalendarDays,
  vacation: Umbrella,
  notice: Info,
};

type Props = {
  event: StoreEvent;
  onOpen: (event: StoreEvent) => void;
};

export function EventChip({ event, onOpen }: Props) {
  const Icon = ICONS[event.type];
  return (
    <button className="event-chip" type="button" onClick={() => onOpen(event)}>
      <Icon size={16} aria-hidden="true" />
      <span>{event.title}</span>
    </button>
  );
}
