/** Reasons shoppers can pick in "Report this listing". */
export const REPORT_REASONS = [
  'Looks AI-generated',
  'Copied or stolen design',
  'Not a pattern (a service or something else)',
  'Misleading or inaccurate',
  'Spam or offensive',
  'Something else',
] as const;
export type ReportReason = (typeof REPORT_REASONS)[number];

export type AiImageFlag = { url: string; fileName: string; labels: string[] };

/**
 * After a listing is saved: send AI-labeled photos that are still on the
 * listing to the admin review queue. Fire-and-forget; never blocks saving.
 */
export function sendAiImageFlags(productId: string, flags: AiImageFlag[], currentImages: string[]) {
  const images = flags.filter(f => currentImages.includes(f.url));
  if (images.length === 0) return;
  fetch('/api/listings/image-flags', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ productId, images: images.map(({ fileName, labels }) => ({ fileName, labels })) }),
  }).catch(() => {});
}
