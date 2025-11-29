'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';

interface CartItem {
  id: string;
  title: string;
}

interface RemoveCartItemDialogProps {
  item: CartItem | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
}

export function RemoveCartItemDialog({
  item,
  isOpen,
  onClose,
  onConfirm,
}: RemoveCartItemDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            Remove Item
          </DialogTitle>
        </DialogHeader>

        <div className="py-4">
          <p className="text-sm text-muted-foreground">
            Are you sure you want to remove <strong>"{item?.title}"</strong> from your cart?
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={handleConfirm}>
            Remove Item
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

