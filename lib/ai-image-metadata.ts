/**
 * Looks for labels that AI image tools write into the files they create:
 *   - IPTC "digital source type" trainedAlgorithmicMedia (also used inside
 *     C2PA Content Credentials by OpenAI, Adobe Firefly, Google and others)
 *   - Stable Diffusion / ComfyUI generation settings in PNG text chunks
 *
 * Runs in the browser on the ORIGINAL file, before compression strips
 * metadata. A missing label proves nothing (labels are easy to remove), and a
 * label can also mean an AI-edited photo, so a hit only flags the listing for
 * a person to review. It never blocks an upload.
 *
 * Plain C2PA without an AI source type is NOT flagged: some phone cameras
 * sign every photo with C2PA.
 */
const MARKERS: { label: string; test: (text: string) => boolean }[] = [
  {
    label: 'IPTC/C2PA: compositeWithTrainedAlgorithmicMedia (AI-edited)',
    test: t => t.includes('compositeWithTrainedAlgorithmicMedia'),
  },
  {
    label: 'IPTC/C2PA: trainedAlgorithmicMedia (AI-generated)',
    test: t => t.split('compositeWithTrainedAlgorithmicMedia').join('').includes('trainedAlgorithmicMedia'),
  },
  {
    label: 'Stable Diffusion generation settings',
    test: t => /Steps: \d+, Sampler: /.test(t),
  },
  {
    label: 'ComfyUI workflow',
    test: t => t.includes('"class_type"') && t.includes('KSampler'),
  },
];

/** Returns the labels found in the file (empty if none, or if it can't be read). */
export async function detectAiImageLabels(file: Blob): Promise<string[]> {
  try {
    const text = new TextDecoder('latin1').decode(await file.arrayBuffer());
    return MARKERS.filter(m => m.test(text)).map(m => m.label);
  } catch {
    return [];
  }
}
