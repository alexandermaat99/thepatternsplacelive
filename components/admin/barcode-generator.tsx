'use client';

import { useMemo, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
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

function drawBarcodeWithRotatedText(value: string) {
  const temp = document.createElement('canvas');
  JsBarcode(temp, value, BARCODE_OPTIONS);
  const barWidth = temp.width;
  const barHeight = temp.height;

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
  ctx.font = '18px sans-serif';
  ctx.fillStyle = '#000';
  ctx.fillText(value, 0, 0);
  ctx.restore();

  return canvas;
}

type BarcodeItem = { value: string; dataUrl: string };

export function BarcodeGenerator() {
  const [inputValue, setInputValue] = useState('');
  const [items, setItems] = useState<BarcodeItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const parsedCount = useMemo(() => parseValues(inputValue).length, [inputValue]);

  const generate = () => {
    const values = parseValues(inputValue);
    if (!values.length) {
      setError('Please enter at least one SKU (comma-separated for multiple).');
      return;
    }

    setError(null);
    setIsGenerating(true);

    try {
      const generated: BarcodeItem[] = values.map(value => {
        const canvas = drawBarcodeWithRotatedText(value);
        return { value, dataUrl: canvas.toDataURL('image/png', 1) };
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
        const value = items[i].value;
        const canvas = drawBarcodeWithRotatedText(value);
        await new Promise<void>(resolve => {
          canvas.toBlob(blob => {
            if (!blob) return resolve();
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${value.replace(/[^A-Za-z0-9_-]/g, '_').slice(0, 80)}.png`;
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
          <div className="space-y-2">
            <Label htmlFor="barcode-input">SKUs</Label>
            <Textarea
              id="barcode-input"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
              onKeyDown={e => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault();
                  generate();
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
            <Button type="button" onClick={generate} disabled={isGenerating}>
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
              {items.map(item => (
                <div key={item.value} className="rounded-lg border bg-white p-3">
                  <img src={item.dataUrl} alt={`Barcode ${item.value}`} className="w-full h-auto" />
                  <p className="mt-2 text-xs font-mono text-center text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

