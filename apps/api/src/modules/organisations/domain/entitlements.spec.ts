import {
  canCreateCommunityCompetition,
  canForLicenceStatus,
  checkTeamLimit,
  effectiveMaxTeams,
} from './entitlements';

describe('canCreateCommunityCompetition', () => {
  it('allows the first COMMUNITY competition', () => {
    expect(canCreateCommunityCompetition(0)).toBe(true);
  });

  it('blocks a second COMMUNITY competition while the first is still open', () => {
    expect(canCreateCommunityCompetition(1)).toBe(false);
  });
});

describe('checkTeamLimit', () => {
  it('is never gated when maxTeams is null (grandfathered/unlimited competitions)', () => {
    expect(checkTeamLimit(500, null)).toEqual({
      withinLimit: true,
      needsUpgrade: false,
    });
  });

  it('is within limit below the cap', () => {
    expect(checkTeamLimit(7, 8)).toEqual({
      withinLimit: true,
      needsUpgrade: false,
    });
  });

  it('needs an upgrade at or above the cap, never a hard block flag', () => {
    expect(checkTeamLimit(8, 8)).toEqual({
      withinLimit: false,
      needsUpgrade: true,
    });
    expect(checkTeamLimit(9, 8)).toEqual({
      withinLimit: false,
      needsUpgrade: true,
    });
  });
});

describe('effectiveMaxTeams', () => {
  it('caps a COMMUNITY tier competition at the free-tier limit even with no maxTeams set', () => {
    expect(effectiveMaxTeams('COMMUNITY', null)).toBe(8);
  });

  it('caps a COMMUNITY tier competition at the lower of maxTeams and the free-tier limit', () => {
    expect(effectiveMaxTeams('COMMUNITY', 20)).toBe(8);
    expect(effectiveMaxTeams('COMMUNITY', 5)).toBe(5);
  });

  it('leaves non-COMMUNITY tiers untouched, including unlimited (null)', () => {
    expect(effectiveMaxTeams('FEDERATION', null)).toBeNull();
    expect(effectiveMaxTeams('LEAGUE', 48)).toBe(48);
  });
});

describe('canForLicenceStatus', () => {
  it('grants gated features once licensed or active', () => {
    expect(canForLicenceStatus('DATA_EXPORT', 'LICENSED')).toBe(true);
    expect(canForLicenceStatus('DATA_EXPORT', 'ACTIVE')).toBe(true);
  });

  it('denies gated features for draft/unpaid/closed/suspended competitions', () => {
    expect(canForLicenceStatus('DATA_EXPORT', 'DRAFT')).toBe(false);
    expect(canForLicenceStatus('DATA_EXPORT', 'AWAITING_DEPOSIT')).toBe(false);
    expect(canForLicenceStatus('DATA_EXPORT', 'CLOSED')).toBe(false);
    expect(canForLicenceStatus('DATA_EXPORT', 'SUSPENDED')).toBe(false);
  });
});
