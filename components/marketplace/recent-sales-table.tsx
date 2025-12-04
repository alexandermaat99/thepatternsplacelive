'use client';

import { useState } from 'react';
import { DateDisplay } from '@/components/date-display';
import { SaleDetailsModal } from './sale-details-modal';

interface BuyerInfo {
  id?: string;
  email?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

interface ProductInfo {
  id: string;
  title: string;
  image_url?: string;
}

interface Order {
  id: string;
  amount: number;
  total_amount?: number;
  currency: string;
  platform_fee?: number;
  stripe_fee?: number;
  net_amount?: number;
  status: string;
  created_at: string;
  buyer_id?: string;
  buyer_email?: string;
  buyer?: BuyerInfo;
  products: ProductInfo;
  stripe_session_id?: string;
}

interface RecentSalesTableProps {
  orders: Order[];
}

// Format currency
function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function RecentSalesTable({ orders }: RecentSalesTableProps) {
  const [selectedSale, setSelectedSale] = useState<Order | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleRowClick = (order: Order) => {
    setSelectedSale(order);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedSale(null);
  };

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No sales yet.</p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="text-left border-b">
              <th className="pb-3 font-medium">Product</th>
              <th className="pb-3 font-medium">Date</th>
              <th className="pb-3 font-medium text-right">You Earned</th>
            </tr>
          </thead>
          <tbody>
            {orders.map(order => (
              <tr
                key={order.id}
                className="border-b last:border-0 cursor-pointer hover:bg-muted/50 transition-colors"
                onClick={() => handleRowClick(order)}
              >
                <td className="py-3">
                  <div className="flex items-center gap-3">
                    {order.products?.image_url && (
                      <img
                        src={order.products.image_url}
                        alt={order.products?.title || 'Product'}
                        className="w-10 h-10 rounded object-cover"
                      />
                    )}
                    <span className="font-medium truncate max-w-[200px]">
                      {order.products?.title || 'Unknown Product'}
                    </span>
                  </div>
                </td>
                <td className="py-3 text-sm text-muted-foreground">
                  <DateDisplay date={order.created_at} />
                </td>
                <td className="py-3 text-right font-medium text-green-600">
                  {formatCurrency(order.net_amount || order.amount, order.currency)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <SaleDetailsModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        sale={selectedSale}
      />
    </>
  );
}

