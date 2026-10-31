import { AdminHttpError } from "./adminSchedule.js";

const DATA_URL = /^data:image\/(jpeg|jpg|png|webp);base64,[A-Za-z0-9+/=\s]+$/i;
export const MAX_MESSAGE_PHOTOS = 4;
const MAX_PHOTO_CHARS = 2_500_000;

export function sanitizeMessagePhotos(raw: unknown): string[] {
  if (raw == null) return [];
  if (!Array.isArray(raw)) {
    throw new AdminHttpError("פורמט התמונות אינו תקין");
  }
  if (raw.length > MAX_MESSAGE_PHOTOS) {
    throw new AdminHttpError(`אפשר לצרף עד ${MAX_MESSAGE_PHOTOS} תמונות להודעה`);
  }
  return raw.map((item, index) => {
    const value = String(item ?? "").trim();
    if (!DATA_URL.test(value)) {
      throw new AdminHttpError(`תמונה ${index + 1} אינה שמורה כטקסט תקין`);
    }
    if (value.length > MAX_PHOTO_CHARS) {
      throw new AdminHttpError("אחת התמונות גדולה מדי");
    }
    return value.replace(/\s+/g, "");
  });
}
