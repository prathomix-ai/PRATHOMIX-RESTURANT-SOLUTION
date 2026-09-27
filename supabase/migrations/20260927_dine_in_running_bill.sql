-- Running Bill: add payment tracking columns to orders table (safe - idempotent)
-- Run this in Supabase SQL Editor

-- Add session_id column to orders if not exists
ALTER TABLE orders ADD COLUMN IF NOT EXISTS session_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_type text DEFAULT 'dine_in';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS order_number text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS verification_status text DEFAULT 'CONFIRMED';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS risk_level text DEFAULT 'LOW';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS risk_reasons text[];
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tax_amount numeric(10,2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_fee numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount numeric(10,2) DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'pending';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_method text DEFAULT 'cash';
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_phone text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_address text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS notes text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_id text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS waiter_name text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS restaurant_id uuid;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS items_detail jsonb;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS idempotency_key text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

-- Create table_sessions table for dine-in session management
CREATE TABLE IF NOT EXISTS table_sessions (
  id                uuid        DEFAULT gen_random_uuid() PRIMARY KEY,
  restaurant_id     uuid        NOT NULL,
  table_number      integer     NOT NULL CHECK (table_number > 0),
  session_token     text        UNIQUE NOT NULL,
  device_fingerprint text,
  status            text        DEFAULT 'ACTIVE'
                               CHECK (status IN ('ACTIVE','EXPIRED','CLOSED','CANCELLED','REQUIRES_VERIFICATION')),
  is_trusted        boolean     DEFAULT false,
  trusted_by        text,
  trusted_at        timestamptz,
  customer_name     text        DEFAULT 'Guest',
  customer_phone    text,
  order_count       integer     DEFAULT 0,
  total_spent       numeric(10,2) DEFAULT 0,
  bill_payment_status text      DEFAULT 'pending'
                               CHECK (bill_payment_status IN ('pending','partial','paid')),
  bill_paid_amount  numeric(10,2) DEFAULT 0,
  bill_payment_method text,
  bill_paid_at      timestamptz,
  bill_idempotency_key text,
  created_at        timestamptz DEFAULT now(),
  last_activity_at  timestamptz DEFAULT now(),
  expires_at        timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_table_sessions_token ON table_sessions(session_token);
CREATE INDEX IF NOT EXISTS idx_table_sessions_table ON table_sessions(restaurant_id, table_number, status);
CREATE INDEX IF NOT EXISTS idx_orders_session ON orders(session_id);
CREATE INDEX IF NOT EXISTS idx_orders_table_status ON orders(table_number, status);

-- RLS
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Allow all table sessions" ON table_sessions FOR ALL USING (true) WITH CHECK (true);
