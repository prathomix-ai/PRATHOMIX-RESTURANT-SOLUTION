import { createClient } from '@supabase/supabase-js';

export const RESTAURANT_TABLES = {
  dishes: 'dishes',
  bookings: 'bookings',
  orders: 'orders',
} as const;

export const RESTAURANT_SEED_DISHES: Dish[] = [
  {
    id: '11111111-1111-4111-8111-111111111111',
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
    id: '22222222-2222-4222-8222-222222222222',
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
    id: '33333333-3333-4333-8333-333333333333',
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
    id: '44444444-4444-4444-8444-444444444444',
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
    id: '55555555-5555-4555-8555-555555555555',
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
    id: '66666666-6666-4666-8666-666666666666',
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
    id: '77777777-7777-4777-8777-777777777777',
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
    id: '88888888-8888-4888-8888-888888888888',
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
    id: '99999999-9999-4999-8999-999999999999',
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
    id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    name: 'Garden Veggie Wrap',
    description: 'Whole wheat wrap with hummus, roasted peppers & feta',
    price: 219,
    calories: 290,
    protein: 12,
    image_url: 'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
    category: 'Low Cal',
    available: true,
  },
  {
    id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
    name: 'Chole Bhature',
    description: 'Spiced chickpea curry with puffed bhature and onion salad',
    price: 229,
    calories: 610,
    protein: 16,
    image_url: 'https://images.unsplash.com/photo-1567188040759-fb8a4efb4b0c?w=400',
    category: 'Main',
    available: true,
  },
  {
    id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
    name: 'Chicken Biryani',
    description: 'Aromatic basmati rice layered with spiced chicken and herbs',
    price: 349,
    calories: 620,
    protein: 34,
    image_url: 'https://images.unsplash.com/photo-1563379091339-03246963d746?w=400',
    category: 'Main',
    available: true,
  },
  {
    id: 'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
    name: 'Mutton Biryani',
    description: 'Slow-cooked mutton with fragrant rice and caramelized onions',
    price: 399,
    calories: 680,
    protein: 35,
    image_url: 'https://images.unsplash.com/photo-1625703164652-df5c2c9a1b8f?w=400',
    category: 'Main',
    available: true,
  },
  {
    id: 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    name: 'Falafel Pita Wrap',
    description: 'Crispy chickpea falafel in warm pita with tahini and greens',
    price: 229,
    calories: 380,
    protein: 13,
    image_url: 'https://images.unsplash.com/photo-1547496502-affa22d38842?w=400',
    category: 'Vegetarian',
    available: true,
  },
  {
    id: 'ffffffff-ffff-4fff-8fff-ffffffffffff',
    name: 'Rajma Chawal',
    description: 'Slow-cooked red kidney beans in spiced tomato gravy with rice',
    price: 239,
    calories: 450,
    protein: 15,
    image_url: 'https://images.unsplash.com/photo-1596797038530-2c107229654b?w=400',
    category: 'Vegetarian',
    available: true,
  },
  {
    id: '12121212-1212-4212-8212-121212121212',
    name: 'Grilled Chicken Pesto Pasta',
    description: 'Whole wheat penne tossed with grilled chicken and basil pesto',
    price: 369,
    calories: 490,
    protein: 38,
    image_url: 'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: '13131313-1313-4313-8313-131313131313',
    name: 'Lemon Herb Quinoa',
    description: 'Fluffy quinoa tossed with lemon zest, fresh herbs and greens',
    price: 209,
    calories: 250,
    protein: 9,
    image_url: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
    category: 'Low Cal',
    available: true,
  },
  {
    id: '14141414-1414-4414-8414-141414141414',
    name: 'Chicken Lentil Soup',
    description: 'Hearty soup with shredded chicken, red lentils and vegetables',
    price: 249,
    calories: 320,
    protein: 29,
    image_url: 'https://images.unsplash.com/photo-1547592180-85f173990554?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: '15151515-1515-4515-8515-151515151515',
    name: 'Pulled Chicken Slider',
    description: 'BBQ pulled chicken sliders in mini brioche buns',
    price: 289,
    calories: 480,
    protein: 24,
    image_url: 'https://images.unsplash.com/photo-1553979459-d2229ba7433b?w=400',
    category: 'Main',
    available: true,
  },
  {
    id: '16161616-1616-4616-8616-161616161616',
    name: 'Lamb Kofta Plate',
    description: 'Spiced lamb koftas with tzatziki, pita bread and salad',
    price: 479,
    calories: 490,
    protein: 38,
    image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=400',
    category: 'High Protein',
    available: true,
  },
  {
    id: '17171717-1717-4717-8717-171717171717',
    name: 'Chicken Shawarma Bowl',
    description: 'Marinated chicken shawarma over aromatic rice and salad',
    price: 349,
    calories: 450,
    protein: 36,
    image_url: 'https://images.unsplash.com/photo-1604908176997-125f25cc500f?w=400',
    category: 'High Protein',
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
