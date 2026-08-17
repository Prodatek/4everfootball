import { ageInYears } from '../../graphics/domain/age';

// Simple, fixed bands rather than a configurable range — the impact report
// needs consistent, comparable groupings across competitions and seasons,
// not organiser-tunable buckets.
const BANDS = [
  { label: 'Under 13', max: 12 },
  { label: '13-15', max: 15 },
  { label: '16-18', max: 18 },
  { label: '19+', max: Infinity },
] as const;

export function ageBucket(
  dateOfBirth: Date | null,
  asOf: Date = new Date(),
): string {
  if (!dateOfBirth) {
    return 'Unknown';
  }

  const age = ageInYears(dateOfBirth, asOf);
  const band = BANDS.find((b) => age <= b.max);
  return band?.label ?? 'Unknown';
}
