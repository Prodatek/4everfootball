const MINOR_AGE_CUTOFF = 18;

/**
 * §6 "Data ownership and consent": guardian consent captured at
 * registration for anyone under 18. Age is computed properly (accounting
 * for whether this year's birthday has passed yet), not just a year
 * subtraction, since a player registered in January whose birthday is in
 * December is still that many years old, not one year older.
 */
export function isMinor(dateOfBirth: Date, asOf: Date = new Date()): boolean {
  let age = asOf.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = asOf.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOf.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age < MINOR_AGE_CUTOFF;
}

export interface GuardianConsentInput {
  guardianName?: string;
  guardianPhone?: string;
  guardianEmail?: string;
}

export function hasCompleteGuardianConsent(
  input: GuardianConsentInput,
): boolean {
  return Boolean(
    input.guardianName && (input.guardianPhone || input.guardianEmail),
  );
}
