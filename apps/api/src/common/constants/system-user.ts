// Seeded in migration 1_event_log_immutability — must match the id used in
// that migration's INSERT exactly. Used to attribute system-generated match
// events (currently: AutoKickoffService's auto-KICKOFF) to a real user row,
// since recordedById is NOT NULL — an automated event still needs an
// accountable "who" for the immutable log, and null was never really "no
// one," it was just harder to search for.
export const SYSTEM_USER_ID = '00000000-0000-0000-0000-000000000001';
