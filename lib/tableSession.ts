import { supabase, RESTAURANT_TABLES, DEFAULT_RESTAURANT_ID } from './supabase';
import crypto from 'crypto';

export type SessionStatus = 'ACTIVE' | 'EXPIRED' | 'CLOSED' | 'CANCELLED' | 'REQUIRES_VERIFICATION';

export interface TableSession {
  id: string;
  restaurant_id: string;
  table_number: number;
  session_token: string;
  device_fingerprint?: string;
  status: SessionStatus;
  is_trusted: boolean; // True once waiter/reception physically verifies guest at table
  trusted_by?: string;
  trusted_at?: string;
  customer_name?: string;
  customer_phone?: string;
  order_count: number;
  total_spent: number;
  created_at: string;
  last_activity_at: string;
  expires_at: string;
}

// In-memory resilient cache / fallback for table sessions
const memorySessions = new Map<string, TableSession>();

const DEFAULT_SESSION_DURATION_MS = 2 * 60 * 60 * 1000; // 2 hours

/**
 * Creates or retrieves an active dine-in table session.
 */
export async function getOrCreateTableSession(params: {
  restaurantId?: string;
  tableNumber: number;
  sessionToken?: string;
  deviceFingerprint?: string;
  customerName?: string;
  customerPhone?: string;
}): Promise<TableSession> {
  const restaurantId = params.restaurantId || DEFAULT_RESTAURANT_ID;
  const tableNum = Number(params.tableNumber);
  const now = new Date();
  const nowMs = now.getTime();

  // 1. If an existing session token is provided, check if it's active
  if (params.sessionToken) {
    const cached = memorySessions.get(params.sessionToken);
    if (cached && cached.table_number === tableNum && cached.restaurant_id === restaurantId) {
      if (new Date(cached.expires_at).getTime() > nowMs && cached.status === 'ACTIVE') {
        // Sliding activity update
        cached.last_activity_at = now.toISOString();
        cached.expires_at = new Date(nowMs + DEFAULT_SESSION_DURATION_MS).toISOString();
        return cached;
      }
    }

    // Try Supabase lookup
    try {
      const { data, error } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('session_token', params.sessionToken)
        .eq('restaurant_id', restaurantId)
        .eq('table_number', tableNum)
        .single();

      if (data && !error) {
        const expiresMs = new Date(data.expires_at).getTime();
        if (expiresMs > nowMs && data.status === 'ACTIVE') {
          // Update last_activity_at
          await supabase
            .from('table_sessions')
            .update({
              last_activity_at: now.toISOString(),
              expires_at: new Date(nowMs + DEFAULT_SESSION_DURATION_MS).toISOString(),
            })
            .eq('id', data.id);

          const updated: TableSession = {
            ...data,
            last_activity_at: now.toISOString(),
            expires_at: new Date(nowMs + DEFAULT_SESSION_DURATION_MS).toISOString(),
          };
          memorySessions.set(updated.session_token, updated);
          return updated;
        }
      }
    } catch {}
  }

  // 2. Check if there's already an active session for this table in memory
  const allSessions = Array.from(memorySessions.values());
  for (const sess of allSessions) {
    if (
      sess.restaurant_id === restaurantId &&
      sess.table_number === tableNum &&
      sess.status === 'ACTIVE' &&
      new Date(sess.expires_at).getTime() > nowMs
    ) {
      // If same device fingerprint or already active session for this table
      if (!params.deviceFingerprint || sess.device_fingerprint === params.deviceFingerprint) {
        sess.last_activity_at = now.toISOString();
        sess.expires_at = new Date(nowMs + DEFAULT_SESSION_DURATION_MS).toISOString();
        return sess;
      }
    }
  }

  // 3. Create a new dine-in session
  const sessionToken = `sess_${crypto.randomBytes(12).toString('hex')}`;
  const newSession: TableSession = {
    id: crypto.randomUUID(),
    restaurant_id: restaurantId,
    table_number: tableNum,
    session_token: sessionToken,
    device_fingerprint: params.deviceFingerprint || undefined,
    status: 'ACTIVE',
    is_trusted: false, // New sessions start untrusted until verified
    customer_name: params.customerName || 'Guest',
    customer_phone: params.customerPhone || undefined,
    order_count: 0,
    total_spent: 0,
    created_at: now.toISOString(),
    last_activity_at: now.toISOString(),
    expires_at: new Date(nowMs + DEFAULT_SESSION_DURATION_MS).toISOString(),
  };

  // Cache in memory
  memorySessions.set(sessionToken, newSession);

  // Attempt database persistence
  try {
    await supabase.from('table_sessions').insert({
      id: newSession.id,
      restaurant_id: newSession.restaurant_id,
      table_number: newSession.table_number,
      session_token: newSession.session_token,
      device_fingerprint: newSession.device_fingerprint,
      status: newSession.status,
      is_trusted: newSession.is_trusted,
      customer_name: newSession.customer_name,
      customer_phone: newSession.customer_phone,
      order_count: newSession.order_count,
      total_spent: newSession.total_spent,
      created_at: newSession.created_at,
      last_activity_at: newSession.last_activity_at,
      expires_at: newSession.expires_at,
    });
  } catch {}

  return newSession;
}

/**
 * Validates a table session before accepting a dine-in order.
 */
export async function validateTableSession(
  sessionToken?: string,
  tableNumber?: number,
  restaurantId = DEFAULT_RESTAURANT_ID
): Promise<{ valid: boolean; session?: TableSession; reason?: string }> {
  if (!sessionToken) {
    return { valid: false, reason: 'No active table session found. Please scan the table QR code.' };
  }

  const nowMs = Date.now();
  let session = memorySessions.get(sessionToken);

  if (!session) {
    try {
      const { data } = await supabase
        .from('table_sessions')
        .select('*')
        .eq('session_token', sessionToken)
        .eq('restaurant_id', restaurantId)
        .single();
      if (data) {
        session = data as TableSession;
        memorySessions.set(sessionToken, session);
      }
    } catch {}
  }

  if (!session) {
    return { valid: false, reason: 'Invalid dining session. Please scan table QR again.' };
  }

  if (tableNumber && session.table_number !== Number(tableNumber)) {
    return {
      valid: false,
      reason: `Session table mismatch: This session belongs to Table ${session.table_number}, not Table ${tableNumber}.`,
    };
  }

  if (session.status === 'EXPIRED' || new Date(session.expires_at).getTime() <= nowMs) {
    session.status = 'EXPIRED';
    return { valid: false, reason: 'Your dining session has expired. Please scan the table QR code again.' };
  }

  if (session.status === 'CANCELLED' || session.status === 'CLOSED') {
    return { valid: false, reason: 'This table session has ended. Please scan QR for a new session.' };
  }

  return { valid: true, session };
}

/**
 * Marks a table session as trusted once staff confirms physical presence at the table.
 */
export async function markSessionAsTrusted(
  sessionIdOrToken: string,
  staffIdentifier: string
): Promise<boolean> {
  const now = new Date().toISOString();

  // Find in memory
  const allSessions = Array.from(memorySessions.values());
  for (const session of allSessions) {
    if (session.id === sessionIdOrToken || session.session_token === sessionIdOrToken) {
      session.is_trusted = true;
      session.trusted_by = staffIdentifier;
      session.trusted_at = now;
      session.last_activity_at = now;
      break;
    }
  }

  try {
    await supabase
      .from('table_sessions')
      .update({
        is_trusted: true,
        trusted_by: staffIdentifier,
        trusted_at: now,
        last_activity_at: now,
      })
      .or(`id.eq.${sessionIdOrToken},session_token.eq.${sessionIdOrToken}`);
  } catch {}

  return true;
}
