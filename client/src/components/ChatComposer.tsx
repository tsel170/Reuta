import { ImagePlus, Send } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { compressImageFile } from "../compressImage";

const MAX_PHOTOS = 4;

type Props = {
  initialBody?: string;
  initialPhotos?: string[];
  submitLabel: string;
  onSubmit: (body: string, photos: string[]) => Promise<void>;
  onCancel?: () => void;
};

export function ChatComposer({
  initialBody = "",
  initialPhotos = [],
  submitLabel,
  onSubmit,
  onCancel,
}: Props) {
  const [body, setBody] = useState(initialBody);
  const [photos, setPhotos] = useState<string[]>(initialPhotos);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const addFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setError(null);
    try {
      const next = [...photos];
      for (const file of Array.from(files)) {
        if (next.length >= MAX_PHOTOS) break;
        next.push(await compressImageFile(file));
      }
      setPhotos(next);
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if ((!body.trim() && !photos.length) || busy) return;
    setBusy(true);
    setError(null);
    try {
      await onSubmit(body.trim(), photos);
      setBody("");
      setPhotos([]);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="chat-composer" onSubmit={(event) => void submit(event)}>
      {photos.length ? (
        <div className="composer-photos">
          {photos.map((photo, index) => (
            <button
              key={`${photo.slice(-12)}-${index}`}
              type="button"
              className="composer-photo"
              onClick={() => setPhotos((current) => current.filter((_, item) => item !== index))}
              aria-label="הסרת תמונה"
            >
              <img src={photo} alt="" />
            </button>
          ))}
        </div>
      ) : null}
      <textarea
        rows={2}
        value={body}
        placeholder="כתבו עדכון ללקוחות..."
        onChange={(event) => setBody(event.target.value)}
      />
      {error ? <p className="form-error">{error}</p> : null}
      <div className="composer-actions">
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          hidden
          onChange={(event) => {
            void addFiles(event.target.files);
            event.target.value = "";
          }}
        />
        <button
          className="icon-button"
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={busy || photos.length >= MAX_PHOTOS}
          aria-label="צירוף תמונה"
        >
          <ImagePlus size={20} />
        </button>
        {onCancel ? (
          <button className="button ghost" type="button" onClick={onCancel} disabled={busy}>
            ביטול
          </button>
        ) : null}
        <button className="button" type="submit" disabled={busy || (!body.trim() && !photos.length)}>
          <Send size={16} aria-hidden="true" />
          {busy ? "שולח..." : submitLabel}
        </button>
      </div>
    </form>
  );
}
