const DEFAULT_MAX_EDGE = 1200;
const DEFAULT_JPEG_QUALITY = 0.82;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;

export async function compressImageFile(
  file: File,
  maxEdge = DEFAULT_MAX_EDGE,
  quality = DEFAULT_JPEG_QUALITY,
): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new Error("יש לבחור קובץ תמונה בלבד");
  }
  if (file.size > MAX_SOURCE_BYTES) {
    throw new Error("התמונה גדולה מדי. נסו תמונה קטנה יותר (עד 15MB).");
  }

  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await loadImage(objectUrl);
    const scale = Math.min(1, maxEdge / Math.max(image.width, image.height));
    const width = Math.max(1, Math.round(image.width * scale));
    const height = Math.max(1, Math.round(image.height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;

    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("לא ניתן לעבד את התמונה");
    }

    context.drawImage(image, 0, 0, width, height);
    return canvas.toDataURL("image/jpeg", quality);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("לא ניתן לטעון את התמונה"));
    image.src = src;
  });
}
