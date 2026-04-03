/**
 * Types for Supabase database
 */

export interface Database {
  public: {
    Tables: {
      products: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          name: string;
          slug: string;
          description: string | null;
          price: number;
          compare_at_price: number | null;
          category_id: string | null;
          images: string[];
          stock: number;
          is_active: boolean;
          is_featured: boolean;
          metadata: Record<string, unknown> | null;
        };
        Insert: Omit<
          Database['public']['Tables']['products']['Row'],
          'id' | 'created_at' | 'updated_at'
        > &
          Partial<
            Pick<
              Database['public']['Tables']['products']['Row'],
              'id' | 'created_at' | 'updated_at'
            >
          >;
        Update: Partial<Database['public']['Tables']['products']['Row']>;
      };
      categories: {
        Row: {
          id: string;
          created_at: string;
          name: string;
          slug: string;
          description: string | null;
          image_url: string | null;
          sort_order: number;
          is_active: boolean;
        };
        Insert: Omit<
          Database['public']['Tables']['categories']['Row'],
          'id' | 'created_at'
        > &
          Partial<
            Pick<
              Database['public']['Tables']['categories']['Row'],
              'id' | 'created_at'
            >
          >;
        Update: Partial<Database['public']['Tables']['categories']['Row']>;
      };
      orders: {
        Row: {
          id: string;
          created_at: string;
          updated_at: string;
          customer_name: string;
          customer_phone: string;
          customer_email: string | null;
          customer_address: string | null;
          status: string;
          total: number;
          notes: string | null;
          items: OrderItem[];
        };
        Insert: Omit<
          Database['public']['Tables']['orders']['Row'],
          'id' | 'created_at' | 'updated_at'
        > &
          Partial<
            Pick<
              Database['public']['Tables']['orders']['Row'],
              'id' | 'created_at' | 'updated_at'
            >
          >;
        Update: Partial<Database['public']['Tables']['orders']['Row']>;
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      order_status:
        | 'pending'
        | 'confirmed'
        | 'preparing'
        | 'shipped'
        | 'delivered'
        | 'cancelled';
    };
  };
}

export interface OrderItem {
  product_id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Base types from Supabase
export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];

// Extended product type with additional columns from the seeded database
export interface ExtendedProduct extends Product {
  short_description?: string | null;
  sku?: string | null;
  material?: string | null;
  experience_level?: string | null;
  is_body_safe?: boolean | null;
  care_instructions?: string | null;
  specifications?: Record<string, unknown> | null;
  emoji?: string | null;
}

// Extended category type with emoji
export interface ExtendedCategory extends Category {
  emoji?: string | null;
}

// Kink category (not in typed schema, accessed via `as any`)
export interface KinkCategory {
  id: string;
  created_at: string;
  name: string;
  slug: string;
  description: string | null;
  emoji: string | null;
  sort_order: number;
  is_active: boolean;
}
