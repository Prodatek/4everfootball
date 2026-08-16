import {
  crossedMilestone,
  PLAYER_GOAL_MILESTONES,
  PLATFORM_PLAYER_MILESTONES,
} from './milestones';

describe('crossedMilestone', () => {
  it('returns the count when it lands exactly on a threshold', () => {
    expect(crossedMilestone(100, PLAYER_GOAL_MILESTONES)).toBe(100);
    expect(crossedMilestone(500, PLATFORM_PLAYER_MILESTONES)).toBe(500);
  });

  it('returns null for a count that is not a threshold', () => {
    expect(crossedMilestone(101, PLAYER_GOAL_MILESTONES)).toBeNull();
    expect(crossedMilestone(99, PLAYER_GOAL_MILESTONES)).toBeNull();
  });

  it('fires exactly once per threshold, not on every count past it', () => {
    const hits = [98, 99, 100, 101, 102].map((n) =>
      crossedMilestone(n, PLAYER_GOAL_MILESTONES),
    );
    expect(hits).toEqual([null, null, 100, null, null]);
  });

  it('returns null for zero or negative counts', () => {
    expect(crossedMilestone(0, PLAYER_GOAL_MILESTONES)).toBeNull();
    expect(crossedMilestone(-5, PLAYER_GOAL_MILESTONES)).toBeNull();
  });
});
