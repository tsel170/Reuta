import { X } from "lucide-react";
import { useState } from "react";
import { adminApi, type DayHoursPayload, type EventPayload } from "../../api";
import { formatWindows } from "../../format";
import type { DayScheduleView, TimeWindow } from "../../types";
import { Popup } from "../Popup";
import { EVENT_TYPE_OPTIONS } from "./eventTypes";

type Props = {
  day: DayScheduleView;
  onClose: () => void;
  onSaved: () => void;
};

export function DayEditor({ day, onClose, onSaved }: Props) {
  const [mode, setMode] = useState<"unchanged" | "restore" | "closed" | "custom">(
    day.hasTemporaryChange ? (day.isClosed ? "closed" : "custom") : "unchanged",
  );
  const [windows, setWindows] = useState<TimeWindow[]>(
    day.effectiveWindows?.length ? day.effectiveWindows : [{ open: "09:00", close: "17:00" }],
  );
  const [reason, setReason] = useState(day.override?.reason ?? "");
  const [applyToWeekday, setApplyToWeekday] = useState(false);
  const [addEvent, setAddEvent] = useState(false);
  const [eventTitle, setEventTitle] = useState("");
  const [eventDescription, setEventDescription] = useState("");
  const [eventType, setEventType] = useState<EventPayload["type"]>("notice");
  const [eventEnd, setEventEnd] = useState(day.date);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const save = async (close: () => void) => {
    setBusy(true);
    setError(null);
    try {
      const hours: DayHoursPayload | undefined =
        mode === "unchanged"
          ? undefined
          : mode === "restore"
            ? { action: "restore", applyToWeekday }
            : mode === "closed"
              ? { action: "closed", reason, applyToWeekday }
              : { action: "override", windows, reason, applyToWeekday };
      const event = addEvent
        ? {
            title: eventTitle,
            description: eventDescription,
            type: eventType,
            startDate: day.date,
            endDate: eventEnd || day.date,
          }
        : null;
      await adminApi.saveDay(day.date, { hours, event });
      onSaved();
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Popup titleId="day-editor-title" className="admin-dialog" onClose={onClose}>
      {(close) => (
        <>
          <header>
            <div>
              <p className="muted">{day.weekdayName}</p>
              <h2 id="day-editor-title">עריכת {formatEditorDate(day.date)}</h2>
            </div>
            <button className="icon-button is-close" type="button" onClick={close} aria-label="סגירת החלונית">
              <X size={20} />
            </button>
          </header>

          <p className="muted">
            שעות רגילות: {day.regularHours?.isOpen ? formatWindows(day.regularHours.windows) : "סגור"}
          </p>

          <div className="admin-form">
            <fieldset className="choice-row">
              <legend>שעות הפתיחה</legend>
              <label>
                <input
                  type="radio"
                  name="hours-mode"
                  checked={mode === "unchanged"}
                  onChange={() => setMode("unchanged")}
                />
                ללא שינוי בשעות
              </label>
              <label>
                <input
                  type="radio"
                  name="hours-mode"
                  checked={mode === "custom"}
                  onChange={() => setMode("custom")}
                />
                שעות מותאמות
              </label>
              <label>
                <input
                  type="radio"
                  name="hours-mode"
                  checked={mode === "closed"}
                  onChange={() => setMode("closed")}
                />
                סגירה מלאה
              </label>
              <label>
                <input
                  type="radio"
                  name="hours-mode"
                  checked={mode === "restore"}
                  onChange={() => setMode("restore")}
                />
                חזרה לשעות הרגילות
              </label>
            </fieldset>

            {mode === "custom"
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
                    {windows.length > 1 ? (
                      <button
                        className="button ghost"
                        type="button"
                        onClick={() =>
                          setWindows((current) => current.filter((_, itemIndex) => itemIndex !== index))
                        }
                      >
                        הסרה
                      </button>
                    ) : null}
                  </div>
                ))
              : null}

            {mode === "custom" ? (
              <button
                className="button ghost"
                type="button"
                onClick={() => setWindows((current) => [...current, { open: "17:00", close: "19:00" }])}
              >
                הוספת חלון פתיחה
              </button>
            ) : null}

            {mode !== "restore" ? (
              <label>
                סיבה לשינוי
                <input value={reason} onChange={(event) => setReason(event.target.value)} />
              </label>
            ) : null}

            <label className="check-row">
              <input
                type="checkbox"
                checked={applyToWeekday}
                onChange={(event) => setApplyToWeekday(event.target.checked)}
              />
              עדכון גם לשעות הרגילות של {day.weekdayName}
            </label>

            <label className="check-row">
              <input
                type="checkbox"
                checked={addEvent}
                onChange={(event) => setAddEvent(event.target.checked)}
              />
              גם להוסיף אירוע באותו יום
            </label>

            {addEvent ? (
              <>
                <label>
                  כותרת האירוע
                  <input
                    required
                    value={eventTitle}
                    onChange={(event) => setEventTitle(event.target.value)}
                  />
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
                  סוג האירוע
                  <select
                    value={eventType}
                    onChange={(event) => setEventType(event.target.value as EventPayload["type"])}
                  >
                    {EVENT_TYPE_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  תאריך סיום
                  <input
                    type="date"
                    value={eventEnd}
                    onChange={(event) => setEventEnd(event.target.value)}
                  />
                </label>
              </>
            ) : null}

            {error ? <p className="form-error">{error}</p> : null}
            <button className="button" type="button" disabled={busy} onClick={() => void save(close)}>
              {busy ? "שומר..." : "שמירה"}
            </button>
          </div>
        </>
      )}
    </Popup>
  );
}

function formatEditorDate(isoDate: string): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("he-IL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(year, month - 1, day));
}
