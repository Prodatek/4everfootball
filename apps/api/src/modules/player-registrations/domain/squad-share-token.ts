import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * §5 B5 of MONETISATION_UI_BRIEF.md: "a shareable link... clubs will
 * screenshot this and send it to their organiser." Stateless by design —
 * no new table/column, no migration — derived deterministically from
 * (competitionId, teamId) plus a server secret, so it's unguessable
 * without the secret but never needs storing or expiring. Trade-off: it
 * can't be individually revoked; acceptable for a read-only status view
 * that carries no guardian/consent data (see the controller for exactly
 * what it returns).
 */
export function generateSquadShareToken(
  secret: string,
  competitionId: string,
  teamId: string,
): string {
  return createHmac('sha256', secret)
    .update(`${competitionId}:${teamId}`)
    .digest('hex')
    .slice(0, 32);
}

export function verifySquadShareToken(
  secret: string,
  competitionId: string,
  teamId: string,
  candidate: string,
): boolean {
  const expected = generateSquadShareToken(secret, competitionId, teamId);
  const expectedBuf = Buffer.from(expected);
  const candidateBuf = Buffer.from(candidate);

  return (
    expectedBuf.length === candidateBuf.length &&
    timingSafeEqual(expectedBuf, candidateBuf)
  );
}
