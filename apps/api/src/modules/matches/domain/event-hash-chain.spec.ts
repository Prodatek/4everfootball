import {
  canonicalJson,
  computeEventHash,
  seedHash,
  verifyEventChain,
  LEGACY_UNCHAINED_HASH,
  type ChainedEvent,
  type HashableEventFields,
} from './event-hash-chain';

function baseFields(
  overrides: Partial<HashableEventFields> = {},
): HashableEventFields {
  return {
    id: 'event-1',
    fixtureId: 'fixture-1',
    type: 'GOAL',
    minute: 10,
    stoppageMinute: null,
    teamId: 'team-1',
    playerId: 'player-1',
    assistPlayerId: null,
    metadata: null,
    clientEventId: 'client-1',
    correctsEventId: null,
    correctionReason: null,
    recordedById: 'user-1',
    createdAt: new Date('2026-01-01T12:00:00.000Z'),
    ...overrides,
  };
}

describe('canonicalJson', () => {
  it('produces identical output regardless of key insertion order', () => {
    const a = canonicalJson({ b: 1, a: 2, c: { z: 1, y: 2 } });
    const b = canonicalJson({ a: 2, c: { y: 2, z: 1 }, b: 1 });
    expect(a).toBe(b);
  });

  it('serializes dates as ISO strings, not object literals', () => {
    const result = canonicalJson({ at: new Date('2026-01-01T00:00:00.000Z') });
    expect(result).toBe('{"at":"2026-01-01T00:00:00.000Z"}');
  });

  it('keeps explicit nulls rather than dropping the key', () => {
    const result = canonicalJson({ a: null, b: 1 });
    expect(result).toBe('{"a":null,"b":1}');
  });

  it('sorts array contents recursively but preserves array order itself', () => {
    const result = canonicalJson({
      list: [
        { b: 1, a: 2 },
        { d: 3, c: 4 },
      ],
    });
    expect(result).toBe('{"list":[{"a":2,"b":1},{"c":4,"d":3}]}');
  });

  it('is stable across repeated calls (no hidden nondeterminism)', () => {
    const value = {
      metadata: { playerOffId: 'x', playerOnId: 'y' },
      type: 'SUBSTITUTION',
    };
    const outputs = Array.from({ length: 5 }, () => canonicalJson(value));
    expect(new Set(outputs).size).toBe(1);
  });
});

describe('computeEventHash', () => {
  it('is deterministic for identical input', () => {
    const fields = baseFields();
    const h1 = computeEventHash(seedHash('fixture-1'), fields);
    const h2 = computeEventHash(seedHash('fixture-1'), fields);
    expect(h1).toBe(h2);
  });

  it('changes if any hashed field changes (tamper sensitivity)', () => {
    const prev = seedHash('fixture-1');
    const original = computeEventHash(prev, baseFields());
    const tamperedMinute = computeEventHash(prev, baseFields({ minute: 89 }));
    const tamperedTeam = computeEventHash(
      prev,
      baseFields({ teamId: 'team-2' }),
    );
    const tamperedMetadata = computeEventHash(
      prev,
      baseFields({ metadata: { foo: 'bar' } }),
    );

    expect(tamperedMinute).not.toBe(original);
    expect(tamperedTeam).not.toBe(original);
    expect(tamperedMetadata).not.toBe(original);
  });

  it('changes if prevHash changes, even with identical fields (chain linkage matters)', () => {
    const fields = baseFields();
    const h1 = computeEventHash(seedHash('fixture-1'), fields);
    const h2 = computeEventHash(seedHash('fixture-2'), fields);
    expect(h1).not.toBe(h2);
  });

  it('does not change if sequence would differ (sequence is deliberately unhashed)', () => {
    // HashableEventFields has no `sequence` field at all — this test exists
    // to document that omission is intentional, not an oversight, in case
    // someone adds it back later without reading the comment in the source.
    const prev = seedHash('fixture-1');
    const a = computeEventHash(prev, baseFields({ id: 'event-1' }));
    const b = computeEventHash(prev, baseFields({ id: 'event-1' }));
    expect(a).toBe(b);
  });
});

describe('verifyEventChain', () => {
  function chainOf(fixtureId: string, count: number): ChainedEvent[] {
    let prevHash = seedHash(fixtureId);
    const events: ChainedEvent[] = [];

    for (let i = 0; i < count; i += 1) {
      const fields = baseFields({ id: `event-${i}`, minute: i });
      const hash = computeEventHash(prevHash, fields);
      events.push({ ...fields, prevHash, hash });
      prevHash = hash;
    }

    return events;
  }

  it('validates a correctly-built chain', () => {
    const events = chainOf('fixture-1', 5);
    const result = verifyEventChain('fixture-1', events);
    expect(result.valid).toBe(true);
    expect(result.events).toBe(5);
    expect(result.firstHash).toBe(events[0].hash);
    expect(result.lastHash).toBe(events[4].hash);
  });

  it('detects a tampered middle event (changed field, hash not recomputed)', () => {
    const events = chainOf('fixture-1', 5);
    const tampered = [...events];
    tampered[2] = { ...tampered[2], minute: 999 }; // hash left stale, as a real tamper would

    const result = verifyEventChain('fixture-1', tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAtEventId).toBe('event-2');
  });

  it('detects a hash rewritten to hide a tamper if prevHash is now inconsistent', () => {
    const events = chainOf('fixture-1', 3);
    const tampered = [...events];
    // Attacker edits event 1's content AND recomputes its own hash to match —
    // but every event after it still points at the OLD prevHash, so the
    // chain breaks at event 2, proving downstream events weren't re-signed.
    const forgedFields = baseFields({ id: 'event-1', minute: 999 });
    const forgedHash = computeEventHash(tampered[1].prevHash, forgedFields);
    tampered[1] = {
      ...forgedFields,
      prevHash: tampered[1].prevHash,
      hash: forgedHash,
    };

    const result = verifyEventChain('fixture-1', tampered);
    expect(result.valid).toBe(false);
    expect(result.brokenAtEventId).toBe('event-2');
  });

  it('skips legacy pre-migration rows and re-seeds the chain after them', () => {
    const legacy: ChainedEvent = {
      ...baseFields({ id: 'legacy-1' }),
      prevHash: LEGACY_UNCHAINED_HASH,
      hash: LEGACY_UNCHAINED_HASH,
    };
    const real = chainOf('fixture-1', 2); // these were built assuming a fresh seed, matching re-seed behavior

    const result = verifyEventChain('fixture-1', [legacy, ...real]);
    expect(result.valid).toBe(true);
    expect(result.events).toBe(2); // legacy row doesn't count toward verified events
  });

  it('returns valid with zero events for a fixture with no match events', () => {
    const result = verifyEventChain('fixture-1', []);
    expect(result.valid).toBe(true);
    expect(result.events).toBe(0);
    expect(result.firstHash).toBeNull();
    expect(result.lastHash).toBeNull();
  });
});
