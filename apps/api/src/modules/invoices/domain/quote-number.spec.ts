import { formatQuoteNumber } from './quote-number';

describe('formatQuoteNumber', () => {
  it('pads a small sequence number to 4 digits', () => {
    expect(formatQuoteNumber('4EV', 2026, 1)).toBe('4EV-2026-0001');
  });

  it('does not truncate a sequence number wider than 4 digits', () => {
    expect(formatQuoteNumber('4EV', 2026, 12345)).toBe('4EV-2026-12345');
  });

  it('uses the exact prefix and year given, no normalisation', () => {
    expect(formatQuoteNumber('ACME', 2030, 42)).toBe('ACME-2030-0042');
  });

  it('rejects a zero or negative sequence', () => {
    expect(() => formatQuoteNumber('4EV', 2026, 0)).toThrow();
    expect(() => formatQuoteNumber('4EV', 2026, -1)).toThrow();
  });

  it('rejects a non-integer sequence', () => {
    expect(() => formatQuoteNumber('4EV', 2026, 1.5)).toThrow();
  });
});
