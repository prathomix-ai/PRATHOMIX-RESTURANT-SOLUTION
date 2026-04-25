-- ╔════════════════════════════════════════════╗
-- ║    PRATHOMIX RESTAURANT — DB SCHEMA        ║
-- ║    Run this in your Supabase SQL Editor    ║
-- ╚════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── Dishes ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dishes (
  id          uuid         DEFAULT gen_random_uuid() PRIMARY KEY,
  name        text         NOT NULL,
  description text,
  price       numeric(10,2) NOT NULL,
  calories    integer,
  protein     numeric(5,1),
  image_url   text         DEFAULT 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
  category    text         DEFAULT 'Main',
  available   boolean      DEFAULT true,
  created_at  timestamptz  DEFAULT now()
);

-- ── Bookings ──────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
  id            uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_name text        NOT NULL,
  phone         text        NOT NULL,
  date          date        NOT NULL,
  time          time        NOT NULL,
  guests        integer     NOT NULL CHECK (guests > 0 AND guests <= 20),
  status        text        DEFAULT 'confirmed'
                            CHECK (status IN ('confirmed','pending','cancelled')),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

-- ── Orders ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  dish_ids     uuid[]      NOT NULL,
  dish_names   text[]      NOT NULL,
  total_amount numeric(10,2) NOT NULL,
  split_count  integer     DEFAULT 1,
  status       text        DEFAULT 'placed',
  created_at   timestamptz DEFAULT now()
);

-- ── RLS ───────────────────────────────────────────────────────────
ALTER TABLE dishes   ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read dishes"    ON dishes   FOR SELECT USING (true);
CREATE POLICY "Public read bookings"  ON bookings FOR SELECT USING (true);
CREATE POLICY "Public read orders"    ON orders   FOR SELECT USING (true);
CREATE POLICY "Allow insert bookings" ON bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert orders"   ON orders   FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow insert dishes"   ON dishes   FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow update dishes"   ON dishes   FOR UPDATE USING (true);

-- ── Seed Sample Dishes ────────────────────────────────────────────
INSERT INTO dishes (name, description, price, calories, protein, image_url, category) VALUES
  ('Grilled Chicken Powerhouse',
   'Herb-marinated chicken breast with quinoa & roasted veggies',
   349, 420, 45.0,
   'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=400',
   'High Protein'),

  ('Avocado Tuna Bowl',
   'Wild-caught tuna, avocado, edamame & brown rice',
   399, 380, 38.0,
   'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=400',
   'High Protein'),

  ('Masala Egg White Omelette',
   'Spiced 6 egg-white omelette with peppers & mushrooms',
   199, 180, 30.0,
   'https://images.unsplash.com/photo-1510693206972-df098062cb71?w=400',
   'Low Cal'),

  ('Paneer Tikka Salad',
   'Tandoori paneer cubes over garden greens with mint dressing',
   299, 310, 22.0,
   'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=400',
   'Vegetarian'),

  ('Salmon Teriyaki',
   'Atlantic salmon fillet with teriyaki glaze & steamed broccoli',
   549, 460, 42.0,
   'https://images.unsplash.com/photo-1467003909585-2f8a72700288?w=400',
   'High Protein'),

  ('Zucchini Pasta Primavera',
   'Spiralized zucchini, cherry tomatoes & basil pesto',
   249, 220, 8.0,
   'https://images.unsplash.com/photo-1473093226795-af9932fe5856?w=400',
   'Low Cal'),

  ('Butter Chicken',
   'Classic creamy tomato-based chicken curry with naan',
   329, 580, 32.0,
   'https://images.unsplash.com/photo-1603894584373-5ac82b2ae398?w=400',
   'Main'),

  ('Dal Makhani',
   'Slow-cooked black lentils in rich buttery tomato gravy',
   249, 420, 18.0,
   'https://images.unsplash.com/photo-1546833999-b9f581a1996d?w=400',
   'Vegetarian'),

  ('Protein Shake Bowl',
   'Blended acai, banana, protein powder & granola topping',
   279, 310, 35.0,
   'https://images.unsplash.com/photo-1494390248081-4e521a5940db?w=400',
   'High Protein'),

  ('Garden Veggie Wrap',
   'Whole wheat wrap with hummus, roasted peppers & feta',
   219, 290, 12.0,
   'https://images.unsplash.com/photo-1565958011703-44f9829ba187?w=400',
   'Low Cal');
