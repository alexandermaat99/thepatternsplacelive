export interface Fabric {
  created_at: string;
  sku: string;
  name: string | null;
  description: string | null;
  weave: string | null;
  fiber: string | null;
  width: number | null;
  current_quantity: number | null;
  purchase_quantity: number | null;
  buy_price: number | null;
  sell_price: number | null;
  photo_url: string | null;
}
