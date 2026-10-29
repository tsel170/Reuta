import { X } from "lucide-react";
import { useEffect, useRef } from "react";
import { Popup } from "./Popup";

type Props = {
  src: string;
  alt: string;
  onClose: () => void;
};

export function LogoDialog({ src, alt, onClose }: Props) {
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    closeRef.current?.focus();
  }, []);

  return (
    <Popup titleId="logo-dialog-title" className="logo-dialog" onClose={onClose}>
      {(close) => (
        <>
          <header>
            <h2 id="logo-dialog-title">רעותה · בגדים באהבה</h2>
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
          <img src={src} alt={alt} />
        </>
      )}
    </Popup>
  );
}
