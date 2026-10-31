import { ArrowRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { adminApi } from "../../api";
import { ChatComposer } from "../../components/ChatComposer";
import { ReviewChangesDialog } from "../../components/admin/ReviewChangesDialog";
import { ConfirmDialog } from "../../components/ConfirmDialog";
import { MessageBubble } from "../../components/MessageBubble";
import { LoadingState, MessageState } from "../../components/StateViews";
import type { PublicMessage } from "../../types";

type Props = {
  onLogout: () => void;
};

export function AdminChatPage({ onLogout }: Props) {
  const [messages, setMessages] = useState<PublicMessage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<PublicMessage | null>(null);
  const [pendingReview, setPendingReview] = useState<PublicMessage | null>(null);
  const [pendingDelete, setPendingDelete] = useState<PublicMessage | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [loading, setLoading] = useState(true);
  const endRef = useRef<HTMLDivElement>(null);

  const load = () => {
    setError(null);
    adminApi
      .messages()
      .then((data) => setMessages(data.messages))
      .catch((err: Error) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    document.title = "הודעות · ניהול";
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages.length, editing?.id]);

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      await adminApi.deleteMessage(pendingDelete.id);
      setMessages((current) => current.filter((item) => item.id !== pendingDelete.id));
      if (editing?.id === pendingDelete.id) setEditing(null);
      setPendingDelete(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <main className="messages-page is-fixed-shell">
      <header className="messages-toolbar">
        <Link className="button ghost" to="/admin">
          <ArrowRight size={18} aria-hidden="true" />
          חזרה
        </Link>
        <div>
          <strong>הודעות ועדכונים</strong>
          <p className="muted">נשלח כמו בצ׳אט הציבורי, כולל עדכון שעות ואירועים</p>
        </div>
        <button className="button ghost" type="button" onClick={onLogout}>
          יציאה
        </button>
      </header>

      <section className="thread" aria-label="ארכיון הודעות">
        {loading ? <LoadingState /> : null}
        {error ? (
          <MessageState title="שגיאה בטעינת ההודעות" text={error} actionLabel="נסו שוב" onAction={load} />
        ) : null}
        {!loading && !error && messages.length === 0 ? (
          <MessageState title="אין הודעות עדיין" text="ההודעה הראשונה תופיע כאן גם ללקוחות." />
        ) : null}
        {messages.map((message) =>
          editing?.id === message.id ? (
            <div key={message.id} className="bubble staff editor-bubble">
              <ChatComposer
                initialBody={message.body}
                initialPhotos={message.photos}
                submitLabel="שמירת עריכה"
                onCancel={() => setEditing(null)}
                onSubmit={async (body, photos) => {
                  const result = await adminApi.updateMessage(message.id, body, photos);
                  setMessages((current) =>
                    current.map((item) => (item.id === message.id ? result.message : item)),
                  );
                  setEditing(null);
                  setPendingReview(result.message);
                }}
              />
            </div>
          ) : (
            <MessageBubble
              key={message.id}
              message={message}
              onEdit={setEditing}
              onDelete={setPendingDelete}
            />
          ),
        )}
        <div ref={endRef} />
      </section>

      <footer className="whatsapp-bar composer-bar">
        <ChatComposer
          submitLabel="שליחה"
          onSubmit={async (body, photos) => {
            const result = await adminApi.addMessage(body, photos);
            setMessages((current) => [...current, result.message]);
            setPendingReview(result.message);
          }}
        />
      </footer>

      {pendingReview ? (
        <ReviewChangesDialog
          message={pendingReview}
          onClose={() => setPendingReview(null)}
          onApplied={(message) => {
            setMessages((current) => current.map((item) => (item.id === message.id ? message : item)));
            setPendingReview(null);
          }}
        />
      ) : null}

      {pendingDelete ? (
        <ConfirmDialog
          title="למחוק את ההודעה?"
          text="ההודעה תימחק מהצ׳אט הציבורי. אם היא שינתה שעות או הוסיפה אירוע, השינוי הזה יבוטל."
          confirmLabel="מחיקה"
          busy={deleting}
          onConfirm={() => void confirmDelete()}
          onClose={() => {
            if (!deleting) setPendingDelete(null);
          }}
        />
      ) : null}
    </main>
  );
}
