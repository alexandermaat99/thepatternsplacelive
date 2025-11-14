'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Edit, Trash2 } from 'lucide-react';
import { EditProductModal } from '@/components/edit-product-modal';
import { DeleteProductDialog } from '@/components/delete-product-dialog';

interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  currency: string;
  image_url?: string;
  category: string;
  difficulty?: string | null;
  is_active: boolean;
}

interface ProductActionsProps {
  product: Product;
}

export function ProductActions({ product }: ProductActionsProps) {
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <>
      <div className="absolute top-2 right-2 flex gap-1">
        <Button 
          size="sm" 
          variant="secondary" 
          className="h-8 w-8 p-0"
          onClick={() => setIsEditModalOpen(true)}
        >
          <Edit className="h-3 w-3" />
        </Button>
        <Button 
          size="sm" 
          variant="destructive" 
          className="h-8 w-8 p-0"
          onClick={() => setIsDeleteDialogOpen(true)}
        >
          <Trash2 className="h-3 w-3" />
        </Button>
      </div>

      <EditProductModal
        product={product}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
      />

      <DeleteProductDialog
        product={product}
        isOpen={isDeleteDialogOpen}
        onClose={() => setIsDeleteDialogOpen(false)}
      />
    </>
  );
}
