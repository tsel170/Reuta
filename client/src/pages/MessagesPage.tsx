import { ArrowRight } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api";
import { LoadingState, MessageState } from "../components/StateViews";
import { WhatsAppButton } from "../components/WhatsAppButton";
import { formatDateTime } from "../format";
import type { MessagesResponse } from "../types";

export function MessagesPage() {
  const [data, setData] = useState<MessagesResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    setError(null);
    api
      .messages()
      .then(setData)
      .catch((err: Error) => setError(err.message));
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <main className="messages-page">
      <header className="messages-toolbar">
        <Link className="button ghost" to="/">
          <ArrowRight size={18} aria-hidden="true" />
          חזרה
        </Link>
        <div>
          <strong>הודעות ועדכונים</strong>
          <p className="muted">ארכיון עדכונים מהחנות</p>
        </div>
      </header>

      <section className="thread" aria-label="ארכיון הודעות">
        {!data && !error ? <LoadingState /> : null}
        {error ? (
          <MessageState
            title="שגיאה בטעינת ההודעות"
            text={error}
            actionLabel="נסו שוב"
            onAction={load}
          />
        ) : null}
        {data && data.messages.length === 0 ? (
          <MessageState
            title="אין הודעות להצגה"
            text="כשיהיו עדכונים מאושרים, הם יופיעו כאן."
          />
        ) : null}
        {data?.messages.map((message) => (
          <article
            key={message.id}
            className={`bubble ${message.isFromStaff ? "staff" : ""}`}
          >
            <small>
              {message.senderName} · {formatDateTime(message.sentAt)}
            </small>
            <p>{message.body}</p>
          </article>
        ))}
      </section>

      <footer className="whatsapp-bar">
        <WhatsAppButton url={data?.whatsappInviteUrl} />
      </footer>
    </main>
  );
}
