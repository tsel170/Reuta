import { useEffect, useRef, type ReactNode } from "react";

type Props = {
  titleId: string;
  className?: string;
  onClose: () => void;
  children: (close: () => void) => ReactNode;
};

export function Popup({ titleId, className, onClose, children }: Props) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const closingRef = useRef(false);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  const requestClose = () => {
    if (closingRef.current) return;
    closingRef.current = true;

    const overlay = overlayRef.current;
    const dialog = dialogRef.current;
    if (!overlay || !dialog) {
      onCloseRef.current();
      return;
    }

    overlay.style.pointerEvents = "none";
    overlay.style.animation = "none";
    dialog.style.animation = "none";
    void overlay.offsetWidth;
    overlay.style.animation = "popup-overlay-out 0.4s ease forwards";
    dialog.style.animation = "popup-dialog-out 0.4s ease forwards";

    let finished = false;
    const finish = () => {
      if (finished) return;
      finished = true;
      onCloseRef.current();
    };

    overlay.addEventListener("animationend", finish, { once: true });
    window.setTimeout(finish, 450);
  };

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") requestClose();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div ref={overlayRef} className="overlay" role="presentation" onClick={requestClose}>
      <div
        ref={dialogRef}
        className={`dialog ${className ?? ""}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        onClick={(event) => event.stopPropagation()}
      >
        {children(requestClose)}
      </div>
    </div>
  );
}
