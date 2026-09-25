import { TableSession } from './tableSession';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';

export interface OrderItemRiskCheck {
  id: string;
  name: string;
  qty: number;
  price: number;
}

export interface RiskEvaluationParams {
  order_type: string;
  restaurant_id: string;
  table_number?: number | null;
  total_amount: number;
  items: OrderItemRiskCheck[];
  session?: TableSession | null;
  table_status?: string | null;
  existing_table_orders?: { id: string; status: string; created_at: string; total_amount: number }[];
  device_fingerprint?: string;
  is_first_order_on_table?: boolean;
}

export interface RiskEvaluationResult {
  risk_level: RiskLevel;
  requires_verification: boolean;
  is_blocked: boolean;
  block_message?: string;
  reasons: string[];
  action: 'PROCEED_AUTOMATIC' | 'REQUIRE_STAFF_VERIFICATION' | 'HOLD_FOR_MANAGER';
}

// Configurable threshold defaults
const THRESHOLDS = {
  MAX_UNVERIFIED_AMOUNT: 1500, // Orders above ₹1,500 require staff confirmation
  HIGH_RISK_AMOUNT: 5000,      // Orders above ₹5,000 flagged as HIGH risk hold
  MAX_ITEM_QTY: 8,             // Single item quantity >= 8 flagged
  RAPID_ORDER_WINDOW_MS: 3 * 60 * 1000, // 3 minutes
  MAX_PENDING_UNVERIFIED_ORDERS: 2, // Max unconfirmed orders before hold
};

/**
 * Deterministic rule-based fraud risk evaluation engine.
 * Never depends on external AI models — fast, consistent, and predictable.
 */
export function evaluateFraudRisk(params: RiskEvaluationParams): RiskEvaluationResult {
  const reasons: string[] = [];
  let riskScore = 0; // 0-2: LOW, 3-5: MEDIUM, >=6: HIGH
  let isBlocked = false;
  let blockMessage: string | undefined;

  // Non-dine-in orders (takeaway/delivery) have separate verification
  if (params.order_type !== 'dine_in') {
    return {
      risk_level: 'LOW',
      requires_verification: false,
      is_blocked: false,
      reasons: [],
      action: 'PROCEED_AUTOMATIC',
    };
  }

  // ── Rule 1: Table Operational State Validation ─────────────────────────────
  if (params.table_status) {
    const invalidStatuses = ['cleaning', 'closed', 'blocked'];
    if (invalidStatuses.includes(params.table_status.toLowerCase())) {
      return {
        risk_level: 'HIGH',
        requires_verification: true,
        is_blocked: true,
        block_message: `Table ${params.table_number || ''} is currently being serviced (${params.table_status}). Dine-in orders cannot be placed right now.`,
        reasons: [`Table in invalid state: ${params.table_status}`],
        action: 'HOLD_FOR_MANAGER',
      };
    }
  }

  // ── Rule 2: Session Validity & Trusted Presence Check ──────────────────────
  const session = params.session;
  const isTrusted = session?.is_trusted ?? false;

  if (!isTrusted) {
    riskScore += 2;
    reasons.push('First order on table / physical presence not yet verified by server');
  }

  // ── Rule 3: High-Value Order Thresholds ────────────────────────────────────
  if (params.total_amount >= THRESHOLDS.HIGH_RISK_AMOUNT) {
    riskScore += 6;
    reasons.push(`Unusually high-value order (₹${params.total_amount} >= ₹${THRESHOLDS.HIGH_RISK_AMOUNT})`);
  } else if (params.total_amount > THRESHOLDS.MAX_UNVERIFIED_AMOUNT && !isTrusted) {
    riskScore += 3;
    reasons.push(`High-value unverified order (₹${params.total_amount} > ₹${THRESHOLDS.MAX_UNVERIFIED_AMOUNT})`);
  }

  // ── Rule 4: Abnormal Single-Item Quantity ──────────────────────────────────
  for (const item of params.items) {
    if (item.qty >= THRESHOLDS.MAX_ITEM_QTY) {
      riskScore += 3;
      reasons.push(`High quantity of single dish (${item.qty}x "${item.name}")`);
      break;
    }
  }

  // ── Rule 5: Rapid Order Velocity from Same Table / Session ─────────────────
  if (params.existing_table_orders && params.existing_table_orders.length > 0) {
    const nowMs = Date.now();
    const recentOrders = params.existing_table_orders.filter((o) => {
      const orderTime = new Date(o.created_at).getTime();
      return nowMs - orderTime < THRESHOLDS.RAPID_ORDER_WINDOW_MS;
    });

    if (recentOrders.length >= 1) {
      riskScore += 3;
      reasons.push(`Rapid order velocity detected (${recentOrders.length} order in past 3 minutes)`);
    }

    // ── Rule 6: Accumulation of Unconfirmed Pending Orders ───────────────────
    const pendingOrders = params.existing_table_orders.filter(
      (o) => o.status === 'pending_verification' || o.status === 'placed'
    );
    if (pendingOrders.length >= THRESHOLDS.MAX_PENDING_UNVERIFIED_ORDERS && !isTrusted) {
      riskScore += 4;
      reasons.push(`${pendingOrders.length} previous orders still pending table verification`);
    }
  }

  // ── Rule 7: Session Expiry Approaching ──────────────────────────────────────
  if (session?.expires_at) {
    const remainingMs = new Date(session.expires_at).getTime() - Date.now();
    if (remainingMs <= 5 * 60 * 1000 && remainingMs > 0) {
      riskScore += 1;
      reasons.push('Session near expiration (< 5 mins remaining)');
    }
  }

  // Compute final risk level
  let riskLevel: RiskLevel = 'LOW';
  if (riskScore >= 6) {
    riskLevel = 'HIGH';
  } else if (riskScore >= 2) {
    riskLevel = 'MEDIUM';
  }

  // For dine-in, ALL untrusted sessions or medium/high risk MUST be verified before reaching the kitchen
  const requiresVerification = !isTrusted || riskLevel !== 'LOW';

  let action: RiskEvaluationResult['action'] = 'PROCEED_AUTOMATIC';
  if (riskLevel === 'HIGH') {
    action = 'HOLD_FOR_MANAGER';
  } else if (requiresVerification) {
    action = 'REQUIRE_STAFF_VERIFICATION';
  }

  return {
    risk_level: riskLevel,
    requires_verification: requiresVerification,
    is_blocked: isBlocked,
    block_message: blockMessage,
    reasons,
    action,
  };
}
