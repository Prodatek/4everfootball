// Thresholds for the MILESTONE template (brief §4: "thresholds (100th
// goal, 500th player)"). A small fixed ladder rather than every-Nth check —
// milestones are supposed to be rare and celebratory, not a card every 10
// events.
export const PLAYER_GOAL_MILESTONES = [10, 25, 50, 100, 200, 300, 500] as const;
export const PLATFORM_PLAYER_MILESTONES = [
  100, 500, 1_000, 5_000, 10_000, 50_000,
] as const;

/**
 * True exactly when `count` lands on a threshold — called with the new
 * total immediately after the record that pushed it there, so it fires
 * exactly once per threshold rather than "every event past N".
 */
export function crossedMilestone(
  count: number,
  thresholds: readonly number[],
): number | null {
  return thresholds.includes(count) ? count : null;
}
