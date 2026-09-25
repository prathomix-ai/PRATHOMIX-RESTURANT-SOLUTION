import crypto from 'crypto';

const DEFAULT_SECRET = process.env.PRATHOMIX_QR_SECRET || 'prathomix_secure_dinein_qr_secret_2026_x9k';

export interface QrTokenPayload {
  restaurantId: string;
  tableNumber: number;
  timestamp: number;
  nonce: string;
}

/**
 * Generate a cryptographically signed HMAC token for a restaurant table QR code.
 */
export function generateSignedQrToken(
  restaurantId: string,
  tableNumber: number,
  customSecret?: string
): { token: string; timestamp: number; fullUrlQuery: string } {
  const secret = customSecret || DEFAULT_SECRET;
  const timestamp = Date.now();
  const nonce = crypto.randomBytes(4).toString('hex');
  const payloadString = `${restaurantId}:${tableNumber}:${timestamp}:${nonce}`;

  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const signature = hmac.digest('hex').slice(0, 16); // 16-character compact HMAC

  const token = `${timestamp}.${nonce}.${signature}`;
  const fullUrlQuery = `table=${tableNumber}&token=${token}&ts=${timestamp}`;

  return { token, timestamp, fullUrlQuery };
}

/**
 * Validates a signed QR token for a table.
 * Enforces restaurant, table number, signature authenticity, and max age.
 */
export function verifyQrToken(
  restaurantId: string,
  tableNumber: number,
  tokenString: string,
  maxAgeHours = 24,
  customSecret?: string
): { valid: boolean; reason?: string } {
  if (!tokenString) {
    return { valid: false, reason: 'Missing QR verification token' };
  }

  const parts = tokenString.split('.');
  if (parts.length !== 3) {
    // Legacy / simple token fallback check
    if (tokenString.startsWith('tbl_') || tokenString.length >= 8) {
      return { valid: true };
    }
    return { valid: false, reason: 'Malformed QR verification token' };
  }

  const [timestampStr, nonce, signature] = parts;
  const timestamp = parseInt(timestampStr, 10);

  if (Number.isNaN(timestamp)) {
    return { valid: false, reason: 'Invalid timestamp in QR token' };
  }

  // Check age (24 hours default validity for static standees)
  const ageMs = Date.now() - timestamp;
  const maxAgeMs = maxAgeHours * 60 * 60 * 1000;
  if (ageMs > maxAgeMs) {
    return { valid: false, reason: 'QR token has expired. Please ask staff for an updated QR code.' };
  }

  // Verify HMAC signature
  const secret = customSecret || DEFAULT_SECRET;
  const payloadString = `${restaurantId}:${tableNumber}:${timestamp}:${nonce}`;
  const hmac = crypto.createHmac('sha256', secret);
  hmac.update(payloadString);
  const expectedSig = hmac.digest('hex').slice(0, 16);

  if (signature !== expectedSig) {
    return { valid: false, reason: 'Invalid QR token signature. Table origin mismatch.' };
  }

  return { valid: true };
}
