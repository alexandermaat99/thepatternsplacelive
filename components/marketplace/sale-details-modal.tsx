'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DateDisplay } from '@/components/date-display';
import { User, Mail, Package, DollarSign, Calendar, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { calculateEtsyFees } from '@/lib/company-info';

interface BuyerInfo {
  id?: string;
  full_name?: string;
  username?: string;
  avatar_url?: string;
}

interface ProductInfo {
  id: string;
  title: string;
  image_url?: string;
}

interface SaleDetails {
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

interface SaleDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sale: SaleDetails | null;
}

// Format currency
function formatCurrency(amount: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount);
}

export function SaleDetailsModal({ isOpen, onClose, sale }: SaleDetailsModalProps) {
  if (!sale) return null;

  const buyerName = sale.buyer?.full_name || sale.buyer?.username || 'Guest Customer';
  const buyerEmail = sale.buyer_email || 'No email available';
  const isAuthenticatedBuyer = !!sale.buyer_id;

  // Recalculate fees from sale price (not total with tax) for accurate display
  const salePriceInCents = Math.round((sale.amount || 0) * 100);
  const calculatedFees = calculateEtsyFees(salePriceInCents);
  // Platform fee = listing fee + transaction fee
  const platformFee = (calculatedFees.listingFee + calculatedFees.transactionFee) / 100;
  // Stripe processing fee = payment processing
  const stripeProcessingFee = calculatedFees.paymentProcessing / 100;
  const totalFees = platformFee + stripeProcessingFee;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-2">
            Sale Details
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Product Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <Package className="h-5 w-5" />
              Product
            </h3>
            <div className="flex items-start gap-4">
              {sale.products?.image_url && (
                <img
                  src={sale.products.image_url}
                  alt={sale.products?.title || 'Product'}
                  className="w-20 h-20 rounded object-cover"
                />
              )}
              <div className="flex-1">
                <Link
                  href={`/marketplace/product/${sale.products?.id}`}
                  className="font-medium text-lg hover:underline"
                >
                  {sale.products?.title || 'Unknown Product'}
                </Link>
                <p className="text-sm text-muted-foreground mt-1">Product ID: {sale.products?.id}</p>
              </div>
            </div>
          </div>

          {/* Buyer Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <User className="h-5 w-5" />
              Buyer Information
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium">Name:</span>
                <span className="text-sm">{buyerName}</span>
                {isAuthenticatedBuyer ? (
                  <Badge variant="default" className="ml-2">
                    Registered User
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="ml-2">
                    Guest
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm font-medium">Email:</span>
                <a
                  href={`mailto:${buyerEmail}`}
                  className="text-sm text-primary hover:underline"
                >
                  {buyerEmail}
                </a>
              </div>
              {sale.buyer?.username && (
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Username:</span>
                  <Link
                    href={`/marketplace/seller/${sale.buyer.username}`}
                    className="text-sm text-primary hover:underline"
                  >
                    @{sale.buyer.username}
                  </Link>
                </div>
              )}
            </div>
          </div>

          {/* Sale Information */}
          <div className="border rounded-lg p-4">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <DollarSign className="h-5 w-5" />
              Sale Information
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Order ID:</span>
                <span className="text-sm font-mono">{sale.id}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Date:
                </span>
                <DateDisplay date={sale.created_at} />
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Status:</span>
                <Badge
                  variant={sale.status === 'completed' ? 'default' : 'secondary'}
                >
                  {sale.status}
                </Badge>
              </div>
            </div>
          </div>

          {/* Financial Breakdown */}
          <div className="border rounded-lg p-4 bg-muted/50">
            <h3 className="font-semibold text-lg mb-3 flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              Financial Breakdown
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm">Sale Price:</span>
                <span className="text-sm font-medium">
                  {formatCurrency(sale.amount || 0, sale.currency)}
                </span>
              </div>
              {sale.total_amount && sale.total_amount !== sale.amount && (
                <div className="flex justify-between items-center">
                  <span className="text-sm text-muted-foreground">Total Amount (with tax):</span>
                  <span className="text-sm">
                    {formatCurrency(sale.total_amount, sale.currency)}
                  </span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Platform Fee:</span>
                <span className="text-sm text-red-600">
                  -{formatCurrency(platformFee, sale.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Stripe Processing Fee:</span>
                <span className="text-sm text-red-600">
                  -{formatCurrency(stripeProcessingFee, sale.currency)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t">
                <span className="font-semibold">You Earned:</span>
                <span className="font-bold text-green-600">
                  {formatCurrency((sale.amount || 0) - totalFees, sale.currency)}
                </span>
              </div>
            </div>
          </div>

          {sale.stripe_session_id && (
            <div className="border rounded-lg p-4">
              <h3 className="font-semibold text-sm mb-2">Stripe Session ID</h3>
              <p className="text-xs font-mono text-muted-foreground break-all">
                {sale.stripe_session_id}
              </p>
            </div>
          )}
        </div>

        <div className="flex justify-end mt-6">
          <Button onClick={onClose}>Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

