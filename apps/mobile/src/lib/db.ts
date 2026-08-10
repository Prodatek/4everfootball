import * as SQLite from "expo-sqlite";

let dbPromise: Promise<SQLite.SQLiteDatabase> | null = null;

// One row per pending match event rather than web's single-JSON-blob-per-
// fixture localStorage approach: a kill mid read-modify-write on a JSON blob
// risks corrupting the entire backlog, whereas a per-row SQLite insert only
// ever risks the single in-flight event — important at pitch-side where the
// OS killing the app mid-match is a real scenario, not an edge case.
export function getDb(): Promise<SQLite.SQLiteDatabase> {
  dbPromise ??= SQLite.openDatabaseAsync("4everfootball-scout.db").then(async (db) => {
    await db.execAsync(`
      PRAGMA journal_mode = WAL;
      CREATE TABLE IF NOT EXISTS pending_match_events (
        client_event_id TEXT PRIMARY KEY NOT NULL,
        fixture_id TEXT NOT NULL,
        type TEXT NOT NULL,
        minute INTEGER NOT NULL,
        stoppage_minute INTEGER,
        team_id TEXT,
        player_id TEXT,
        assist_player_id TEXT,
        metadata TEXT,
        queued_at INTEGER NOT NULL,
        attempts INTEGER NOT NULL DEFAULT 0,
        last_error TEXT
      );
    `);
    return db;
  });

  return dbPromise;
}
