/**
 * Mirrors apps/api/src/modules/player-registrations/domain/guardian-consent.ts
 * exactly (same cutoff, same proper age calc) so the inline validation this
 * screen promises ("validated at entry, not at submit" — brief §5 B3) agrees
 * with what the server will actually enforce. Duplicated rather than shared
 * because it lives in the API's domain layer, not @4ef/shared; a real
 * follow-up would move it there so the two can never drift.
 */
const MINOR_AGE_CUTOFF = 18;

export function isMinor(dateOfBirth: string, asOf: Date = new Date()): boolean {
  const dob = new Date(dateOfBirth);
  let age = asOf.getFullYear() - dob.getFullYear();
  const monthDiff = asOf.getMonth() - dob.getMonth();

  if (monthDiff < 0 || (monthDiff === 0 && asOf.getDate() < dob.getDate())) {
    age -= 1;
  }

  return age < MINOR_AGE_CUTOFF;
}

export function hasCompleteGuardianConsent(input: {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}): boolean {
  return Boolean(input.guardianName && (input.guardianPhone || input.guardianEmail));
}
