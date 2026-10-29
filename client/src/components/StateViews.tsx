type Props = {
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function LoadingState() {
  return (
    <div className="loading" role="status" aria-live="polite">
      <span className="sr-only">טוען נתונים</span>
      <div className="skeleton" />
      <div className="skeleton" />
      <div className="skeleton" />
    </div>
  );
}

export function MessageState({ title, text, actionLabel, onAction }: Props) {
  return (
    <section className={title.includes("שגיאה") ? "error" : "empty"}>
      <h2>{title}</h2>
      <p>{text}</p>
      {actionLabel && onAction ? (
        <button className="button" type="button" onClick={onAction}>
          {actionLabel}
        </button>
      ) : null}
    </section>
  );
}
