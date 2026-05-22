import { createClient } from '@supabase/supabase-js';

export const RESTAURANT_TABLES = {
  dishes: 'dishes',
  bookings: 'bookings',
  orders: 'orders',
} as const;

export const RESTAURANT_SEED_DISHES: Dish[] = [
  {
    id: 'seed-grilled-chicken-powerhouse',
    name: 'Grilled Chicken Powerhouse',
    description: 'Herb-marinated chicken breast with quinoa & roasted veggies',
    price: 349,
    calories: 420,
    protein: 45,
    image_url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: 'seed-avocado-tuna-bowl',
    name: 'Avocado Tuna Bowl',
    description: 'Wild-caught tuna, avocado, edamame & brown rice',
    price: 399,
    calories: 380,
    protein: 38,
    image_url: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: 'seed-masala-egg-white-omelette',
    name: 'Masala Egg White Omelette',
    description: 'Spiced 6 egg-white omelette with peppers & mushrooms',
    price: 199,
    calories: 180,
    protein: 30,
    image_url: 'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400',
    category: 'Low Cal',
    available: true,
  },
  {
    id: 'seed-paneer-tikka-salad',
    name: 'Paneer Tikka Salad',
    description: 'Tandoori paneer cubes over garden greens with mint dressing',
    price: 299,
    calories: 310,
    protein: 22,
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    category: 'Vegetarian',
    available: true,
  },
  {
    id: 'seed-salmon-teriyaki',
    name: 'Salmon Teriyaki',
    description: 'Atlantic salmon fillet with teriyaki glaze & steamed broccoli',
    price: 549,
    calories: 460,
    protein: 42,
    image_url: 'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: 'seed-zucchini-pasta-primavera',
    name: 'Zucchini Pasta Primavera',
    description: 'Spiralized zucchini, cherry tomatoes & basil pesto',
    price: 249,
    calories: 220,
    protein: 8,
    image_url: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400',
    category: 'Low Cal',
    available: true,
  },
  {
    id: 'seed-butter-chicken',
    name: 'Butter Chicken',
    description: 'Classic creamy tomato-based chicken curry with naan',
    price: 329,
    calories: 580,
    protein: 32,
    image_url: 'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
    category: 'Main',
    available: true,
  },
  {
    id: 'seed-dal-makhani',
    name: 'Dal Makhani',
    description: 'Slow-cooked black lentils in rich buttery tomato gravy',
    price: 249,
    calories: 420,
    protein: 18,
    image_url: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
    category: 'Vegetarian',
    available: true,
  },
  {
    id: 'seed-protein-shake-bowl',
    name: 'Protein Shake Bowl',
    description: 'Blended acai, banana, protein powder & granola topping',
    price: 279,
    calories: 310,
    protein: 35,
    image_url: 'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: 'seed-garden-veggie-wrap',
    name: 'Garden Veggie Wrap',
    description: 'Whole wheat wrap with hummus, roasted peppers & feta',
    price: 219,
    calories: 290,
    protein: 12,
    image_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    category: 'Low Cal',
    available: true,
  },
] satisfies Dish[];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables. Set NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY (or VITE_SUPABASE_URL/VITE_SUPABASE_ANON_KEY).');
}

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
  table_number: number;
  dish_ids: string[];
  dish_names: string[];
  total_amount: number;
  split_count: number;
  status: string;
  created_at?: string;
  updated_at?: string;
};
