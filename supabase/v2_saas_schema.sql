-- ╔══════════════════════════════════════════════════════════════════════════════╗
-- ║        PRATHOMIX RESTAURANT OPERATING SYSTEM — V2 SAAS SCHEMA                ║
-- ║        Multi-Tenant Architecture, Role-Based Access, Zero-Commission Engine  ║
-- ╚══════════════════════════════════════════════════════════════════════════════╝

CREATE EXTENSION IF NOT EXISTS "pgcrypto";
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── 1. Restaurants (Tenants) ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurants (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  phone         text,
  email         text,
  address       text,
  city          text,
  cuisine_type  text DEFAULT 'Contemporary Fine Dining',
  logo_url      text DEFAULT 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400',
  banner_url    text DEFAULT 'https://images.unsplash.com/photo-1544025162-d76694265947?w=1600',
  currency      text DEFAULT 'INR',
  currency_symbol text DEFAULT '₹',
  tax_rate      numeric(5,2) DEFAULT 5.00,
  delivery_fee  numeric(10,2) DEFAULT 40.00,
  service_charge numeric(5,2) DEFAULT 0.00,
  is_active     boolean DEFAULT true,
  opening_time  time DEFAULT '11:00:00',
  closing_time  time DEFAULT '23:30:00',
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);

-- Seed default flagship restaurant if not exists
INSERT INTO restaurants (id, name, slug, phone, email, address, city, cuisine_type)
VALUES (
  '10000000-0000-0000-0000-000000000001',
  'PRATHOMIX Flagship Luxury Lounge',
  'prathomix-flagship',
  '+91 98765 43210',
  'concierge@prathomix.com',
  'Level 42, Sky Tower, Financial District',
  'Mumbai',
  'Modern Luxury Gastronomy'
)
ON CONFLICT (slug) DO UPDATE
SET name = EXCLUDED.name,
    phone = EXCLUDED.phone,
    email = EXCLUDED.email;

-- ── 2. User Profiles & Role Architecture ──────────────────────────────────────
-- Supports: owner, admin, manager, receptionist, waiter, chef, delivery, customer, accountant
CREATE TABLE IF NOT EXISTS profiles (
  id            uuid PRIMARY KEY,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  role          text NOT NULL CHECK (role IN (
                  'owner', 'admin', 'manager', 'receptionist', 'waiter', 'chef', 'delivery', 'customer', 'accountant'
                )),
  name          text NOT NULL,
  phone         text,
  email         text,
  avatar_url    text,
  employee_code text,
  passcode      text,
  status        text DEFAULT 'active' CHECK (status IN ('active', 'suspended', 'inactive')),
  permissions   text[] DEFAULT ARRAY[]::text[],
  created_at    timestamptz DEFAULT now(),
  last_login    timestamptz DEFAULT now()
);

-- Index for tenant and role lookup
CREATE INDEX IF NOT EXISTS idx_profiles_restaurant_role ON profiles(restaurant_id, role);
CREATE INDEX IF NOT EXISTS idx_profiles_employee_code ON profiles(employee_code);

-- ── 3. Restaurant Tables & QR Integration ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS restaurant_tables (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  table_number  integer NOT NULL,
  capacity      integer DEFAULT 4 CHECK (capacity > 0),
  section       text DEFAULT 'Main Dining',
  status        text DEFAULT 'available' CHECK (status IN ('available', 'occupied', 'reserved', 'cleaning', 'billing')),
  qr_code_url   text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, table_number)
);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status ON restaurant_tables(restaurant_id, status);

-- Seed initial 10 tables for flagship restaurant
INSERT INTO restaurant_tables (restaurant_id, table_number, capacity, section, status)
SELECT 
  '10000000-0000-0000-0000-000000000001'::uuid,
  s.num,
  CASE WHEN s.num IN (1, 2) THEN 2 WHEN s.num IN (9, 10) THEN 8 ELSE 4 END,
  CASE WHEN s.num <= 4 THEN 'Terrace Garden' WHEN s.num <= 8 THEN 'Main Dining' ELSE 'VIP Lounge' END,
  'available'
FROM generate_series(1, 10) AS s(num)
ON CONFLICT (restaurant_id, table_number) DO NOTHING;

-- ── 4. Categories ─────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS categories (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name          text NOT NULL,
  description   text,
  display_order integer DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

-- Seed default categories
INSERT INTO categories (restaurant_id, name, display_order)
VALUES 
  ('10000000-0000-0000-0000-000000000001', 'High Protein', 1),
  ('10000000-0000-0000-0000-000000000001', 'Main', 2),
  ('10000000-0000-0000-0000-000000000001', 'Vegetarian', 3),
  ('10000000-0000-0000-0000-000000000001', 'Low Cal', 4),
  ('10000000-0000-0000-0000-000000000001', 'Dessert', 5),
  ('10000000-0000-0000-0000-000000000001', 'Drinks & Mocktails', 6)
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- ── 5. Upgraded Dishes Schema ─────────────────────────────────────────────────
-- Backward compatible with existing dishes table while adding SaaS fields
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE DEFAULT '10000000-0000-0000-0000-000000000001';
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id) ON DELETE SET NULL;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS prep_time_minutes integer DEFAULT 15;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS spice_level integer DEFAULT 1 CHECK (spice_level BETWEEN 0 AND 4);
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS veg_type text DEFAULT 'non-veg' CHECK (veg_type IN ('veg', 'non-veg', 'vegan', 'egg'));
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS ingredients text[] DEFAULT ARRAY[]::text[];
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS allergens text[] DEFAULT ARRAY[]::text[];
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS tags text[] DEFAULT ARRAY[]::text[];
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS modifiers jsonb DEFAULT '[]'::jsonb;
ALTER TABLE dishes ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_category ON dishes(restaurant_id, category);
CREATE INDEX IF NOT EXISTS idx_dishes_available ON dishes(restaurant_id, available);

-- Update existing dishes to flagship restaurant
UPDATE dishes 
SET restaurant_id = '10000000-0000-0000-0000-000000000001' 
WHERE restaurant_id IS NULL;

-- ── 6. Upgraded Orders Schema ─────────────────────────────────────────────────
-- Supports Dine-In, Takeaway, Delivery, granular items, modifiers, taxes, and payments
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE DEFAULT '10000000-0000-0000-0000-000000000001';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in' CHECK (order_type IN ('dine_in', 'takeaway', 'delivery'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text DEFAULT 'Guest';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'failed', 'refunded', 'partial'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash' CHECK (payment_method IN ('cash', 'upi', 'card', 'online', 'other'));
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_detail jsonb DEFAULT '[]'::jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS kot_printed boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS estimated_ready_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_orders_table ON orders(restaurant_id, table_number);

-- ── 7. Upgraded Bookings Schema ───────────────────────────────────────────────
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE DEFAULT '10000000-0000-0000-0000-000000000001';
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS email text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS special_requests text;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS seated_at timestamptz;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS completed_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date ON bookings(restaurant_id, date, status);

-- ── 8. Inventory & Stock Control ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS inventory_items (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  category        text DEFAULT 'Produce',
  unit            text NOT NULL, -- 'kg', 'g', 'liters', 'units', 'packs'
  current_stock   numeric(10,2) NOT NULL DEFAULT 0,
  min_stock       numeric(10,2) NOT NULL DEFAULT 5,
  cost_per_unit   numeric(10,2) NOT NULL DEFAULT 0,
  supplier_name   text,
  supplier_phone  text,
  supplier_email  text,
  last_restocked  timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, name)
);

CREATE INDEX IF NOT EXISTS idx_inventory_restaurant ON inventory_items(restaurant_id);

-- Inventory Transaction / Wastage Logs
CREATE TABLE IF NOT EXISTS inventory_logs (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  item_id         uuid NOT NULL REFERENCES inventory_items(id) ON DELETE CASCADE,
  change_qty      numeric(10,2) NOT NULL, -- positive for restock, negative for deduction
  reason          text NOT NULL CHECK (reason IN ('purchase', 'order_consumption', 'wastage', 'manual_adjustment', 'expiry', 'return')),
  logged_by       text DEFAULT 'System',
  notes           text,
  created_at      timestamptz DEFAULT now()
);

-- Seed core inventory items for flagship restaurant
INSERT INTO inventory_items (restaurant_id, name, category, unit, current_stock, min_stock, cost_per_unit, supplier_name)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Chicken Breast (Boneless)', 'Poultry', 'kg', 18.5, 10.0, 240.0, 'Premium Agro Farms'),
  ('10000000-0000-0000-0000-000000000001', 'Fresh Atlantic Salmon', 'Seafood', 'kg', 6.0, 5.0, 850.0, 'Coastal Catch Importers'),
  ('10000000-0000-0000-0000-000000000001', 'Malai Paneer', 'Dairy', 'kg', 14.0, 8.0, 320.0, 'Golden Dairy Co.'),
  ('10000000-0000-0000-0000-000000000001', 'Basmati Rice (Aged)', 'Grains', 'kg', 45.0, 20.0, 110.0, 'Punjab Heritage Mills'),
  ('10000000-0000-0000-0000-000000000001', 'Hass Avocados', 'Produce', 'kg', 4.5, 6.0, 480.0, 'Green Harvest Fresh'),
  ('10000000-0000-0000-0000-000000000001', 'Dairy Butter', 'Dairy', 'kg', 12.0, 8.0, 440.0, 'Golden Dairy Co.'),
  ('10000000-0000-0000-0000-000000000001', 'Fresh Cooking Cream', 'Dairy', 'liters', 9.0, 5.0, 180.0, 'Golden Dairy Co.'),
  ('10000000-0000-0000-0000-000000000001', 'Organic Quinoa', 'Grains', 'kg', 8.0, 5.0, 350.0, 'Superfood Supplies')
ON CONFLICT (restaurant_id, name) DO NOTHING;

-- ── 9. Customer CRM ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  name            text NOT NULL,
  phone           text NOT NULL,
  email           text,
  total_orders    integer DEFAULT 0,
  total_spent     numeric(10,2) DEFAULT 0,
  last_order_date timestamptz,
  loyalty_tier    text DEFAULT 'regular' CHECK (loyalty_tier IN ('new', 'regular', 'vip', 'inactive')),
  dietary_notes   text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, phone)
);

CREATE INDEX IF NOT EXISTS idx_customers_restaurant_phone ON customers(restaurant_id, phone);

-- ── 10. Coupons & Promotions ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS coupons (
  id              uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id   uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  code            text NOT NULL,
  discount_type   text NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
  discount_value  numeric(10,2) NOT NULL,
  min_order_amount numeric(10,2) DEFAULT 0,
  max_discount_amount numeric(10,2),
  valid_from      timestamptz DEFAULT now(),
  valid_until     timestamptz,
  usage_limit     integer DEFAULT 500,
  times_used      integer DEFAULT 0,
  is_active       boolean DEFAULT true,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (restaurant_id, code)
);

-- Seed sample welcome coupons
INSERT INTO coupons (restaurant_id, code, discount_type, discount_value, min_order_amount, max_discount_amount)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'PRATHOMIX10', 'percentage', 10.0, 500.0, 200.0),
  ('10000000-0000-0000-0000-000000000001', 'WELCOME150', 'flat', 150.0, 800.0, 150.0),
  ('10000000-0000-0000-0000-000000000001', 'LUXURY20', 'percentage', 20.0, 1200.0, 500.0)
ON CONFLICT (restaurant_id, code) DO NOTHING;

-- ── 11. Audit Logging ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid REFERENCES restaurants(id) ON DELETE CASCADE,
  user_id       uuid,
  user_name     text NOT NULL,
  user_role     text NOT NULL,
  action        text NOT NULL,
  entity        text NOT NULL,
  entity_id     text,
  details       text,
  ip_address    text,
  created_at    timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_audit_restaurant_time ON audit_logs(restaurant_id, created_at DESC);

-- ── 12. Reviews & Guest Feedback ──────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
  id            uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id uuid NOT NULL REFERENCES restaurants(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  order_id      uuid REFERENCES orders(id) ON DELETE SET NULL,
  overall_rating integer NOT NULL CHECK (overall_rating BETWEEN 1 AND 5),
  food_rating   integer CHECK (food_rating BETWEEN 1 AND 5),
  service_rating integer CHECK (service_rating BETWEEN 1 AND 5),
  comment       text,
  management_response text,
  responded_at  timestamptz,
  created_at    timestamptz DEFAULT now()
);

-- Seed sample feedback
INSERT INTO reviews (restaurant_id, customer_name, overall_rating, food_rating, service_rating, comment)
VALUES
  ('10000000-0000-0000-0000-000000000001', 'Vikramaditya Roy', 5, 5, 5, 'Exceptional experience. The Grilled Chicken Powerhouse and ambience are unmatched.'),
  ('10000000-0000-0000-0000-000000000001', 'Ananya Deshmukh', 5, 5, 4, 'Loved the Salmon Teriyaki and the effortless QR table ordering system.'),
  ('10000000-0000-0000-0000-000000000001', 'Rahul Khanna', 4, 4, 4, 'The butter chicken was velvety and rich. Great service during peak dinner hours.')
ON CONFLICT DO NOTHING;

-- ── 13. Enable RLS on New Tables ──────────────────────────────────────────────
ALTER TABLE restaurants       ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE restaurant_tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories        ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_items   ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs    ENABLE ROW LEVEL SECURITY;
ALTER TABLE customers         ENABLE ROW LEVEL SECURITY;
ALTER TABLE coupons           ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs        ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews           ENABLE ROW LEVEL SECURITY;

-- Public read policies for menu, restaurants, tables, and coupons
CREATE POLICY "Public read restaurants" ON restaurants FOR SELECT USING (true);
CREATE POLICY "Public read categories"  ON categories  FOR SELECT USING (true);
CREATE POLICY "Public read tables"      ON restaurant_tables FOR SELECT USING (true);
CREATE POLICY "Public read coupons"     ON coupons     FOR SELECT USING (is_active = true);
CREATE POLICY "Public read reviews"     ON reviews     FOR SELECT USING (true);
CREATE POLICY "Allow public insert reviews" ON reviews FOR INSERT WITH CHECK (true);

-- Allow public insert/read profiles for demo and signup flow
CREATE POLICY "Public read profiles"    ON profiles    FOR SELECT USING (true);
CREATE POLICY "Public write profiles"   ON profiles    FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update profiles"  ON profiles    FOR UPDATE USING (true);

-- Allow staff operations on inventory and audit
CREATE POLICY "Allow read inventory"    ON inventory_items FOR SELECT USING (true);
CREATE POLICY "Allow write inventory"   ON inventory_items FOR ALL USING (true);
CREATE POLICY "Allow read inventory logs" ON inventory_logs FOR SELECT USING (true);
CREATE POLICY "Allow write inventory logs" ON inventory_logs FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow read customers"    ON customers FOR SELECT USING (true);
CREATE POLICY "Allow write customers"   ON customers FOR ALL USING (true);
CREATE POLICY "Allow read audit"        ON audit_logs FOR SELECT USING (true);
CREATE POLICY "Allow insert audit"      ON audit_logs FOR INSERT WITH CHECK (true);
