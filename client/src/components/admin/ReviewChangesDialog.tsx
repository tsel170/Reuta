import { X } from "lucide-react";
import { useState } from "react";
import { adminApi } from "../../api";
import type { PublicMessage, TimeWindow } from "../../types";
import { Popup } from "../Popup";
import { EVENT_TYPE_OPTIONS } from "./eventTypes";

type Props = {
  message: PublicMessage;
  onClose: () => void;
  onApplied: (message: PublicMessage) => void;
};

export function ReviewChangesDialog({ message, onClose, onApplied }: Props) {
  const extracted = message.extracted;
  const firstDate = extracted?.dates[0] ?? todayDate();
  const lastDate = extracted?.dates.at(-1) ?? firstDate;
  const looksLikeHours =
    extracted?.kind === "temporary_hours" ||
    extracted?.kind === "regular_hours" ||
    Boolean(extracted?.isClosed) ||
    Boolean(extracted?.windows?.length);
  const looksLikeEvent = extracted?.kind === "event" || Boolean(extracted?.eventTitle);

  const [includeHours, setIncludeHours] = useState(looksLikeHours || !looksLikeEvent);
  const [includeEvent, setIncludeEvent] = useState(looksLikeEvent);
  const [hoursClosed, setHoursClosed] = useState(Boolean(extracted?.isClosed));
  const [hoursStart, setHoursStart] = useState(firstDate);
  const [hoursEnd, setHoursEnd] = useState(lastDate);
  const [windows, setWindows] = useState<TimeWindow[]>(
    extracted?.windows?.length ? extracted.windows : [{ open: "09:00", close: "17:00" }],
  );
  const [reason, setReason] = useState("");
  const [eventTitle, setEventTitle] = useState(extracted?.eventTitle ?? "");
  const [eventDescription, setEventDescription] = useState(message.body);
  const [eventType, setEventType] = useState(extracted?.eventType ?? "notice");
  const [eventStart, setEventStart] = useState(firstDate);
  const [eventEnd, setEventEnd] = useState(lastDate);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const apply = async (close: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const result = await adminApi.applyMessage(message.id, {
        hours: includeHours
          ? {
              startDate: hoursStart,
              endDate: hoursEnd || hoursStart,
              isClosed: hoursClosed,
              windows: hoursClosed ? [] : windows,
              reason,
            }
          : null,
        event: includeEvent
          ? {
              title: eventTitle,
              description: eventDescription,
              type: eventType,
              startDate: eventStart,
              endDate: eventEnd || eventStart,
            }
          : null,
      });
      onApplied(result.message);
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popup titleId="review-changes-title" className="admin-dialog" onClose={onClose}>
      {(close) => (
        <>
          <header>
            <div>
              <p className="muted">לפני עדכון הלוח</p>
              <h2 id="review-changes-title">שינויים שזוהו</h2>
            </div>
            <button className="icon-button is-close" type="button" onClick={close} aria-label="סגירת החלונית">
              <X size={20} />
            </button>
          </header>
          {message.body ? <p className="review-quote">{message.body}</p> : null}
          {extracted?.notes?.length ? <p className="muted">{extracted.notes.join(" · ")}</p> : null}

          <div className="admin-form">
            <label className="check-row">
              <input
                type="checkbox"
                checked={includeHours}
                onChange={(event) => setIncludeHours(event.target.checked)}
              />
              לעדכן שעות פתיחה
            </label>
            {includeHours ? (
              <>
                <label className="check-row">
                  <input
                    type="checkbox"
                    checked={hoursClosed}
                    onChange={(event) => setHoursClosed(event.target.checked)}
                  />
                  סגירה מלאה
                </label>
                <div className="window-row">
                  <label>
                    מתאריך
                    <input type="date" value={hoursStart} onChange={(event) => setHoursStart(event.target.value)} />
                  </label>
                  <label>
                    עד תאריך
                    <input type="date" value={hoursEnd} onChange={(event) => setHoursEnd(event.target.value)} />
                  </label>
                </div>
                {!hoursClosed
                  ? windows.map((window, index) => (
                      <div className="window-row" key={index}>
                        <label>
                          פתיחה
                          <input
                            type="time"
                            value={window.open}
                            onChange={(event) =>
                              setWindows((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, open: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </label>
                        <label>
                          סגירה
                          <input
                            type="time"
                            value={window.close}
                            onChange={(event) =>
                              setWindows((current) =>
                                current.map((item, itemIndex) =>
                                  itemIndex === index ? { ...item, close: event.target.value } : item,
                                ),
                              )
                            }
                          />
                        </label>
                      </div>
                    ))
                  : null}
                <label>
                  סיבה
                  <input value={reason} onChange={(event) => setReason(event.target.value)} />
                </label>
              </>
            ) : null}

            <label className="check-row">
              <input
                type="checkbox"
                checked={includeEvent}
                onChange={(event) => setIncludeEvent(event.target.checked)}
              />
              להוסיף אירוע
            </label>
            {includeEvent ? (
              <>
                <label>
                  כותרת
                  <input value={eventTitle} onChange={(event) => setEventTitle(event.target.value)} />
                </label>
                <label>
                  תיאור
                  <textarea
                    rows={3}
                    value={eventDescription}
                    onChange={(event) => setEventDescription(event.target.value)}
                  />
                </label>
                <label>
                  סוג
                  <select
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value as typeof eventType)}
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <div className="window-row">
                  <label>
                    מתאריך
                    <input type="date" value={eventStart} onChange={(event) => setEventStart(event.target.value)} />
                  </label>
                  <label>
                    עד תאריך
                    <input type="date" value={eventEnd} onChange={(event) => setEventEnd(event.target.value)} />
                  </label>
                </div>
              </>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}
            <div className="action-row">
              <button className="button" type="button" disabled={busy} onClick={() => void apply(close)}>
                {busy ? "מחיל..." : "החלה בלוח"}
              </button>
              <button className="button ghost" type="button" disabled={busy} onClick={close}>
                רק לשמור את ההודעה
              </button>
            </div>
          </div>
        </>
      )}
    </Popup>
  );
}

function todayDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}
