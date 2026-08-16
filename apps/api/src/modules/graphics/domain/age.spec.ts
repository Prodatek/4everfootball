import { ageInYears, formatAgeLabel } from './age';

describe('ageInYears', () => {
  it('subtracts birth year from the reference year when the birthday has passed', () => {
    expect(ageInYears(new Date('2010-01-01'), new Date('2026-06-01'))).toBe(16);
  });

  it('does not count this year yet when the birthday has not happened', () => {
    expect(ageInYears(new Date('2010-12-31'), new Date('2026-06-01'))).toBe(15);
  });

  it('counts the exact birthday as already turned', () => {
    expect(ageInYears(new Date('2010-06-01'), new Date('2026-06-01'))).toBe(16);
  });

  it('counts the day before the birthday as not yet turned', () => {
    expect(ageInYears(new Date('2010-06-01'), new Date('2026-05-31'))).toBe(15);
  });
});

describe('formatAgeLabel', () => {
  it('formats a known date of birth as "N years"', () => {
    expect(formatAgeLabel(new Date('2010-01-01'), new Date('2026-06-01'))).toBe(
      '16 years',
    );
  });

  it('returns null when there is no date of birth on file', () => {
    expect(formatAgeLabel(null)).toBeNull();
  });
});
