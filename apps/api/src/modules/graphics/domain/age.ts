/**
 * Birthday-aware age in whole years, for the player passport card's age
 * badge — same calculation as player-registrations/domain/guardian-consent's
 * isMinor(), just returning the number instead of a threshold check.
 */
export function ageInYears(dateOfBirth: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - dateOfBirth.getFullYear();
  const monthDiff = asOf.getMonth() - dateOfBirth.getMonth();

  if (
    monthDiff < 0 ||
    (monthDiff === 0 && asOf.getDate() < dateOfBirth.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function formatAgeLabel(
  dateOfBirth: Date | null,
  asOf: Date = new Date(),
): string | null {
  if (!dateOfBirth) {
    return null;
  }

  const age = ageInYears(dateOfBirth, asOf);
  return `${age} years`;
}
