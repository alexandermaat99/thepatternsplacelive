'use client';

import { useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { createClient } from '@/lib/supabase/client';
import { Barcode, Download, RefreshCw } from 'lucide-react';

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

