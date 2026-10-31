import { Popup } from "./Popup";

type Props = {
  title: string;
  text: string;
  confirmLabel: string;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({ title, text, confirmLabel, busy, onConfirm, onClose }: Props) {
  return (
    <Popup titleId="confirm-title" className="admin-dialog confirm-dialog" onClose={onClose}>
      {(close) => (
        <>
          <header>
            <h2 id="confirm-title">{title}</h2>
          </header>
          <p>{text}</p>
          <div className="action-row">
            <button className="button ghost" type="button" disabled={busy} onClick={close}>
              ביטול
            </button>
            <button className="button danger-fill" type="button" disabled={busy} onClick={onConfirm}>
              {busy ? "מוחק..." : confirmLabel}
            </button>
          </div>
        </>
      )}
    </Popup>
  );
}
