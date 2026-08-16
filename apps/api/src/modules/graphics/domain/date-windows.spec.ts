import { startOfDay, endOfDay, addDays } from './date-windows';

describe('date-windows', () => {
  it('startOfDay zeroes the time to midnight', () => {
    const result = startOfDay(new Date('2026-08-16T14:32:07.123Z'));
    expect(result.getHours()).toBe(0);
    expect(result.getMinutes()).toBe(0);
    expect(result.getSeconds()).toBe(0);
    expect(result.getMilliseconds()).toBe(0);
  });

  it('endOfDay sets the time to the last millisecond of the day', () => {
    const result = endOfDay(new Date('2026-08-16T14:32:07.123Z'));
    expect(result.getHours()).toBe(23);
    expect(result.getMinutes()).toBe(59);
    expect(result.getSeconds()).toBe(59);
    expect(result.getMilliseconds()).toBe(999);
  });

  it('addDays shifts the calendar day without mutating the input', () => {
    const original = new Date('2026-08-16T14:32:07.123Z');
    const result = addDays(original, 1);
    expect(result.getDate()).toBe(original.getDate() + 1);
    expect(original.getDate()).toBe(16);
  });

  it('addDays with a negative number goes backward', () => {
    const result = addDays(new Date('2026-08-16T00:00:00.000Z'), -7);
    expect(result.getDate()).toBe(9);
  });
});
