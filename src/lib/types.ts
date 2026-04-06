export type ProductIcon =
  | "apple"
  | "milk"
  | "bread"
  | "tomato"
  | "rice"
  | "egg"
  | "carrot"
  | "sparkles";

export type ShoppingItemRow = {
  id: string;
  user_id: string;
  name: string;
  icon: ProductIcon;
  category: string | null;
  unit_price: number;
  quantity: number;
  created_at: string;
  updated_at: string;
};

export type ShoppingItem = ShoppingItemRow & {
  subtotal: number;
};

export type CatalogProduct = {
  name: string;
  icon: ProductIcon;
  unitPrice: number;
  category: string;
};

export type Database = {
  public: {
    Tables: {
      shopping_items: {
        Row: ShoppingItemRow;
        Insert: {
          id?: string;
          user_id?: string;
          name: string;
          icon?: ProductIcon;
          category?: string | null;
          unit_price: number;
          quantity?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          name?: string;
          icon?: ProductIcon;
          category?: string | null;
          unit_price?: number;
          quantity?: number;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
