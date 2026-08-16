import { createHash } from 'node:crypto';

// Rows created before this migration shipped are marked with this sentinel
// instead of a fabricated hash — several of the fields below didn't exist as
// concepts yet when they were recorded, so a "recomputed" hash for them
// would be synthetic, not a genuine chain link. See migration
// 1_event_log_immutability and MatchEventsService.verifyChain().
export const LEGACY_UNCHAINED_HASH = 'legacy:unchained';

export interface HashableEventFields {
  id: string;
  fixtureId: string;
  type: string;
  minute: number;
  stoppageMinute: number | null;
  teamId: string | null;
  playerId: string | null;
  assistPlayerId: string | null;
  metadata: unknown;
  clientEventId: string;
  correctsEventId: string | null;
  correctionReason: string | null;
  recordedById: string;
  createdAt: Date;
}

export interface ChainedEvent extends HashableEventFields {
  prevHash: string;
  hash: string;
}

/**
 * Deterministic JSON: keys sorted (recursively, so `metadata`'s shape can't
 * change the hash by key order alone), no whitespace, `undefined` never
 * appears (callers must pass `null` for absent optional fields — this
 * function doesn't coerce, so a mismatch is a bug at the call site, not
 * silently patched here), dates as ISO 8601 strings.
 */
export function canonicalJson(value: unknown): string {
  return JSON.stringify(normalize(value));
}

function normalize(value: unknown): unknown {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(normalize);

  if (value !== null && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((acc, key) => {
        acc[key] = normalize(record[key]);
        return acc;
      }, {});
  }

  return value;
}

/** Seeds the chain for the first real event of a match — sha256(fixtureId). */
export function seedHash(fixtureId: string): string {
  return createHash('sha256').update(fixtureId).digest('hex');
}

/**
 * hash = sha256(prevHash || canonicalJson(row minus hash)).
 *
 * `sequence` is deliberately excluded from the hashed payload even though
 * it's a real column: it's a Postgres-assigned autoincrement value not known
 * until after insert (a chicken-and-egg problem for hashing before the row
 * exists), and its integrity comes from the immutability trigger, not from
 * being hashed — tampering with it after the fact is blocked at the database
 * level regardless of whether it's inside these bytes.
 */
export function computeEventHash(
  prevHash: string,
  fields: HashableEventFields,
): string {
  return createHash('sha256')
    .update(prevHash)
    .update(canonicalJson(fields))
    .digest('hex');
}

// Picks exactly HashableEventFields' keys out of a ChainedEvent. Needed
// because canonicalJson uses Object.keys() at runtime — passing a
// ChainedEvent (which has extra prevHash/hash properties) straight into
// computeEventHash would leak those into the hashed payload despite
// computeEventHash's parameter type saying HashableEventFields.
// TypeScript's structural typing doesn't strip excess properties at
// runtime, only picking fields explicitly does.
function toHashableFields(event: ChainedEvent): HashableEventFields {
  return {
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
  };
}

export interface ChainVerificationResult {
  valid: boolean;
  events: number;
  firstHash: string | null;
  lastHash: string | null;
  brokenAtEventId?: string;
}

/**
 * Replays a fixture's event list (already ordered by sequence) and checks
 * every hash. Legacy (pre-migration) rows are skipped rather than failed —
 * the chain re-seeds immediately after one, so events recorded after Phase 1
 * shipped still form a genuine, verifiable sub-chain even on a fixture that
 * has older unchained history.
 */
export function verifyEventChain(
  fixtureId: string,
  events: ChainedEvent[],
): ChainVerificationResult {
  let expectedPrevHash = seedHash(fixtureId);
  let firstHash: string | null = null;
  let lastHash: string | null = null;
  let verifiedCount = 0;

  for (const event of events) {
    if (event.hash === LEGACY_UNCHAINED_HASH) {
      expectedPrevHash = seedHash(fixtureId);
      continue;
    }

    if (event.prevHash !== expectedPrevHash) {
      return {
        valid: false,
        events: verifiedCount,
        firstHash,
        lastHash,
        brokenAtEventId: event.id,
      };
    }

    const recomputed = computeEventHash(
      expectedPrevHash,
      toHashableFields(event),
    );

    if (recomputed !== event.hash) {
      return {
        valid: false,
        events: verifiedCount,
        firstHash,
        lastHash,
        brokenAtEventId: event.id,
      };
    }

    firstHash ??= event.hash;
    lastHash = event.hash;
    verifiedCount += 1;
    expectedPrevHash = event.hash;
  }

  return { valid: true, events: verifiedCount, firstHash, lastHash };
}
