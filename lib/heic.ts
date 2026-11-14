/**
 * iPhone photos are often HEIC/HEIF. Only Safari can display those, so
 * uploading them as-is shows a broken image in every other browser.
 * Convert to JPEG in the browser before compressing/uploading:
 *   1. the browser's own decoder (Safari decodes HEIC natively), then
 *   2. heic-to (current libheif, handles newer iPhone HEICs), loaded only
 *      when a HEIC file is actually picked.
 */
export function isHeic(file: File): boolean {
  return /image\/hei[cf]/i.test(file.type) || /\.(heic|heif)$/i.test(file.name);
}

function jpegName(file: File) {
  return file.name.replace(/\.(heic|heif)$/i, '') + '.jpg';
}

async function convertNatively(file: File): Promise<File | null> {
  try {
    const bitmap = await createImageBitmap(file);
    const canvas = document.createElement('canvas');
    canvas.width = bitmap.width;
    canvas.height = bitmap.height;
    canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.9));
    return blob ? new File([blob], jpegName(file), { type: 'image/jpeg', lastModified: Date.now() }) : null;
  } catch {
    return null; // this browser can't decode HEIC itself
  }
}

export async function convertHeicToJpeg(file: File): Promise<File> {
  const native = await convertNatively(file);
  if (native) return native;
  const { heicTo } = await import('heic-to');
  const blob = await heicTo({ blob: file, type: 'image/jpeg', quality: 0.9 });
  return new File([blob], jpegName(file), { type: 'image/jpeg', lastModified: Date.now() });
}

/** Returns a browser-displayable file (converts HEIC; passes everything else through). */
export async function toDisplayableImage(file: File): Promise<File> {
  if (!isHeic(file)) return file;
  try {
    return await convertHeicToJpeg(file);
  } catch (error) {
    console.error('HEIC conversion failed:', error instanceof Error ? error.message : JSON.stringify(error));
    throw new Error(
      "We couldn't convert this iPhone photo (HEIC). Please export it as a JPEG and try again."
    );
  }
}
