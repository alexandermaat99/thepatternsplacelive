'use client';

import { useState } from 'react';
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
import { Plus, Pencil, Ruler, Trash2, X } from 'lucide-react';
import Image from 'next/image';

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

  const openAdd = () => {
    setEditingSku(null);
    setForm(emptyForm);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSaving(true);
    try {
      const supabase = createClient();
      const row = {
        sku: form.sku.trim(),
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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Ruler className="h-7 w-7" />
          Fabric Inventory
        </h1>
        <Button onClick={openAdd} className="gap-2">
          <Plus className="h-4 w-4" />
          Add fabric
        </Button>
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
                  {fabric.map(row => (
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
                  ))}
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
