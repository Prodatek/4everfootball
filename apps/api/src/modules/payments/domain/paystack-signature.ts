import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Paystack signs every webhook body with HMAC-SHA512 of the secret key
 * (brief §3.5). Verified against the RAW body — not the JSON-parsed one,
 * since re-serializing JSON can produce different bytes than what was
 * actually signed (key order, whitespace, number formatting). Comparison is
 * timing-safe so this can't be brute-forced by an attacker measuring
 * response latency across many attempts.
 */
export function verifyPaystackSignature(
  rawBody: Buffer | string,
  signatureHeader: string | undefined,
  secretKey: string,
): boolean {
  if (!signatureHeader) {
    return false;
  }

  const expected = createHmac('sha512', secretKey)
    .update(rawBody)
    .digest('hex');
  const expectedBuffer = Buffer.from(expected, 'hex');
  const providedBuffer = Buffer.from(signatureHeader, 'hex');

  // timingSafeEqual throws on mismatched lengths rather than returning
  // false — an attacker-controlled header (wrong length) must still result
  // in "not valid", not an unhandled exception.
  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}
