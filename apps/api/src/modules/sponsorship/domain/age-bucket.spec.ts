import { ageBucket } from './age-bucket';

describe('ageBucket', () => {
  const asOf = new Date('2026-08-16');

  it('returns "Unknown" when there is no date of birth on file', () => {
    expect(ageBucket(null, asOf)).toBe('Unknown');
  });

  it('buckets a 10 year old as Under 13', () => {
    expect(ageBucket(new Date('2016-01-01'), asOf)).toBe('Under 13');
  });

  it('buckets a 14 year old as 13-15', () => {
    expect(ageBucket(new Date('2012-01-01'), asOf)).toBe('13-15');
  });

  it('buckets a 17 year old as 16-18', () => {
    expect(ageBucket(new Date('2009-01-01'), asOf)).toBe('16-18');
  });

  it('buckets a 25 year old as 19+', () => {
    expect(ageBucket(new Date('2001-01-01'), asOf)).toBe('19+');
  });

  it('places an exact 12th birthday in Under 13', () => {
    expect(ageBucket(new Date('2014-08-16'), asOf)).toBe('Under 13');
  });

  it('places an exact 13th birthday in 13-15', () => {
    expect(ageBucket(new Date('2013-08-16'), asOf)).toBe('13-15');
  });
});
