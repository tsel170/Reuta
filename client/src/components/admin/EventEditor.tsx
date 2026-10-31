import { X } from "lucide-react";
import { useState } from "react";
import { adminApi, type EventPayload } from "../../api";
import type { StoreEvent } from "../../types";
import { ConfirmDialog } from "../ConfirmDialog";
import { Popup } from "../Popup";
import { EVENT_TYPE_OPTIONS } from "./eventTypes";

type Props = {
  event: StoreEvent;
  onClose: () => void;
  onSaved: () => void;
};

export function EventEditor({ event, onClose, onSaved }: Props) {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const [type, setType] = useState<EventPayload["type"]>(event.type);
  const [startDate, setStartDate] = useState(event.startDate);
  const [endDate, setEndDate] = useState(event.endDate ?? event.startDate);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const save = async (close: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.updateEvent(event.id, { title, description, type, startDate, endDate });
      onSaved();
      close();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    setBusy(true);
    setError(null);
    try {
      await adminApi.deleteEvent(event.id);
      setConfirmDelete(false);
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
    <Popup titleId="event-editor-title" className="admin-dialog" onClose={confirmDelete ? () => undefined : onClose}>
      {(close) => (
        <>
          <header>
            <div>
              <p className={`event-type-label type-${event.type}`}>עריכת אירוע</p>
              <h2 id="event-editor-title">{event.title}</h2>
            </div>
            <button className="icon-button is-close" type="button" onClick={close} aria-label="סגירת החלונית">
              <X size={20} />
            </button>
          </header>
          <div className="admin-form">
            <label>
              כותרת
              <input value={title} onChange={(item) => setTitle(item.target.value)} />
            </label>
            <label>
              תיאור
              <textarea rows={4} value={description} onChange={(item) => setDescription(item.target.value)} />
            </label>
            <label>
              סוג
              <select value={type} onChange={(item) => setType(item.target.value as EventPayload["type"])}>
                {EVENT_TYPE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              תאריך התחלה
              <input type="date" value={startDate} onChange={(item) => setStartDate(item.target.value)} />
            </label>
            <label>
              תאריך סיום
              <input type="date" value={endDate} onChange={(item) => setEndDate(item.target.value)} />
            </label>
            {error ? <p className="form-error">{error}</p> : null}
            <div className="action-row">
              <button className="button" type="button" disabled={busy} onClick={() => void save(close)}>
                {busy ? "שומר..." : "שמירה"}
              </button>
              <button
                className="button ghost danger"
                type="button"
                disabled={busy}
                onClick={() => setConfirmDelete(true)}
              >
                מחיקה
              </button>
            </div>
          </div>
        </>
      )}
    </Popup>
    {confirmDelete ? (
      <ConfirmDialog
        title="למחוק את האירוע?"
        text={`האירוע "${event.title}" יוסר מהאתר הציבורי ומהלוח.`}
        confirmLabel="מחיקה"
        busy={busy}
        onConfirm={() => void remove()}
        onClose={() => {
          if (!busy) setConfirmDelete(false);
        }}
      />
    ) : null}
    </>
  );
}
