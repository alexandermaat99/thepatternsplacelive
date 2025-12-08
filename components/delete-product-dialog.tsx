'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { createClient } from '@/lib/supabase/client';
import { useRouter, usePathname } from 'next/navigation';
import { AlertTriangle } from 'lucide-react';

interface Product {
  id: string;
  title: string;
}

interface DeleteProductDialogProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess?: () => void;
}

export function DeleteProductDialog({
  product,
  isOpen,
  onClose,
  onDeleteSuccess,
}: DeleteProductDialogProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const handleDelete = async () => {
    setIsLoading(true);

    try {
      const supabase = createClient();
      const { error } = await supabase.from('products').delete().eq('id', product.id);

      if (error) throw error;

      onClose();
      onDeleteSuccess?.(); // Call success callback if provided

      // If we're on a product detail page, redirect to marketplace instead of refreshing
      // (since the product no longer exists, refresh would cause a 404)
      if (pathname?.includes('/marketplace/product/')) {
        router.push('/marketplace');
      } else if (pathname?.includes('/dashboard/my-products')) {
        // If on dashboard, refresh to update the product list
        router.refresh();
      } else {
        router.refresh(); // Refresh the page to show updated data
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      alert('Failed to delete product. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Delete Product
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete <strong>"{product.title}"</strong>? This action cannot
            be undone.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleDelete} disabled={isLoading}>
            {isLoading ? 'Deleting...' : 'Delete Product'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
