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

type FabricCardGroup = {
  baseSku: string;
  bolts: Fabric[];
  boltCount: number;
  yardageLeft: number;
  hasQuantity: boolean;
  photo_url: string | null;
  name: string | null;
  sell_price: number | null;
};

export function FabricInventory({ initialFabric, userId }: FabricInventoryProps) {
  const router = useRouter();
  const [fabric, setFabric] = useState<Fabric[]>(initialFabric);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSku, setEditingSku] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [photoUploading, setPhotoUploading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ sku: string; name: string | null } | null>(
    null
  );
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteGroupConfirm, setDeleteGroupConfirm] = useState<{
    baseSku: string;
    skus: string[];
    name: string | null;
  } | null>(null);
  const [deletingGroup, setDeletingGroup] = useState(false);
  const [deleteGroupError, setDeleteGroupError] = useState<string | null>(null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'images'>('images');
  const [selectedFabricGroup, setSelectedFabricGroup] = useState<FabricCardGroup | null>(null);
  const [showAllBoltDetails, setShowAllBoltDetails] = useState(false);
  const [detailsToRestore, setDetailsToRestore] = useState<FabricCardGroup | null>(null);

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
  const [searchDraft, setSearchDraft] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');

  const filteredFabric = useMemo(() => {
    const q = appliedSearch.trim().toUpperCase();
    if (!q) return fabric;
    return fabric.filter(row => {
      const sku = (row.sku || '').toUpperCase();
      const name = (row.name || '').toUpperCase();
      return sku.includes(q) || name.includes(q);
    });
  }, [fabric, appliedSearch]);

  const sortedFabric = [...filteredFabric].sort((a, b) => {
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

  const fabricGroupsForCards = useMemo(() => {
    const groups = new Map<string, Fabric[]>();

    for (const row of filteredFabric) {
      const parsed = parseFabricSku(row.sku);
      const baseSku = parsed.ok ? parsed.baseSku : row.sku;
      const existing = groups.get(baseSku) || [];
      existing.push(row);
      groups.set(baseSku, existing);
    }

    const result: FabricCardGroup[] = Array.from(groups.entries()).map(([baseSku, bolts]) => {
      const sortedBolts = [...bolts].sort((a, b) => {
        const pa = parseFabricSku(a.sku);
        const pb = parseFabricSku(b.sku);
        const boltA = pa.ok ? pa.boltIndex : 0;
        const boltB = pb.ok ? pb.boltIndex : 0;
        return boltA - boltB;
      });

      let hasQuantity = false;
      let yardageLeft = 0;
      for (const b of sortedBolts) {
        if (b.current_quantity != null) {
          hasQuantity = true;
          yardageLeft += Number(b.current_quantity);
        }
      }

      // Prefer a bolt with photo; break ties by highest yardage.
      const representative = [...sortedBolts].sort((a, b) => {
        const aPhoto = a.photo_url ? 1 : 0;
        const bPhoto = b.photo_url ? 1 : 0;
        if (bPhoto !== aPhoto) return bPhoto - aPhoto;
        const aQty = a.current_quantity ?? -Infinity;
        const bQty = b.current_quantity ?? -Infinity;
        return bQty - aQty;
      })[0];

      const photo_url =
        representative?.photo_url ??
        sortedBolts.find(b => b.photo_url)?.photo_url ??
        null;
      const name =
        representative?.name ??
        sortedBolts.find(b => b.name)?.name ??
        null;
      const sell_price =
        representative?.sell_price ??
        (sortedBolts.find(b => b.sell_price != null)?.sell_price ?? null);

      return {
        baseSku,
        bolts: sortedBolts,
        boltCount: sortedBolts.length,
        yardageLeft,
        hasQuantity,
        photo_url,
        name,
        sell_price: sell_price != null ? Number(sell_price) : null,
      };
    });

    result.sort((a, b) => a.baseSku.localeCompare(b.baseSku));
    return result;
  }, [filteredFabric]);

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

  const openAdd = () => {
    setEditingSku(null);
    setForm(emptyForm);
    setError(null);
    setPhotoUploading(false);
    setDialogOpen(true);
  };

  const openAddWithPreset = (preset: Partial<typeof emptyForm>) => {
    setEditingSku(null);
    setForm({ ...emptyForm, ...preset });
    setError(null);
    setPhotoUploading(false);
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
    setPhotoUploading(false);
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
    setDetailsToRestore(null);
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
    const sku = skuRaw.trim().toUpperCase();
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
      setSellError('Enter yards greater than 0.');
      return false;
    }
    if (scannedFabric.current_quantity == null) {
      setSellError('This fabric has no current quantity set.');
      return false;
    }
    if (q > Number(scannedFabric.current_quantity)) {
      setSellError('Not enough inventory for that many yards.');
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
      setSellError('Select a payment option.');
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
        body: JSON.stringify({
          sku: scannedFabric.sku,
          yards: q,
          receiptEmail: email,
          paymentMethod: selectedPayment,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data?.success) {
        setSellError(data?.error || 'Failed to complete sale');
        return;
      }

      const newQty = Number(data.newYards);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (photoUploading) {
      setError('Please wait for the photo upload to finish.');
      setSaving(false);
      return;
    }
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
        // Update the bolt you're editing (everything except photo),
        // then propagate photo_url across all bolts for the same fabric base SKU.
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
          })
          .eq('sku', editingSku);

        if (updateError) throw updateError;

        if (parsed.ok) {
          const { error: photoError } = await supabase
            .from('fabric')
            .update({ photo_url: row.photo_url })
            // baseSku includes the last-3 digits; bolts share that prefix
            .ilike('sku', `${parsed.baseSku}%`);

          if (photoError) throw photoError;
        }

        const baseSku = parsed.ok ? parsed.baseSku : null;
        setFabric(prev =>
          prev.map(f => {
            // Bolt-specific updates
            if (f.sku === editingSku) return { ...f, ...row, sku: f.sku };

            // Photo applies across same base SKU
            if (baseSku) {
              const parsedExisting = parseFabricSku(f.sku);
              if (parsedExisting.ok && parsedExisting.baseSku === baseSku) {
                return { ...f, photo_url: row.photo_url };
              }
            }

            return f;
          })
        );
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

  const handleDeleteGroup = async () => {
    if (!deleteGroupConfirm) return;
    setDeletingGroup(true);
    setDeleteGroupError(null);
    try {
      const supabase = createClient();
      const { error: err } = await supabase
        .from('fabric')
        .delete()
        .in(
          'sku',
          deleteGroupConfirm.skus
        );

      if (err) throw err;

      setFabric(prev =>
        prev.filter(f => !deleteGroupConfirm.skus.includes(f.sku))
      );
      setDeleteGroupConfirm(null);
      setSelectedFabricGroup(null);
      router.refresh();
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : err instanceof Error
            ? err.message
            : 'Failed to delete';
      setDeleteGroupError(message);
    } finally {
      setDeletingGroup(false);
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
          <Button variant="outline" onClick={openMarket} className="gap-2 w-full sm:w-auto">
            <ScanLine className="h-4 w-4" />
            Enter barcode
          </Button>
          <Button onClick={openAdd} className="gap-2 w-full sm:w-auto">
            <Plus className="h-4 w-4" />
            Add fabric
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All fabric ({filteredFabric.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {filteredFabric.length === 0 ? (
            <p className="text-muted-foreground py-8 text-center">
              No fabric yet. Click &quot;Add fabric&quot; to add your first item.
            </p>
          ) : (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto">
                  <Input
                    value={searchDraft}
                    onChange={e => setSearchDraft(e.target.value)}
                    placeholder="Search by SKU or name"
                    className="w-full sm:w-[260px] font-mono"
                    onKeyDown={e => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        setAppliedSearch(searchDraft);
                      }
                    }}
                  />
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setAppliedSearch(searchDraft)}
                      className="whitespace-nowrap"
                    >
                      Search
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        setSearchDraft('');
                        setAppliedSearch('');
                      }}
                      className="whitespace-nowrap"
                    >
                      Clear
                    </Button>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={viewMode === 'table' ? 'default' : 'outline'}
                    onClick={() => setViewMode('table')}
                  >
                    Table
                  </Button>
                  <Button
                    type="button"
                    variant={viewMode === 'images' ? 'default' : 'outline'}
                    onClick={() => setViewMode('images')}
                  >
                    Images
                  </Button>
                </div>
              </div>

              <div className={viewMode === 'table' ? '' : 'hidden'}>
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
              </div>

              <div className={viewMode === 'images' ? '' : 'hidden'}>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {fabricGroupsForCards.map(group => {
                    const yardageText = group.hasQuantity
                      ? Number.isInteger(group.yardageLeft)
                        ? String(group.yardageLeft)
                        : group.yardageLeft.toFixed(2)
                      : '—';
                    const priceText = group.sell_price != null ? `$${group.sell_price.toFixed(2)}/yd` : '—';
                    return (
                      <button
                        key={group.baseSku}
                        type="button"
                        onClick={() => {
                          setSelectedFabricGroup(group);
                          setShowAllBoltDetails(false);
                        }}
                        className="relative text-left group"
                        aria-label={`View ${group.name || group.baseSku} photo`}
                      >
                        <div className="relative aspect-[3/4] rounded-xl overflow-hidden border bg-muted">
                          {group.photo_url ? (
                            <Image
                              src={group.photo_url}
                              alt={group.name || group.baseSku}
                              fill
                              className="object-cover group-hover:scale-[1.02] transition-transform duration-200"
                            />
                          ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm">
                              No photo
                            </div>
                          )}

                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/20 to-transparent" />

                          <div className="absolute bottom-0 left-0 right-0 p-3">
                            <div className="text-xs font-mono text-white/90">{group.baseSku}</div>
                            <div className="font-semibold text-white leading-tight">
                              {group.name ?? '—'}
                            </div>
                            <div className="mt-1 text-xs text-white/90">
                              {group.boltCount} bolts • {yardageText} yd
                            </div>
                            <div className="mt-1 text-sm font-medium text-white">
                              {priceText}
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
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
              onUploadingChange={setPhotoUploading}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving || photoUploading}>
                {saving
                  ? 'Saving...'
                  : photoUploading
                    ? 'Uploading photo...'
                    : editingSku
                      ? 'Update'
                      : 'Add'}
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

      <Dialog
        open={marketOpen}
        onOpenChange={open => {
          setMarketOpen(open);
          if (!open) {
            // Reset sale state
            setScannedFabric(null);
            setScanValue('');
            setSellQuantity('1');
            setReceiptEmail('');
            setScanError(null);
            setSellError(null);
            setPaymentOpen(false);
            setSelectedPayment(null);

            // Restore the fabric details popup if the sale was launched from it.
            if (detailsToRestore) {
              setSelectedFabricGroup(detailsToRestore);
              setShowAllBoltDetails(false);
              setDetailsToRestore(null);
            }
          }
        }}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
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
                onChange={e => setScanValue(e.target.value.toUpperCase())}
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
                    <Label htmlFor="sellQty">Yards</Label>
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
                      <div className="space-y-2">
                        <div className="text-lg font-bold text-center text-rose-400">
                          {sellTotal != null ? `Total: $${sellTotal.toFixed(2)}` : 'Total: —'}
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

      <Dialog
        open={!!selectedFabricGroup}
        onOpenChange={open => {
          if (!open) {
            setSelectedFabricGroup(null);
            setShowAllBoltDetails(false);
          }
        }}
      >
        <DialogContent className="max-w-5xl w-[95vw] p-0 border-none bg-black/90">
          {selectedFabricGroup && (
            <div className="relative p-4">
              <DialogTitle className="sr-only">Fabric details</DialogTitle>
              <DialogClose
                className="absolute right-2 top-1 z-10 rounded-sm p-1 text-white opacity-90 hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-white/50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </DialogClose>

                <div className="grid grid-cols-1 md:grid-cols-[1fr_1.15fr] gap-4">
                <div className="flex flex-col gap-3">
                  <div className="relative rounded-xl overflow-hidden border border-white/10 bg-muted aspect-[3/4]">
                    {selectedFabricGroup.photo_url ? (
                      <Image
                        src={selectedFabricGroup.photo_url}
                        alt={selectedFabricGroup.name || selectedFabricGroup.baseSku}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-white/70">
                        No photo
                      </div>
                    )}
                  </div>

                  <Button
                    type="button"
                    variant="outline"
                    className="w-full bg-transparent border-white/20 text-white hover:bg-white/10"
                    onClick={() => {
                      const representative =
                        selectedFabricGroup.bolts.find(b => b.sku === selectedFabricGroup.baseSku) ||
                        selectedFabricGroup.bolts[0];
                      setDetailsToRestore(selectedFabricGroup);
                      setSelectedFabricGroup(null);
                      setShowAllBoltDetails(false);
                      if (representative) {
                        setScannedFabric(representative);
                        setScanValue(representative.sku);
                        setSellQuantity('1');
                        setReceiptEmail('');
                        setSellError(null);
                        setScanError(null);
                        setMarketOpen(true);
                        setPaymentOpen(true);
                        setSelectedPayment(null);
                      }
                      setTimeout(() => scanInputRef.current?.focus(), 0);
                    }}
                  >
                    New sale
                  </Button>
                </div>

                <div className="text-white pr-10">
                  <div className="flex items-start justify-between gap-3 pt-1">
                    <div>
                      <div className="text-xs font-mono text-white/70">
                        Base SKU: {selectedFabricGroup.baseSku}
                      </div>
                      <div className="text-2xl font-semibold leading-tight">
                        {selectedFabricGroup.name || selectedFabricGroup.baseSku}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs text-white/70">BOLTS</div>
                      <div className="text-xl font-semibold">{selectedFabricGroup.boltCount}</div>
                      <div className="mt-3 flex items-center justify-end gap-2">
                        <Button
                          type="button"
                          variant="outline"
                          className="bg-transparent border-white/20 text-white hover:bg-white/10"
                          onClick={() => {
                            const representative =
                              selectedFabricGroup.bolts.find(b => b.sku === selectedFabricGroup.baseSku) ||
                              selectedFabricGroup.bolts[0];
                            setSelectedFabricGroup(null);
                            if (representative) openEdit(representative);
                          }}
                        >
                          Edit
                        </Button>
                        <Button
                          type="button"
                          variant="destructive"
                          className="bg-red-600 hover:bg-red-700"
                          onClick={() => {
                            setDeleteGroupError(null);
                            setDeleteGroupConfirm({
                              baseSku: selectedFabricGroup.baseSku,
                              skus: selectedFabricGroup.bolts.map(b => b.sku),
                              name: selectedFabricGroup.name,
                            });
                          }}
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/70">YARDAGE LEFT</div>
                      <div className="text-lg font-semibold">
                        {selectedFabricGroup.hasQuantity
                          ? selectedFabricGroup.yardageLeft.toFixed(
                              Number.isInteger(selectedFabricGroup.yardageLeft)
                                ? 0
                                : 2
                            )
                          : '—'}{' '}
                        yd
                      </div>
                    </div>
                      <div className="rounded-xl bg-white/5 border border-white/10 p-3">
                      <div className="text-xs text-white/70">Price (per yd)</div>
                      <div className="text-lg font-semibold">
                        {selectedFabricGroup.sell_price != null
                          ? `$${selectedFabricGroup.sell_price.toFixed(2)}/yd`
                          : '—'}
                      </div>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="flex items-center justify-between gap-3 mb-2">
                      <div className="text-sm font-semibold text-white/90">Bolts</div>
                      <Button
                        type="button"
                        variant="outline"
                        className="bg-transparent border-white/20 text-white hover:bg-white/10"
                        onClick={() => setShowAllBoltDetails(v => !v)}
                      >
                        {showAllBoltDetails ? 'Show less' : 'View all details'}
                      </Button>
                    </div>
                    <div className="overflow-x-auto rounded-xl border border-white/10">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="text-white/70 text-left border-b border-white/10">
                            <th className="py-2 px-3">SKU</th>
                            <th className="py-2 px-3 text-right">Bolt</th>
                            <th className="py-2 px-3 text-right">Yards left</th>
                            <th className="py-2 px-3 text-right">Width</th>
                            <th className="py-2 px-3">Weave</th>
                            <th className="py-2 px-3">Fiber</th>
                            <th className="py-2 px-3 text-right">Sell</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selectedFabricGroup.bolts.map(b => {
                            const parsed = parseFabricSku(b.sku);
                            const boltLabel = parsed.ok ? formatBoltLabel(parsed.boltIndex) : '—';
                            return (
                              <tr key={b.sku} className="border-b border-white/5">
                                <td className="py-2 px-3 font-mono">{b.sku}</td>
                                <td className="py-2 px-3 text-right">{boltLabel}</td>
                                <td className="py-2 px-3 text-right">{b.current_quantity ?? '—'}</td>
                                <td className="py-2 px-3 text-right">
                                  {b.width != null ? `${b.width}"` : '—'}
                                </td>
                                <td className="py-2 px-3">{b.weave ?? '—'}</td>
                                <td className="py-2 px-3">{b.fiber ?? '—'}</td>
                                <td className="py-2 px-3 text-right">
                                  {b.sell_price != null ? `$${Number(b.sell_price).toFixed(2)}` : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>

                      {showAllBoltDetails && (
                        <div className="mt-3 rounded-xl bg-white/5 border border-white/10 p-3">
                          <div className="text-sm text-white/90">
                            <div className="text-xs font-semibold text-white/70 mb-2">
                              Buy price (per yd)
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-1">
                              {selectedFabricGroup.bolts.map(b => {
                                const parsed = parseFabricSku(b.sku);
                                const boltLabel = parsed.ok ? formatBoltLabel(parsed.boltIndex) : b.sku;
                                return (
                                  <div key={b.sku} className="flex items-center justify-between gap-2">
                                    <span className="text-white/80 text-xs">{boltLabel}</span>
                                    <span className="font-mono text-white/95 text-xs">
                                      {b.buy_price != null ? `$${Number(b.buy_price).toFixed(2)}` : '—'}
                                    </span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
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

      <Dialog
        open={!!deleteGroupConfirm}
        onOpenChange={open => {
          if (!open) {
            setDeleteGroupConfirm(null);
            setDeleteGroupError(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete fabric bolts?</DialogTitle>
          </DialogHeader>
          {deleteGroupConfirm && (
            <p className="text-sm text-muted-foreground">
              This will permanently remove{' '}
              <strong>{deleteGroupConfirm.name || deleteGroupConfirm.baseSku}</strong>{' '}
              and all bolts for base SKU{' '}
              <span className="font-mono">{deleteGroupConfirm.baseSku}</span>. This cannot be undone.
            </p>
          )}
          {deleteGroupError && (
            <p className="text-sm text-destructive bg-destructive/10 p-2 rounded">{deleteGroupError}</p>
          )}
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => setDeleteGroupConfirm(null)}
              disabled={deletingGroup}
            >
              Cancel
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteGroup}
              disabled={deletingGroup}
            >
              {deletingGroup ? 'Deleting...' : 'Delete all bolts'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
