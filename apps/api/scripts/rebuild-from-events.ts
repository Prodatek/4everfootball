/**
 * Phase 1 Definition of Done: "Write a rebuild-from-events command and put
 * it in CI — if the cache and the replay ever disagree, that is a P0."
 *
 * No CI exists in this repo yet (see the Phase 0 report), so this ships as
 * a runnable script instead: `pnpm run rebuild-check` from apps/api. Wiring
 * it into CI is a fast-follow once CI itself exists, not faked here.
 *
 * For every fixture: replays its match_events through the same deriveScore()
 * and verifyEventChain() logic the live write path uses, and reports any
 * fixture where the replayed score disagrees with the cached Fixture row, or
 * whose hash chain doesn't verify. Read-only — never writes anything back.
 *
 * Usage:
 *   pnpm run rebuild-check              # every fixture
 *   pnpm run rebuild-check -- <fixtureId>  # one fixture
 */
import { PrismaClient } from '@prisma/client';
import { deriveScore } from '../src/modules/matches/domain/score-deriver';
import { verifyEventChain, type ChainedEvent } from '../src/modules/matches/domain/event-hash-chain';

const prisma = new PrismaClient();

interface Discrepancy {
  fixtureId: string;
  kind: 'score-mismatch' | 'chain-invalid';
  detail: string;
}

async function rebuildFixture(fixture: {
  id: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number | null;
  awayScore: number | null;
}): Promise<Discrepancy[]> {
  const events = await prisma.matchEvent.findMany({
    where: { fixtureId: fixture.id },
    orderBy: { sequence: 'asc' },
  });

  const discrepancies: Discrepancy[] = [];

  const { homeScore, awayScore } = deriveScore(
    events.map((event) => ({
      id: event.id,
      type: event.type,
      teamId: event.teamId,
      correctsEventId: event.correctsEventId,
      metadata: event.metadata as Record<string, unknown> | null,
    })),
    fixture.homeTeamId,
    fixture.awayTeamId,
  );

  if (homeScore !== (fixture.homeScore ?? 0) || awayScore !== (fixture.awayScore ?? 0)) {
    discrepancies.push({
      fixtureId: fixture.id,
      kind: 'score-mismatch',
      detail: `cached ${fixture.homeScore ?? 0}-${fixture.awayScore ?? 0}, replayed ${homeScore}-${awayScore}`,
    });
  }

  const chained: ChainedEvent[] = events.map((event) => ({
    id: event.id,
    fixtureId: event.fixtureId,
    type: event.type,
    minute: event.minute,
    stoppageMinute: event.stoppageMinute,
    teamId: event.teamId,
    playerId: event.playerId,
    assistPlayerId: event.assistPlayerId,
    metadata: event.metadata,
    clientEventId: event.clientEventId,
    correctsEventId: event.correctsEventId,
    correctionReason: event.correctionReason,
    recordedById: event.recordedById,
    createdAt: event.createdAt,
    prevHash: event.prevHash,
    hash: event.hash,
  }));

  const chainResult = verifyEventChain(fixture.id, chained);

  if (!chainResult.valid) {
    discrepancies.push({
      fixtureId: fixture.id,
      kind: 'chain-invalid',
      detail: `chain breaks at event ${chainResult.brokenAtEventId}`,
    });
  }

  return discrepancies;
}

async function main() {
  const onlyFixtureId = process.argv[2];

  const fixtures = await prisma.fixture.findMany({
    where: onlyFixtureId ? { id: onlyFixtureId } : undefined,
    select: { id: true, homeTeamId: true, awayTeamId: true, homeScore: true, awayScore: true },
  });

  if (fixtures.length === 0) {
    console.log(onlyFixtureId ? `No fixture found with id ${onlyFixtureId}` : 'No fixtures to check.');
    return;
  }

  console.log(`Replaying ${fixtures.length} fixture(s) from their event log...`);

  const allDiscrepancies: Discrepancy[] = [];

  for (const fixture of fixtures) {
    const discrepancies = await rebuildFixture(fixture);
    allDiscrepancies.push(...discrepancies);
  }

  if (allDiscrepancies.length === 0) {
    console.log(`OK — all ${fixtures.length} fixture(s) match their replayed event log.`);
    return;
  }

  console.error(`FAILED — ${allDiscrepancies.length} discrepanc${allDiscrepancies.length === 1 ? 'y' : 'ies'} found:`);
  for (const d of allDiscrepancies) {
    console.error(`  [${d.kind}] fixture ${d.fixtureId}: ${d.detail}`);
  }
  process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error('rebuild-from-events crashed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
