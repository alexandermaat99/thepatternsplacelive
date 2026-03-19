'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { FabricPhotoUpload } from '@/components/admin/fabric-photo-upload';
import type { Fabric } from '@/types/fabric';
import { formatBoltLabel, parseFabricSku } from '@/lib/fabric-sku';
import { Plus, Pencil, Ruler, Trash2, X, CopyPlus, ScanLine } from 'lucide-react';
import Image from 'next/image';
import venmoQrCode from '@/assets/venmoCode.png';

interface FabricInventoryProps {
  initialFabric: Fabric[];
  userId: string;
}

const emptyForm = {
  sku: '',
  name: '',
  description: '',
  weave: '',
  fiber: '',
  width: '',
  current_quantity: '',
  purchase_quantity: '',
  buy_price: '',
  sell_price: '',
  photo_url: null as string | null,
};

export function FabricInventory({ initialFabric, userId }: FabricInventoryProps) {
  const router = useRouter();
  const [fabric, setFabric] = useState<Fabric[]>(initialFabric);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sku: string; name: string | null } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  // Market scan flow (barcode scanners usually type SKU + Enter)
  const [marketOpen, setMarketOpen] = useState(false);
  const [scanValue, setScanValue] = useState('');
  const [scanError, setScanError] = useState<string | null>(null);
  const [scannedFabric, setScannedFabric] = useState<Fabric | null>(null);
  const [sellQuantity, setSellQuantity] = useState<string>('1');
  const [receiptEmail, setReceiptEmail] = useState<string>('');
  const [sellError, setSellError] = useState<string | null>(null);
  const [selling, setSelling] = useState(false);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<'venmo' | 'stripe' | 'cash' | null>(null);
  const scanInputRef = useRef<HTMLInputElement>(null);

  // Camera barcode scanning (mobile) – no dependencies, uses BarcodeDetector when available
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraRunning, setCameraRunning] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const cameraStreamRef = useRef<MediaStream | null>(null);
  const cameraRafRef = useRef<number | null>(null);

  const sortedFabric = [...fabric].sort((a, b) => {
    const pa = parseFabricSku(a.sku);
    const pb = parseFabricSku(b.sku);
    const baseA = pa.ok ? pa.baseSku : a.sku;
    const baseB = pb.ok ? pb.baseSku : b.sku;
    if (baseA < baseB) return -1;
    if (baseA > baseB) return 1;
    const boltA = pa.ok ? pa.boltIndex : 0;
    const boltB = pb.ok ? pb.boltIndex : 0;
    return boltA - boltB;
  });

  const sellTotal = useMemo(() => {
    if (!scannedFabric?.sell_price) return null;
    const q = Number(sellQuantity);
    if (!Number.isFinite(q) || q <= 0) return null;
    return Number(scannedFabric.sell_price) * q;
  }, [scannedFabric?.sell_price, sellQuantity]);

  useEffect(() => {
    if (!marketOpen) return;
    const t = setTimeout(() => scanInputRef.current?.focus(), 50);
    return () => clearTimeout(t);
  }, [marketOpen]);

  const isProbablyMobile = () => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia?.('(pointer:coarse)')?.matches ||
      /Android|iPhone|iPad|iPod/i.test(navigator.userAgent)
    );
  };

  const stopCamera = () => {
    if (cameraRafRef.current != null) {
      cancelAnimationFrame(cameraRafRef.current);
      cameraRafRef.current = null;
    }
    if (cameraStreamRef.current) {
      cameraStreamRef.current.getTracks().forEach(t => t.stop());
      cameraStreamRef.current = null;
    }
    setCameraRunning(false);
  };

  const startCameraScan = async () => {
    // Must be triggered by a user gesture to reliably show permission prompt on mobile.
    try {
      setCameraError(null);
      setCameraRunning(true);

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        setCameraError('Camera scanning requires HTTPS (or localhost).');
        setCameraRunning(false);
        return;
      }

      if (!navigator?.mediaDevices?.getUserMedia) {
        setCameraError('Camera not available in this browser.');
        setCameraRunning(false);
        return;
      }

      const Detector = (globalThis as any).BarcodeDetector as
        | (new (opts?: { formats?: string[] }) => { detect: (src: any) => Promise<any[]> })
        | undefined;

      if (!Detector) {
        setCameraError('Barcode scanning is not supported in this browser. Use manual entry.');
        setCameraRunning(false);
        return;
      }

      const detector = new Detector({
        formats: ['ean_13', 'ean_8', 'upc_a', 'upc_e', 'code_128', 'code_39', 'qr_code'],
      });

      const video = videoRef.current;
      if (!video) {
        setCameraError('Camera element not ready.');
        setCameraRunning(false);
        return;
      }

      // Prefer back camera on phones
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      });

      cameraStreamRef.current = stream;
      video.srcObject = stream;
      // iOS Safari sometimes needs the attribute set explicitly
      video.setAttribute('playsinline', 'true');
      await video.play();

      let lastScanAt = 0;
      const scan = async (now: number) => {
        cameraRafRef.current = requestAnimationFrame(scan);
        if (now - lastScanAt < 250) return;
        lastScanAt = now;

        try {
          const results = await detector.detect(video);
          const raw = results?.[0]?.rawValue;
          const text = typeof raw === 'string' ? raw.trim() : '';
          if (!text) return;

          stopCamera();
          setCameraOpen(false);
          setMarketOpen(true);
          setScanValue(text);
          await lookupSku(text);
        } catch {
          // ignore intermittent detect errors
        }
      };

      cameraRafRef.current = requestAnimationFrame(scan);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Failed to start camera scanner.';
      setCameraError(msg);
      stopCamera();
    }
  };

  useEffect(() => {
    // cleanup on unmount
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openAdd = () => {
    setEditingSku(null);
    setForm(emptyForm);
    setError(null);
    setDialogOpen(true);
  };

  const openAddWithPreset = (preset: Partial<typeof emptyForm>) => {
    setEditingSku(null);
    setForm({ ...emptyForm, ...preset });
    setError(null);
    setDialogOpen(true);
  };

  const openEdit = (row: Fabric) => {
    setEditingSku(row.sku);
    setForm({
      sku: row.sku,
      name: row.name ?? '',
      description: row.description ?? '',
      weave: row.weave ?? '',
      fiber: row.fiber ?? '',
      width: row.width != null ? String(row.width) : '',
      current_quantity: row.current_quantity != null ? String(row.current_quantity) : '',
      purchase_quantity: row.purchase_quantity != null ? String(row.purchase_quantity) : '',
      buy_price: row.buy_price != null ? String(row.buy_price) : '',
      sell_price: row.sell_price != null ? String(row.sell_price) : '',
      photo_url: row.photo_url,
    });
    setError(null);
    setDialogOpen(true);
  };

  const getNextBoltSkuForBase = (baseSku: string) => {
    const indices = fabric
      .map(f => parseFabricSku(f.sku))
      .filter((p): p is Extract<typeof p, { ok: true }> => p.ok && p.baseSku === baseSku)
      .map(p => p.boltIndex);

    const nextIndex = indices.length ? Math.max(...indices) + 1 : 0;
    if (nextIndex === 0) return baseSku;
    if (nextIndex > 9) return null; // optional 4th digit only supports 0-9
    return `${baseSku}${nextIndex}`;
  };

  const addNextBoltFromRow = (row: Fabric) => {
    const parsed = parseFabricSku(row.sku);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }

    const nextSku = getNextBoltSkuForBase(parsed.baseSku);
    if (!nextSku) {
      setError(`Too many bolts for ${parsed.baseSku}. Bolt suffix only supports 0–9.`);
      return;
    }

    openAddWithPreset({
      sku: nextSku,
      name: row.name ?? '',
      description: row.description ?? '',
      weave: row.weave ?? '',
      fiber: row.fiber ?? '',
      width: row.width != null ? String(row.width) : '',
      buy_price: row.buy_price != null ? String(row.buy_price) : '',
      sell_price: row.sell_price != null ? String(row.sell_price) : '',
      photo_url: row.photo_url,
      current_quantity: '',
      purchase_quantity: '',
    });
  };

  const openMarket = () => {
    setMarketOpen(true);
    setScanValue('');
    setScanError(null);
    setScannedFabric(null);
    setSellQuantity('1');
    setReceiptEmail('');
    setSellError(null);
    setPaymentOpen(false);
    setSelectedPayment(null);
  };

  const lookupSku = async (skuRaw: string) => {
    const sku = skuRaw.trim();
    if (!sku) return;
    setScanError(null);
    setSellError(null);
    setScannedFabric(null);
    setSellQuantity('1');
    // keep receiptEmail

    const parsed = parseFabricSku(sku);
    if (!parsed.ok) {
      setScanError(parsed.error);
      return;
    }

    try {
      const supabase = createClient();
      const { data, error: fetchError } = await supabase
        .from('fabric')
        .select('*')
        .eq('sku', parsed.normalizedSku)
        .maybeSingle();

      if (fetchError) throw fetchError;
      if (!data) {
        setScanError(`No fabric found for SKU ${parsed.normalizedSku}`);
        return;
      }
      setScannedFabric(data as Fabric);
      // Show payment options immediately after a successful scan
      setPaymentOpen(true);
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to look up SKU';
      setScanError(message);
    }
  };

  const validateSaleInputs = (): boolean => {
    if (!scannedFabric) return false;

    const q = Number(sellQuantity);
    if (!Number.isFinite(q) || q <= 0) {
      setSellError('Enter a quantity greater than 0.');
      return false;
    }
    if (scannedFabric.current_quantity == null) {
      setSellError('This fabric has no current quantity set.');
      return false;
    }
    if (q > Number(scannedFabric.current_quantity)) {
      setSellError('Not enough inventory for that quantity.');
      return false;
    }

    const email = receiptEmail.trim();
    // quick client-side check; server validates too
    if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setSellError('Enter a valid email for the receipt.');
      return false;
    }
    return true;
  };

  const completeSale = async () => {
    if (!scannedFabric) return;

    if (!selectedPayment) {
      setSellError('Select Venmo or Stripe payment option.');
      return;
    }

    setSellError(null);
    const ok = validateSaleInputs();
    if (!ok) return;

    const q = Number(sellQuantity);
    const email = receiptEmail.trim();

    setSelling(true);
    try {
      const res = await fetch('/api/fabric/sale', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sku: scannedFabric.sku, quantity: q, receiptEmail: email }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSellError(data?.error || 'Failed to complete sale');
        return;
      }

      const newQty = Number(data.newQuantity);
      setFabric(prev =>
        prev.map(f => (f.sku === scannedFabric.sku ? { ...f, current_quantity: newQty } : f))
      );
      setScannedFabric(prev => (prev ? { ...prev, current_quantity: newQty } : prev));

      if (data.emailSent === false && data.emailError) {
        setSellError(`Sale completed but receipt email failed: ${data.emailError}`);
        return;
      }

      // Ready for next scan quickly
      setScanValue('');
      setScannedFabric(null);
      setSellQuantity('1');
      setReceiptEmail('');
      setPaymentOpen(false);
      setSelectedPayment(null);
      setTimeout(() => scanInputRef.current?.focus(), 0);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to complete sale';
      setSellError(message);
    } finally {
      setSelling(false);
    }
  };

  const copyTotalToClipboard = async () => {
    try {
      const text = sellTotal != null ? `$${sellTotal.toFixed(2)}` : '';
      if (!text) return;
      await navigator.clipboard.writeText(text);
    } catch {
      // non-fatal: clipboard may be unavailable depending on browser permissions
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const parsed = parseFabricSku(form.sku);
      if (!parsed.ok) {
        setError(parsed.error);
        setSaving(false);
        return;
      }

      const row = {
        sku: parsed.normalizedSku,
        name: form.name.trim() || null,
        description: form.description.trim() || null,
        weave: form.weave.trim() || null,
        fiber: form.fiber.trim() || null,
        width: form.width ? Number(form.width) : null,
        current_quantity: form.current_quantity ? Number(form.current_quantity) : null,
        purchase_quantity: form.purchase_quantity ? Number(form.purchase_quantity) : null,
        buy_price: form.buy_price ? Number(form.buy_price) : null,
        sell_price: form.sell_price ? Number(form.sell_price) : null,
        photo_url: form.photo_url,
      };

      if (editingSku) {
        const { error: updateError } = await supabase
          .from('fabric')
          .update({
            name: row.name,
            description: row.description,
            weave: row.weave,
            fiber: row.fiber,
            width: row.width,
            current_quantity: row.current_quantity,
            purchase_quantity: row.purchase_quantity,
            buy_price: row.buy_price,
            sell_price: row.sell_price,
            photo_url: row.photo_url,
          })
          .eq('sku', editingSku);

        if (updateError) throw updateError;
        setFabric(prev => prev.map(f => (f.sku === editingSku ? { ...f, ...row, sku: f.sku } : f)));
      } else {
        // Duplicate protection: prevent inserting an existing SKU
        const { data: existing } = await supabase
          .from('fabric')
          .select('sku')
          .eq('sku', row.sku)
          .maybeSingle();
        if (existing) {
          setError('This SKU already exists. Use a unique SKU or edit the existing fabric.');
          setSaving(false);
          return;
        }
        const { error: insertError } = await supabase.from('fabric').insert(row);
        if (insertError) throw insertError;
        setFabric(prev => [{ ...row, created_at: new Date().toISOString() } as Fabric, ...prev]);
      }
      setDialogOpen(false);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to save';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.from('fabric').delete().eq('sku', deleteConfirm.sku);
      if (err) throw err;
      setFabric(prev => prev.filter(f => f.sku !== deleteConfirm.sku));
      setDeleteConfirm(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to delete';
      setDeleteError(message);
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ruler className="h-7 w-7" />
          Fabric Inventory
        </h1>
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
          <Button
            variant="outline"
            onClick={() => {
              if (isProbablyMobile()) {
                setCameraError(null);
                setCameraRunning(false);
                setCameraOpen(true);
              } else {
                openMarket();
              }
            }}
            className="gap-2 w-full sm:w-auto"
          >
            <ScanLine className="h-4 w-4" />
            Scan barcode
          </Button>
          <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add fabric
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All fabric ({fabric.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {fabric.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No fabric yet. Click &quot;Add fabric&quot; to add your first item.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2 px-2">Photo</th>
                    <th className="text-left py-2 px-2">SKU</th>
                    <th className="text-left py-2 px-2">Bolt</th>
                    <th className="text-left py-2 px-2">Name</th>
                    <th className="text-left py-2 px-2">Weave</th>
                    <th className="text-left py-2 px-2">Fiber</th>
                    <th className="text-right py-2 px-2">Width</th>
                    <th className="text-right py-2 px-2">Qty</th>
                    <th className="text-right py-2 px-2">Buy</th>
                    <th className="text-right py-2 px-2">Sell</th>
                    <th className="w-20" />
                  </tr>
                </thead>
                <tbody>
                  {sortedFabric.map(row => {
                    const parsed = parseFabricSku(row.sku);
                    const boltLabel = parsed.ok ? formatBoltLabel(parsed.boltIndex) : '—';
                    return (
                      <tr key={row.sku} className="border-b hover:bg-muted/50">
                        <td className="py-2 px-2">
                          {row.photo_url ? (
                            <button
                              type="button"
                              onClick={() => setLightboxUrl(row.photo_url)}
                              className="relative w-12 h-12 rounded overflow-hidden bg-muted block cursor-zoom-in hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-1"
                              aria-label="View photo larger"
                            >
                              <Image
                                src={row.photo_url}
                                alt={row.name || row.sku}
                                fill
                                className="object-cover"
                              />
                            </button>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="py-2 px-2 font-mono">{row.sku}</td>
                        <td className="py-2 px-2">{boltLabel}</td>
                        <td className="py-2 px-2">{row.name ?? '—'}</td>
                        <td className="py-2 px-2">{row.weave ?? '—'}</td>
                        <td className="py-2 px-2">{row.fiber ?? '—'}</td>
                        <td className="py-2 px-2 text-right">
                          {row.width != null ? `${row.width}"` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right">{row.current_quantity ?? '—'}</td>
                        <td className="py-2 px-2 text-right">
                          {row.buy_price != null ? `$${Number(row.buy_price).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 text-right">
                          {row.sell_price != null ? `$${Number(row.sell_price).toFixed(2)}` : '—'}
                        </td>
                        <td className="py-2 px-2 flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEdit(row)}
                            aria-label="Edit"
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => addNextBoltFromRow(row)}
                            aria-label="Add next bolt"
                            title="Add next bolt"
                          >
                            <CopyPlus className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setDeleteConfirm({ sku: row.sku, name: row.name });
                              setDeleteError(null);
                            }}
                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                            aria-label="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingSku ? 'Edit fabric' : 'Add fabric'}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{error}</p>
            )}
            <div>
              <Label htmlFor="sku">SKU *</Label>
              <Input
                id="sku"
                value={form.sku}
                onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
                disabled={!!editingSku}
                required
                className="font-mono"
              />
              {!editingSku && form.sku.trim() && (
                <p className="text-xs text-muted-foreground mt-1">
                  {(() => {
                    const p = parseFabricSku(form.sku);
                    if (!p.ok) return p.error;
                    return `Base: ${p.baseSku} • ${formatBoltLabel(p.boltIndex)} (0-based index ${p.boltIndex})`;
                  })()}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>
            <div>
              <Label htmlFor="weave">Weave</Label>
              <Input
                id="weave"
                value={form.weave}
                onChange={e => setForm(f => ({ ...f, weave: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="fiber">Fiber</Label>
              <Input
                id="fiber"
                value={form.fiber}
                onChange={e => setForm(f => ({ ...f, fiber: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="width">Width (inches)</Label>
                <Input
                  id="width"
                  type="number"
                  step="0.1"
                  value={form.width}
                  onChange={e => setForm(f => ({ ...f, width: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="current_quantity">Current quantity</Label>
                <Input
                  id="current_quantity"
                  type="number"
                  step="0.01"
                  value={form.current_quantity}
                  onChange={e => setForm(f => ({ ...f, current_quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="purchase_quantity">Purchase quantity</Label>
                <Input
                  id="purchase_quantity"
                  type="number"
                  step="0.01"
                  value={form.purchase_quantity}
                  onChange={e => setForm(f => ({ ...f, purchase_quantity: e.target.value }))}
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="buy_price">Buy price ($)</Label>
                <Input
                  id="buy_price"
                  type="number"
                  step="0.01"
                  value={form.buy_price}
                  onChange={e => setForm(f => ({ ...f, buy_price: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="sell_price">Sell price ($)</Label>
                <Input
                  id="sell_price"
                  type="number"
                  step="0.01"
                  value={form.sell_price}
                  onChange={e => setForm(f => ({ ...f, sell_price: e.target.value }))}
                />
              </div>
            </div>
            <FabricPhotoUpload
              value={form.photo_url}
              onChange={url => setForm(f => ({ ...f, photo_url: url }))}
              userId={userId}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving ? 'Saving...' : editingSku ? 'Update' : 'Add'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!lightboxUrl} onOpenChange={open => !open && setLightboxUrl(null)}>
        <DialogContent className="max-w-4xl w-[95vw] p-2 border-none bg-black/90 [&>button:not(.lightbox-close)]:hidden">
          <DialogTitle className="sr-only">View fabric photo</DialogTitle>
          <DialogClose
            className="lightbox-close absolute right-2 top-2 z-10 rounded-sm p-1.5 text-white opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </DialogClose>
          {lightboxUrl && (
            <div className="relative w-full flex items-center justify-center min-h-[50vh]">
              <Image
                src={lightboxUrl}
                alt="Fabric"
                width={1200}
                height={1200}
                className="max-h-[85vh] w-auto object-contain"
                unoptimized
              />
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={marketOpen} onOpenChange={setMarketOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Farmers market scan</DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="scanSku">Scan barcode / enter SKU</Label>
              <Input
                id="scanSku"
                ref={scanInputRef}
                value={scanValue}
                onChange={e => setScanValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupSku(scanValue);
                  }
                }}
                placeholder="e.g. PDP0011"
                className="font-mono"
              />
              {scanError && (
                <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                  {scanError}
                </p>
              )}
            </div>

            {scannedFabric && (
              <div className="border rounded-lg p-3 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{scannedFabric.name || scannedFabric.sku}</p>
                    <p className="text-sm text-muted-foreground">
                      SKU: <span className="font-mono">{scannedFabric.sku}</span>
                      {(() => {
                        const p = parseFabricSku(scannedFabric.sku);
                        return p.ok ? ` • ${formatBoltLabel(p.boltIndex)}` : '';
                      })()}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      In stock: {scannedFabric.current_quantity ?? '—'}
                    </p>
                  </div>
                  {scannedFabric.photo_url && (
                    <button
                      type="button"
                      onClick={() => setLightboxUrl(scannedFabric.photo_url)}
                      className="relative w-16 h-16 rounded overflow-hidden bg-muted block cursor-zoom-in"
                      aria-label="View photo larger"
                    >
                      <Image
                        src={scannedFabric.photo_url}
                        alt={scannedFabric.name || scannedFabric.sku}
                        fill
                        className="object-cover"
                      />
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3 items-end">
                  <div>
                    <Label htmlFor="sellQty">Quantity</Label>
                    <Input
                      id="sellQty"
                      type="number"
                      step="1"
                      min="1"
                      value={sellQuantity}
                      onChange={e => setSellQuantity(e.target.value)}
                    />
                  </div>
                  <div>
                    <Label>Price</Label>
                    <div className="h-10 flex items-center rounded-md border px-3 text-sm">
                      {scannedFabric.sell_price != null
                        ? `$${Number(scannedFabric.sell_price).toFixed(2)}`
                        : '—'}
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="receiptEmail">Receipt email</Label>
                  <Input
                    id="receiptEmail"
                    type="email"
                    placeholder="customer@email.com"
                    value={receiptEmail}
                    onChange={e => setReceiptEmail(e.target.value)}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-sm text-rose-500">Total</span>
                  <span className="font-semibold text-rose-500">
                    {sellTotal != null ? `$${sellTotal.toFixed(2)}` : '—'}
                  </span>
                </div>

                {sellError && (
                  <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">
                    {sellError}
                  </p>
                )}

                {paymentOpen && (
                  <div className="mt-3 rounded-lg border bg-muted/20 p-3 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold">Payment options</div>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={
                          selectedPayment === 'venmo'
                            ? 'flex-1 bg-rose-400 text-white border-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'flex-1'
                        }
                        onClick={() => setSelectedPayment('venmo')}
                        disabled={selling}
                      >
                        Venmo
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={
                          selectedPayment === 'stripe'
                            ? 'flex-1 bg-rose-400 text-white border-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'flex-1'
                        }
                        onClick={() => setSelectedPayment('stripe')}
                        disabled={selling}
                      >
                        Stripe
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className={
                          selectedPayment === 'cash'
                            ? 'flex-1 bg-rose-400 text-white border-rose-400 hover:bg-rose-500 hover:text-white'
                            : 'flex-1'
                        }
                        onClick={() => setSelectedPayment('cash')}
                        disabled={selling}
                      >
                        Cash
                      </Button>
                    </div>

                    {selectedPayment === 'venmo' && (
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-center text-rose-400">
                          {sellTotal != null ? `Total: $${sellTotal.toFixed(2)}` : 'Total: —'}
                        </div>
                        <div className="flex items-center justify-center">
                          <div className="rounded-md border bg-white p-2 shadow-sm">
                            <Image src={venmoQrCode} alt="Venmo QR code" width={240} height={240} />
                          </div>
                        </div>
                      </div>
                    )}

                    {selectedPayment === 'stripe' && (
                      <div className="space-y-3">
                        <div className="text-lg font-bold text-center text-rose-400">
                          {sellTotal != null ? `Total: $${sellTotal.toFixed(2)}` : 'Total: —'}
                        </div>

                        <div className="grid gap-2">
                          <a
                            href="https://dashboard.stripe.com/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center justify-center rounded-md border bg-background px-3 py-2 text-sm font-medium hover:bg-accent transition-colors w-full"
                          >
                            Open Stripe Dashboard
                          </a>
                          <Button type="button" variant="outline" size="sm" onClick={copyTotalToClipboard}>
                            Copy total
                          </Button>
                        </div>

                        <div className="text-sm text-muted-foreground text-center">
                          Charge the card in Stripe, then click &ldquo;Payment complete&rdquo;.
                        </div>
                      </div>
                    )}

                    {selectedPayment === 'cash' && (
                      <div className="text-lg font-bold text-center text-rose-400">
                        {sellTotal != null ? `Total: $${sellTotal.toFixed(2)}` : 'Total: —'}
                      </div>
                    )}

                    <div className="flex items-center justify-end gap-2 pt-1">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setScannedFabric(null);
                          setScanValue('');
                          setSellQuantity('1');
                          setReceiptEmail('');
                          setScanError(null);
                          setSellError(null);
                          setPaymentOpen(false);
                          setSelectedPayment(null);
                          setTimeout(() => scanInputRef.current?.focus(), 0);
                        }}
                        disabled={selling}
                      >
                        Cancel
                      </Button>

                      <Button
                        type="button"
                        onClick={completeSale}
                        disabled={selling || !selectedPayment}
                        title={!selectedPayment ? 'Select a payment option first' : undefined}
                        size="lg"
                        className="w-full bg-rose-400 text-white border-rose-400 hover:bg-rose-500 hover:text-white"
                        variant="outline"
                      >
                        {selling ? 'Completing...' : 'Payment complete'}
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Camera scanner dialog (mobile) */}
      <Dialog
        open={cameraOpen}
        onOpenChange={open => {
          if (!open) {
            setCameraOpen(false);
            setCameraError(null);
            stopCamera();
          } else {
            setCameraOpen(true);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Scan barcode</DialogTitle>
          </DialogHeader>

          {cameraError && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{cameraError}</p>
          )}

          <div className="space-y-2">
            <div className="text-xs text-muted-foreground">
              Tap &ldquo;Start camera&rdquo; to request permission, then point at the barcode.
            </div>
            <div className="relative w-full overflow-hidden rounded-md border bg-black">
              <video ref={videoRef} className="w-full h-[320px] object-cover" muted playsInline />
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="w-[75%] h-[40%] rounded-md border-2 border-rose-300/80" />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCameraOpen(false)}>
              Cancel
            </Button>
            <Button
              type="button"
              onClick={startCameraScan}
              disabled={cameraRunning}
              className="bg-rose-400 text-white border-rose-400 hover:bg-rose-500 hover:text-white"
              variant="outline"
            >
              {cameraRunning ? 'Starting…' : 'Start camera'}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setCameraOpen(false);
                openMarket();
              }}
            >
              Enter SKU manually
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={!!deleteConfirm}
        onOpenChange={open => {
          if (!open) {
            setDeleteConfirm(null);
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete fabric?</DialogTitle>
          </DialogHeader>
          {deleteConfirm && (
            <p className="text-sm text-muted-foreground">
              This will permanently remove{' '}
              <strong>{deleteConfirm.name || deleteConfirm.sku}</strong> (SKU:{' '}
              <span className="font-mono">{deleteConfirm.sku}</span>). This cannot be undone.
            </p>
          )}
          {deleteError && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{deleteError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteConfirm(null)}
              disabled={deleting}
            >
              Cancel
            </Button>
            <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
