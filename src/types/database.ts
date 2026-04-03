/**
 * Placeholder types for Supabase database
 * These will be auto-generated with: pnpm supabase gen types typescript
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

export type Product = Database['public']['Tables']['products']['Row'];
export type Category = Database['public']['Tables']['categories']['Row'];
export type Order = Database['public']['Tables']['orders']['Row'];
