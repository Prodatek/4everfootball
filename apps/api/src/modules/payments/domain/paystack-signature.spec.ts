import { createHmac } from 'node:crypto';
import { verifyPaystackSignature } from './paystack-signature';

const SECRET = 'sk_test_super_secret_key';

function sign(body: string, secret = SECRET): string {
  return createHmac('sha512', secret).update(body).digest('hex');
}

describe('verifyPaystackSignature', () => {
  it('accepts a correctly signed body', () => {
    const body = JSON.stringify({
      event: 'charge.success',
      data: { reference: 'abc123' },
    });
    expect(verifyPaystackSignature(body, sign(body), SECRET)).toBe(true);
  });

  it('rejects a body signed with a different secret (as if an attacker guessed)', () => {
    const body = JSON.stringify({ event: 'charge.success' });
    expect(
      verifyPaystackSignature(body, sign(body, 'wrong-secret'), SECRET),
    ).toBe(false);
  });

  it('rejects a tampered body that no longer matches its signature', () => {
    const original = JSON.stringify({
      event: 'charge.success',
      data: { amount: 100000 },
    });
    const signature = sign(original);
    const tampered = JSON.stringify({
      event: 'charge.success',
      data: { amount: 999999999 },
    });
    expect(verifyPaystackSignature(tampered, signature, SECRET)).toBe(false);
  });

  it('rejects a missing signature header entirely', () => {
    expect(verifyPaystackSignature('{}', undefined, SECRET)).toBe(false);
  });

  it('rejects a garbage/wrong-length signature header without throwing', () => {
    expect(() =>
      verifyPaystackSignature('{}', 'not-a-real-signature', SECRET),
    ).not.toThrow();
    expect(verifyPaystackSignature('{}', 'not-a-real-signature', SECRET)).toBe(
      false,
    );
  });

  it('works against a Buffer raw body, not just a string', () => {
    const body = Buffer.from(JSON.stringify({ event: 'charge.success' }));
    const signature = createHmac('sha512', SECRET).update(body).digest('hex');
    expect(verifyPaystackSignature(body, signature, SECRET)).toBe(true);
  });
});
