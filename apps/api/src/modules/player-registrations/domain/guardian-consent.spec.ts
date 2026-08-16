import { hasCompleteGuardianConsent, isMinor } from './guardian-consent';

describe('isMinor', () => {
  const asOf = new Date('2026-06-15');

  it('is a minor when clearly under 18', () => {
    expect(isMinor(new Date('2015-01-01'), asOf)).toBe(true);
  });

  it('is not a minor when clearly 18+', () => {
    expect(isMinor(new Date('2000-01-01'), asOf)).toBe(false);
  });

  it('is still 17 the day before their 18th birthday', () => {
    expect(isMinor(new Date('2008-06-16'), asOf)).toBe(true); // turns 18 tomorrow
  });

  it('turns 18 on their exact birthday, not the day after', () => {
    expect(isMinor(new Date('2008-06-15'), asOf)).toBe(false);
  });
});

describe('hasCompleteGuardianConsent', () => {
  it('is complete with a name and a phone', () => {
    expect(
      hasCompleteGuardianConsent({
        guardianName: 'A. Parent',
        guardianPhone: '0800',
      }),
    ).toBe(true);
  });

  it('is complete with a name and an email (either contact method is enough)', () => {
    expect(
      hasCompleteGuardianConsent({
        guardianName: 'A. Parent',
        guardianEmail: 'p@x.com',
      }),
    ).toBe(true);
  });

  it('is incomplete without a name even if contact details exist', () => {
    expect(hasCompleteGuardianConsent({ guardianPhone: '0800' })).toBe(false);
  });

  it('is incomplete with only a name and no way to reach the guardian', () => {
    expect(hasCompleteGuardianConsent({ guardianName: 'A. Parent' })).toBe(
      false,
    );
  });

  it('is incomplete when nothing is provided', () => {
    expect(hasCompleteGuardianConsent({})).toBe(false);
  });
});
