'use client';

import { useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { Barcode, Download, FileDown, RefreshCw } from 'lucide-react';

const TEXT_STRIP_WIDTH = 44;
const BARCODE_OPTIONS = {
  format: 'CODE128',
  displayValue: false,
  fontSize: 18,
  margin: 10,
  background: 'rgba(0,0,0,0)',
  lineColor: '#000000',
} as const;

function parseValues(str: string) {
  return (str || '')
    .split(/[\s,]+/)
    .map(s => s.trim().toUpperCase())
    .filter(Boolean);
}

/** CODE128 gets huge / slow with long strings; SKUs are short. */
const MAX_BARCODE_CHARS = 64;

function asciiSafeForCode128(s: string): string {
  return [...s]
    .map(c => {
      const code = c.charCodeAt(0);
      if (code >= 32 && code <= 126) return c;
      return ' ';
    })
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function prepareBarcodePayload(raw: string): { payload: string; truncated: boolean } {
  const cleaned = asciiSafeForCode128(raw) || '?';
  if (cleaned.length <= MAX_BARCODE_CHARS) {
    return { payload: cleaned, truncated: false };
  }
  return { payload: cleaned.slice(0, MAX_BARCODE_CHARS), truncated: true };
}

/** Let React paint "Generating…" before heavy canvas work blocks the main thread. */
function flushUI(): Promise<void> {
  return new Promise(resolve => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

/** US Letter in PDF points (72 pt/in). */
const LETTER_W = 612;
const LETTER_H = 792;
const PDF_MARGIN = 36;
const PDF_COL_GAP = 14;
const PDF_ROW_GAP = 18;
const PDF_COLS = 2;
const PDF_CAPTION_SIZE = 8;
const PDF_CAPTION_LEADING = 10;
/** Keep each barcode image from dominating vertical space. */
const PDF_MAX_IMAGE_H = 108;

/**
 * Decode a canvas data URL to PNG bytes without `fetch`.
 * `fetch(data:...)` often fails with "Failed to fetch" under CSP or in some browsers.
 */
function dataUrlToUint8Array(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(',');
  if (comma === -1) throw new Error('Invalid data URL');
  const header = dataUrl.slice(0, comma);
  const body = dataUrl.slice(comma + 1);
  if (header.includes(';base64')) {
    const binary = atob(body);
    const out = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      out[i] = binary.charCodeAt(i);
    }
    return out;
  }
  const decoded = decodeURIComponent(body);
  const out = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i += 1) {
    out[i] = decoded.charCodeAt(i);
  }
  return out;
}

function wrapLines(text: string, maxChars: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  const lines: string[] = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length <= maxChars) {
      line = next;
    } else {
      if (line) lines.push(line);
      line = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** Bars and the vertical strip both use the SKU only. */
function drawBarcodeWithRotatedText(barcodeSku: string) {
  const temp = document.createElement('canvas');
  const { payload } = prepareBarcodePayload(barcodeSku);
  if (!payload.length) {
    throw new Error('Barcode text is empty after cleaning.');
  }
  JsBarcode(temp, payload, BARCODE_OPTIONS);
  const barWidth = temp.width;
  const barHeight = temp.height;

  const fontSize =
    payload.length > 48 ? 11 : payload.length > 36 ? 13 : payload.length > 24 ? 15 : 18;

  const canvas = document.createElement('canvas');
  canvas.width = barWidth + TEXT_STRIP_WIDTH;
  canvas.height = barHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Could not get canvas context');

  ctx.drawImage(temp, 0, 0);
  ctx.save();
  ctx.translate(canvas.width - TEXT_STRIP_WIDTH / 2, barHeight / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `${fontSize}px sans-serif`;
  ctx.fillStyle = '#000';
  ctx.fillText(payload, 0, 0);
  ctx.restore();

  return canvas;
}

type BarcodeItem = {
  barcodeSku: string;
  /** Caption under preview (includes fabric name when lookup is on). */
  displayLabel: string;
  filenameBase: string;
  fileSuffix: string;
  dataUrl: string;
};

export function BarcodeGenerator() {
  const [inputValue, setInputValue] = useState('');
  /** When true, caption under preview includes fabric name from inventory (bars + side text stay SKU). */
  const [showFabricNames, setShowFabricNames] = useState(false);
  const [items, setItems] = useState<BarcodeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isPdfExporting, setIsPdfExporting] = useState(false);
  const parsedCount = useMemo(() => parseValues(inputValue).length, [inputValue]);

  const generate = async () => {
    const skus = parseValues(inputValue);
    if (!skus.length) {
      setError('Please enter at least one SKU (comma-separated for multiple).');
      return;
    }

    setError(null);
    setIsGenerating(true);
    await flushUI();

    try {
      let rows: { barcodeSku: string; displayLabel: string; filenameBase: string }[];

      if (!showFabricNames) {
        rows = skus.map(sku => {
          const { truncated } = prepareBarcodePayload(sku);
          return {
            barcodeSku: sku,
            displayLabel: truncated
              ? `${sku} (barcode uses first ${MAX_BARCODE_CHARS} chars only)`
              : sku,
            filenameBase: sku,
          };
        });
      } else {
        const supabase = createClient();
        const LOOKUP_MS = 25_000;
        let data: { sku: string; name: string | null }[] | null = null;
        let qErr: { message: string } | null = null;
        try {
          const res = await Promise.race([
            supabase.from('fabric').select('sku, name').in('sku', skus),
            new Promise<never>((_, reject) =>
              setTimeout(() => reject(new Error(`Inventory lookup timed out after ${LOOKUP_MS / 1000}s`)), LOOKUP_MS)
            ),
          ]);
          data = res.data;
          qErr = res.error;
        } catch (e) {
          setError(e instanceof Error ? e.message : String(e));
          return;
        }

        if (qErr) {
          setError(qErr.message);
          return;
        }

        const bySku = new Map<string, { sku: string; name: string | null }>();
        for (const row of data ?? []) {
          bySku.set(row.sku.trim().toUpperCase(), row);
        }

        rows = skus.map(sku => {
          const row = bySku.get(sku);
          if (!row) {
            return {
              barcodeSku: sku,
              displayLabel: `${sku} — not in inventory`,
              filenameBase: sku,
            };
          }
          const name = row.name?.trim();
          if (!name) {
            return {
              barcodeSku: sku,
              displayLabel: `${sku} — no name on file`,
              filenameBase: sku,
            };
          }
          return {
            barcodeSku: sku,
            displayLabel: `${sku} — ${name}`,
            filenameBase: sku,
          };
        });
      }

      const fileSuffix = showFabricNames ? '_labeled' : '';
      const generated: BarcodeItem[] = rows.map(r => {
        const canvas = drawBarcodeWithRotatedText(r.barcodeSku);
        return { ...r, fileSuffix, dataUrl: canvas.toDataURL('image/png', 1) };
      });
      setItems(generated);
    } catch (e) {
      setError(`Invalid barcode value: ${e instanceof Error ? e.message : String(e)}`);
    } finally {
      setIsGenerating(false);
    }
  };

  const downloadPng = async () => {
    if (!items.length) return;
    setIsDownloading(true);
    try {
      for (let i = 0; i < items.length; i += 1) {
        const item = items[i];
        const canvas = drawBarcodeWithRotatedText(item.barcodeSku);
        const safe = item.filenameBase.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80);
        await new Promise<void>(resolve => {
          canvas.toBlob(blob => {
            if (!blob) return resolve();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${safe}${item.fileSuffix}.png`;
            a.click();
            URL.revokeObjectURL(url);
            resolve();
          }, 'image/png', 1);
        });
      }
    } finally {
      setIsDownloading(false);
    }
  };

  const exportLetterPdf = async () => {
    if (!items.length) return;
    setIsPdfExporting(true);
    await flushUI();
    try {
      const pdfDoc = await PDFDocument.create();
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const innerW = LETTER_W - 2 * PDF_MARGIN;
      const cellW = (innerW - PDF_COL_GAP) / PDF_COLS;

      const pngImages = await Promise.all(
        items.map(item => pdfDoc.embedPng(dataUrlToUint8Array(item.dataUrl)))
      );

      let page = pdfDoc.addPage([LETTER_W, LETTER_H]);
      let rowTopY = LETTER_H - PDF_MARGIN;
      let i = 0;

      while (i < items.length) {
        const remaining = items.length - i;
        const rowCount = Math.min(PDF_COLS, remaining);
        const rowIndices = Array.from({ length: rowCount }, (_, k) => i + k);

        const placed = rowIndices.map(idx => {
          const png = pngImages[idx];
          let scale = (cellW - 8) / png.width;
          if (png.height * scale > PDF_MAX_IMAGE_H) {
            scale = PDF_MAX_IMAGE_H / png.height;
          }
          const drawW = png.width * scale;
          const drawH = png.height * scale;
          const caption = items[idx].displayLabel;
          const maxChars = Math.max(12, Math.floor(cellW / (PDF_CAPTION_SIZE * 0.55)));
          const captionLines = wrapLines(caption, maxChars);
          const captionH =
            captionLines.length > 0 ? captionLines.length * PDF_CAPTION_LEADING + 4 : 0;
          return { idx, png, drawW, drawH, captionLines, captionH };
        });

        const rowImageH = Math.max(...placed.map(p => p.drawH));
        const rowCaptionH = Math.max(...placed.map(p => p.captionH));
        const rowH = rowImageH + rowCaptionH;
        const minBottom = PDF_MARGIN;
        const pageTopY = LETTER_H - PDF_MARGIN;
        const rowFitsFromCurrentTop = rowTopY - rowH >= minBottom;
        const rowTallerThanFullPage = rowH > pageTopY - minBottom;

        if (!rowFitsFromCurrentTop && !rowTallerThanFullPage) {
          page = pdfDoc.addPage([LETTER_W, LETTER_H]);
          rowTopY = pageTopY;
          continue;
        }
        /** If row is taller than one page, still draw from the top of the current page (rare). */
        if (rowTallerThanFullPage && rowTopY < pageTopY - 0.5) {
          page = pdfDoc.addPage([LETTER_W, LETTER_H]);
          rowTopY = pageTopY;
        }

        for (let c = 0; c < placed.length; c += 1) {
          const p = placed[c];
          const cellLeft = PDF_MARGIN + c * (cellW + PDF_COL_GAP);
          const imgX = cellLeft + (cellW - p.drawW) / 2;
          const imgBottom = rowTopY - p.drawH;
          page.drawImage(p.png, {
            x: imgX,
            y: imgBottom,
            width: p.drawW,
            height: p.drawH,
          });

          let capY = imgBottom - 6;
          for (const line of p.captionLines) {
            capY -= PDF_CAPTION_LEADING;
            const textW = font.widthOfTextAtSize(line, PDF_CAPTION_SIZE);
            const textX = cellLeft + (cellW - textW) / 2;
            page.drawText(line, {
              x: Math.max(cellLeft, textX),
              y: capY,
              size: PDF_CAPTION_SIZE,
              font,
              color: rgb(0.15, 0.15, 0.15),
              maxWidth: cellW,
            });
          }
        }

        i += rowCount;
        rowTopY -= rowH + PDF_ROW_GAP;
      }

      const bytes = await pdfDoc.save();
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const stamp = new Date().toISOString().slice(0, 10);
      a.download = `fabric-barcodes-${stamp}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(
        `Could not build PDF: ${e instanceof Error ? e.message : String(e)}`
      );
    } finally {
      setIsPdfExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Barcode className="h-5 w-5" />
            Barcode Generator
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between rounded-lg border p-3 bg-muted/30">
            <div className="space-y-1">
              <Label htmlFor="encode-names" className="text-sm font-medium cursor-pointer">
                Show fabric name on label
              </Label>
              <p className="text-xs text-muted-foreground max-w-xl">
                Off: only the SKU appears on the label. On: barcode and side text stay the SKU; the line under
                the preview adds the fabric name from inventory when found.
              </p>
            </div>
            <Switch
              id="encode-names"
              checked={showFabricNames}
              onCheckedChange={checked => {
                setShowFabricNames(checked);
                setItems([]);
                setError(null);
              }}
              aria-label="Show fabric name under preview only; barcode and side text stay SKU"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="barcode-input">{showFabricNames ? 'SKUs to look up' : 'SKUs'}</Label>
            <Textarea
              id="barcode-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  void generate();
                }
              }}
              placeholder="PDP002, PACG003, IBMG005"
              rows={4}
            />
            <p className="text-xs text-muted-foreground">
              Enter one or many SKUs (comma, space, or newline separated). Parsed: {parsedCount}
            </p>
          </div>

          {error && <p className="text-sm text-destructive bg-destructive/10 rounded p-2">{error}</p>}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void generate()} disabled={isGenerating}>
              <RefreshCw className="h-4 w-4 mr-2" />
              {isGenerating ? 'Generating...' : 'Generate'}
            </Button>
            <Button type="button" variant="outline" onClick={downloadPng} disabled={!items.length || isDownloading}>
              <Download className="h-4 w-4 mr-2" />
              {isDownloading ? 'Downloading...' : 'Download PNGs'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => void exportLetterPdf()}
              disabled={!items.length || isPdfExporting || isDownloading}
            >
              <FileDown className="h-4 w-4 mr-2" />
              {isPdfExporting ? 'Building PDF…' : 'Letter PDF'}
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setItems([]);
                setError(null);
              }}
              disabled={!items.length}
            >
              Clear results
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preview ({items.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {items.length === 0 ? (
            <p className="text-muted-foreground text-sm">Generate barcodes to preview them here.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {items.map((item, i) => (
                <div key={`${item.filenameBase}-${i}`} className="rounded-lg border bg-white p-3">
                  <img
                    src={item.dataUrl}
                    alt={`Barcode ${item.displayLabel}`}
                    className="w-full h-auto"
                  />
                  <p className="mt-2 text-xs text-center text-foreground leading-snug">{item.displayLabel}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

