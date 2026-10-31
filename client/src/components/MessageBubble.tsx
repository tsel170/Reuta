import type { PublicMessage } from "../types";
import { formatDateTime } from "../format";

type Props = {
  message: PublicMessage;
  onEdit?: (message: PublicMessage) => void;
  onDelete?: (message: PublicMessage) => void;
};

export function MessageBubble({ message, onEdit, onDelete }: Props) {
  return (
    <article className={`bubble ${message.isFromStaff ? "staff" : ""}`}>
      <small>
        {message.senderName} · {formatDateTime(message.sentAt)}
        {message.editedAt ? " · נערך" : ""}
      </small>
      {message.body ? <p>{message.body}</p> : null}
      {message.photos?.length ? (
        <div className="bubble-photos">
          {message.photos.map((photo, index) => (
            <img key={`${message.id}-${index}`} src={photo} alt="" />
          ))}
        </div>
      ) : null}
      {onEdit && message.extracted ? <p className="bubble-note">{extractLabel(message)}</p> : null}
      {onEdit || onDelete ? (
        <div className="bubble-actions">
          {onEdit ? (
            <button className="bubble-edit" type="button" onClick={() => onEdit(message)}>
              עריכה
            </button>
          ) : null}
          {onDelete ? (
            <button className="bubble-edit is-danger" type="button" onClick={() => onDelete(message)}>
              מחיקה
            </button>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

function extractLabel(message: PublicMessage): string {
  const extracted = message.extracted;
  if (!extracted) return "";
  if (extracted.applied && extracted.kind === "event") {
    return extracted.eventTitle ? `נוסף אירוע: ${extracted.eventTitle}` : "נוסף אירוע ללוח";
  }
  if (extracted.applied && extracted.isClosed) {
    return "עודכנו שעות: סגירה";
  }
  if (extracted.applied) {
    return "עודכנו שעות הפתיחה לפי ההודעה";
  }
  if (extracted.blockedReason) return extracted.blockedReason;
  if (extracted.kind === "unclear") return "לא זוהה שינוי בלוח";
  return "זוהה שינוי — ממתין לאישור";
}
