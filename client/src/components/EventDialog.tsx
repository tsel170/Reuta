import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { formatDateRange } from "../format";
import type { StoreEvent } from "../types";
import { Popup } from "./Popup";

const TYPE_LABELS: Record<StoreEvent["type"], string> = {
  closure: "סגירה",
  fair: "יריד",
  special_opening: "פתיחה מיוחדת",
  vacation: "חופשה",
  notice: "הודעה",
};

type Props = {
  event: StoreEvent;
  onClose: () => void;
};

export function EventDialog({ event, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <Popup titleId="event-title" onClose={onClose}>
      {(close) => (
        <>
          <header>
            <div>
              <p className="muted">{TYPE_LABELS[event.type]}</p>
              <h2 id="event-title">{event.title}</h2>
            </div>
            <button
              ref={closeRef}
              className="icon-button"
              type="button"
              onClick={close}
              aria-label="סגירת החלונית"
            >
              <X size={20} />
            </button>
          </header>
          <p>{event.description}</p>
          <p>
            <strong>תאריכים: </strong>
            {formatDateRange(event.startDate, event.endDate)}
          </p>
          <p className="muted">האירוע אינו משנה אוטומטית את שעות הפתיחה.</p>
        </>
      )}
    </Popup>
  );
}
