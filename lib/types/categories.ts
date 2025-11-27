/**
 * Category types and interfaces
 */

export interface Category {
  id: string;
  name: string;
  slug: string;
  description?: string | null;
  parent_id?: string | null;
  icon?: string | null;
  display_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
  children?: Category[]; // For hierarchical categories
}

export interface ProductCategory {
  product_id: string;
  category_id: string;
  created_at?: string;
  category?: Category; // Expanded category data
}

