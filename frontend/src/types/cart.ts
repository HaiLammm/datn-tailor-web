/**
 * Cart types - Story 3.1: Cart State Management
 * CartItem, CartState, CartStore types for Zustand cart store.
 */

export type CartTransactionType = "buy" | "rent";

export interface CartItem {
  id: string;               // UUID v4 (generated client-side)
  garment_id: string;       // GarmentDB.id
  garment_name: string;     // Để hiển thị trong drawer
  image_url: string;        // Thumbnail
  transaction_type: CartTransactionType;
  // For buy:
  size?: string;            // Size được chọn
  // For rent:
  start_date?: string;      // ISO date string "YYYY-MM-DD"
  end_date?: string;        // ISO date string "YYYY-MM-DD"
  rental_days?: number;     // Tính từ start/end
  // Pricing:
  unit_price: number;       // rental_price/day HOẶC sale_price
  total_price: number;      // unit_price × days (rent) hoặc unit_price (buy)
}

export interface CartState {
  items: CartItem[];
}

export interface CartStore extends CartState {
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateItem: (id: string, updates: Partial<CartItem>) => void;
  clearCart: () => void;
  cartCount: () => number;
  cartTotal: () => number;
}
