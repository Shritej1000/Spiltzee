import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Database = {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          phone: string | null;
          avatar_url: string | null;
          currency: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
        };
        Update: {
          full_name?: string | null;
          phone?: string | null;
          avatar_url?: string | null;
          currency?: string;
        };
      };
      expenses: {
        Row: {
          id: string;
          user_id: string;
          title: string;
          amount: number;
          category_id: string;
          payment_method: string;
          expense_date: string;
          notes: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
          title: string;
          amount: number;
          category_id: string;
          payment_method: string;
          expense_date?: string;
          notes?: string | null;
        };
        Update: {
          title?: string;
          amount?: number;
          category_id?: string;
          payment_method?: string;
          expense_date?: string;
          notes?: string | null;
        };
      };
      expense_categories: {
        Row: {
          id: string;
          name: string;
          icon: string;
          color: string;
          is_default: boolean;
        };
      };
      groups: {
        Row: {
          id: string;
          name: string;
          description: string | null;
          type: 'trip' | 'event' | 'home' | 'office' | 'other';
          created_by: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          name: string;
          description?: string | null;
          type: 'trip' | 'event' | 'home' | 'office' | 'other';
          created_by: string;
        };
        Update: {
          name?: string;
          description?: string | null;
          type?: 'trip' | 'event' | 'home' | 'office' | 'other';
        };
      };
      group_members: {
        Row: {
          id: string;
          group_id: string;
          user_id: string;
          added_by: string;
          added_at: string;
        };
        Insert: {
          group_id: string;
          user_id: string;
          added_by: string;
        };
      };
      group_expenses: {
        Row: {
          id: string;
          group_id: string;
          paid_by: string;
          title: string;
          amount: number;
          category_id: string;
          expense_date: string;
          notes: string | null;
          split_type: 'equal' | 'unequal' | 'percentage' | 'shares';
          created_at: string;
        };
        Insert: {
          group_id: string;
          paid_by: string;
          title: string;
          amount: number;
          category_id: string;
          expense_date?: string;
          notes?: string | null;
          split_type: 'equal' | 'unequal' | 'percentage' | 'shares';
        };
      };
      expense_splits: {
        Row: {
          id: string;
          group_expense_id: string;
          user_id: string;
          amount: number;
          percentage: number | null;
          shares: number | null;
          is_settled: boolean;
        };
        Insert: {
          group_expense_id: string;
          user_id: string;
          amount: number;
          percentage?: number | null;
          shares?: number | null;
          is_settled?: boolean;
        };
      };
      settlements: {
        Row: {
          id: string;
          group_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          payment_method: string;
          payment_date: string;
          notes: string | null;
          created_at: string;
        };
        Insert: {
          group_id: string;
          payer_id: string;
          payee_id: string;
          amount: number;
          payment_method: string;
          payment_date?: string;
          notes?: string | null;
        };
      };
    };
  };
};
