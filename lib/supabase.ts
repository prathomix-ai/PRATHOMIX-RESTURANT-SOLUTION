import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseKey);

export type Dish = {
  id: string;
  name: string;
  description: string;
  price: number;
  calories: number;
  protein: number;
  image_url: string;
  category: string;
  available: boolean;
  created_at?: string;
};

export type Booking = {
  id: string;
  customer_name: string;
  phone: string;
  date: string;
  time: string;
  guests: number;
  status: string;
  notes?: string;
  created_at?: string;
};

export type Order = {
  id: string;
  dish_ids: string[];
  dish_names: string[];
  total_amount: number;
  split_count: number;
  status: string;
  created_at?: string;
};
