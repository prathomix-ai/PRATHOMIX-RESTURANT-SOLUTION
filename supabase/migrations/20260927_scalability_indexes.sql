-- ============================================================================
-- PRATHOMIX High-Concurrency Scalability & Multi-Tenant Performance Indexes
-- Designed for 100–500 concurrent patrons, waiters, chefs, and management users.
-- ============================================================================

-- 1. Orders: High-frequency operational pipeline indexes
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_created_at 
  ON orders(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status 
  ON orders(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_orders_restaurant_table 
  ON orders(restaurant_id, table_number);

CREATE INDEX IF NOT EXISTS idx_orders_idempotency_key 
  ON orders(idempotency_key) WHERE idempotency_key IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_orders_ready_queue 
  ON orders(restaurant_id, status, ready_at) WHERE status IN ('ready', 'picked_up');

-- 2. Dining Tables: Realtime floor layout & occupancy lookups
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_status 
  ON restaurant_tables(restaurant_id, status);

CREATE INDEX IF NOT EXISTS idx_tables_restaurant_num 
  ON restaurant_tables(restaurant_id, table_number);

-- 3. Bookings & Reservations: Reception date-filtered lookup
CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_date_status 
  ON bookings(restaurant_id, date, status);

CREATE INDEX IF NOT EXISTS idx_bookings_restaurant_created 
  ON bookings(restaurant_id, created_at DESC);

-- 4. Menu & Dishes: Fast customer catalog caching
CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_available 
  ON dishes(restaurant_id, available);

CREATE INDEX IF NOT EXISTS idx_dishes_restaurant_category 
  ON dishes(restaurant_id, category);

-- 5. Staff & Authentication: Instant code verification & role isolation
CREATE INDEX IF NOT EXISTS idx_staff_restaurant_role 
  ON staff_profiles(restaurant_id, role);

CREATE INDEX IF NOT EXISTS idx_staff_employee_code 
  ON staff_profiles(employee_code);

-- 6. Audit & Security Activity: Paginated log queries
CREATE INDEX IF NOT EXISTS idx_audit_restaurant_created 
  ON audit_logs(restaurant_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_audit_restaurant_role 
  ON audit_logs(restaurant_id, user_role, created_at DESC);

-- 7. Serving Notifications: Fast unread queue
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_created 
  ON notifications(restaurant_id, created_at DESC);
