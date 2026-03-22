/** Ordered gallery for a base SKU (see `sql/add-fabric-photos-table.sql`). */
export interface FabricPhoto {
  id: string;
  base_sku: string;
  photo_url: string;
  sort_order: number;
  created_at: string;
}

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
