import { compressImage } from '@/lib/image-compression';

/**
 * Most fabric photos are a few hundred KB. Those rarely benefited from the old
 * "only compress if > 5 MB" split; sharp vs grainy on the site was more about
 * display (Next/Image quality) than upload size. Re-encoding already-small
 * JPEGs/WebPs adds softness, so we skip when the file is already modest.
 */
const SKIP_REENCODE_MAX_BYTES = 1.5 * 1024 * 1024;

export const FABRIC_UPLOAD_OPTIONS = {
  maxWidthOrHeight: 1920,
  maxSizeMB: 5,
  initialQuality: 0.88,
  maxIteration: 12,
  useWebWorker: false,
} as const;

function isSmallJpegOrWebp(file: File) {
  const t = (file.type || '').toLowerCase();
  return t === 'image/jpeg' || t === 'image/jpg' || t === 'image/webp';
}

export async function prepareFabricPhotoForUpload(file: File): Promise<File> {
  if (file.size <= SKIP_REENCODE_MAX_BYTES && isSmallJpegOrWebp(file)) {
    return file;
  }
  return compressImage(file, { ...FABRIC_UPLOAD_OPTIONS });
}
