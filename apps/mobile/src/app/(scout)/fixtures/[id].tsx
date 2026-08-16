import { useMemo, useState } from "react";
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { ALL_MATCH_EVENT_TYPES, type MatchEventType } from "@4ef/shared";
import { fetchFixtureById } from "@/features/fixtures/api";
import { fetchPlayers } from "@/features/players/api";
import { useLiveMatch } from "@/features/matches/use-live-match";
import { STUCK_AFTER_ATTEMPTS, useOfflineEventQueue } from "@/features/matches/offline-queue";
import { MatchTimeline } from "@/features/matches/match-timeline";
import { MATCH_EVENT_LABELS } from "@/features/matches/event-labels";
import { RecordEventSheet } from "@/features/matches/record-event-sheet";
import { fourthOfficial as fo } from "@/theme/fourth-official";

// Card-colored buttons are functional, not decorative — they're the actual
// yellow/red card colors, reserved only for the events that record cards.
function eventButtonStyle(type: MatchEventType) {
  if (type === "GOAL" || type === "PENALTY_SCORED") return styles.eventButtonAccent;
  if (type === "YELLOW_CARD") return styles.eventButtonYellow;
  if (type === "RED_CARD") return styles.eventButtonRed;
  return styles.eventButton;
}
function eventButtonTextStyle(type: MatchEventType) {
  if (type === "GOAL" || type === "PENALTY_SCORED" || type === "RED_CARD") return styles.eventButtonTextLight;
  return styles.eventButtonText;
}

export default function ScoutFixtureRecorder() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: fixture } = useQuery({
    queryKey: ["fixture", id],
    queryFn: () => fetchFixtureById(id),
  });

  const { data: homeSquad } = useQuery({
    queryKey: ["team-squad", fixture?.homeTeamId],
    queryFn: () => fetchPlayers({ teamId: fixture!.homeTeamId, limit: 50 }),
    enabled: !!fixture,
  });

  const { data: awaySquad } = useQuery({
    queryKey: ["team-squad", fixture?.awayTeamId],
    queryFn: () => fetchPlayers({ teamId: fixture!.awayTeamId, limit: 50 }),
    enabled: !!fixture,
  });

  const { events, liveState } = useLiveMatch(id);
  const { pendingEvents, enqueue, pendingCount } = useOfflineEventQueue(id);

  const [dialogEventType, setDialogEventType] = useState<MatchEventType | null>(null);
  const [dialogMinute, setDialogMinute] = useState(0);
  const [dialogKey, setDialogKey] = useState(0);

  const squads = useMemo(
    () => ({
      ...(fixture ? { [fixture.homeTeamId]: homeSquad?.data ?? [] } : {}),
      ...(fixture ? { [fixture.awayTeamId]: awaySquad?.data ?? [] } : {}),
    }),
    [fixture, homeSquad, awaySquad],
  );

  if (!fixture) {
    return (
      <View style={styles.centered}>
        <Text style={styles.loading}>Loading...</Text>
      </View>
    );
  }

  const status = liveState?.status ?? fixture.status;
  const homeScore = liveState?.homeScore ?? fixture.homeScore;
  const awayScore = liveState?.awayScore ?? fixture.awayScore;
  const kickoffAt = fixture.kickoffAt;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>
          <Text style={styles.scoreTeams} numberOfLines={2}>
            {fixture.homeTeam.name} : {fixture.awayTeam.name}
          </Text>
          <Text style={styles.scoreNums}>
            {homeScore ?? "-"}&ndash;{awayScore ?? "-"}
          </Text>
        </View>
        <View style={styles.statusRow}>
          <View style={[styles.badge, status === "LIVE" && styles.badgeLive]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
          {pendingCount > 0 && (
            <Text style={styles.pendingText}>
              {pendingCount} event{pendingCount === 1 ? "" : "s"} pending sync
            </Text>
          )}
        </View>
      </View>

      <FlatList
        data={ALL_MATCH_EVENT_TYPES}
        keyExtractor={(type) => type}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item: type }) => (
          <Pressable
            style={eventButtonStyle(type)}
            onPress={() => {
              const minute =
                status === "LIVE"
                  ? Math.max(1, Math.floor((Date.now() - new Date(kickoffAt).getTime()) / 60_000))
                  : 0;
              setDialogMinute(minute);
              setDialogEventType(type);
              setDialogKey((key) => key + 1);
            }}
          >
            <Text style={eventButtonTextStyle(type)}>{MATCH_EVENT_LABELS[type].toUpperCase()}</Text>
          </Pressable>
        )}
      />

      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>TIMELINE</Text>
        {pendingEvents.length > 0 && (
          <View style={styles.pendingList}>
            {pendingEvents.map((item) => (
              <View key={item.clientEventId} style={styles.pendingRow}>
                <Text style={styles.pendingMinute}>{item.minute}&apos;</Text>
                <Text style={styles.pendingType}>{MATCH_EVENT_LABELS[item.type]}</Text>
                {item.attempts >= STUCK_AFTER_ATTEMPTS && item.lastError ? (
                  <Text style={styles.pendingError}>{item.lastError}</Text>
                ) : (
                  <Text style={styles.pendingSyncing}>syncing...</Text>
                )}
              </View>
            ))}
          </View>
        )}
        <MatchTimeline events={events} theme="fourth-official" />
      </View>

      <RecordEventSheet
        key={dialogKey}
        eventType={dialogEventType}
        homeTeam={{ id: fixture.homeTeamId, name: fixture.homeTeam.name }}
        awayTeam={{ id: fixture.awayTeamId, name: fixture.awayTeam.name }}
        squads={squads}
        defaultMinute={dialogMinute}
        onCancel={() => setDialogEventType(null)}
        onConfirm={(input) => {
          enqueue(input);
          setDialogEventType(null);
        }}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fo.color.bg },
  content: { padding: 16, gap: 14 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: fo.color.bg },
  loading: { color: fo.color.inkDim },
  scoreCard: {
    backgroundColor: fo.color.ink,
    borderRadius: fo.radius.md,
    padding: 16,
    gap: 10,
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", gap: 12 },
  scoreTeams: { flex: 1, fontSize: 13, fontFamily: fo.font.displayBold, color: "#fff", textTransform: "uppercase" },
  scoreNums: { fontSize: 22, fontFamily: fo.font.mono, fontWeight: "700", color: fo.color.cardYellow },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.15)" },
  badgeLive: { backgroundColor: fo.color.live },
  badgeText: { fontSize: 10, fontFamily: fo.font.mono, fontWeight: "700", color: "#fff", letterSpacing: 0.3 },
  pendingText: { fontSize: 11, color: "rgba(255,255,255,0.6)" },
  gridRow: { gap: 6, marginBottom: 6 },
  eventButton: {
    flex: 1,
    height: 46,
    borderWidth: 2,
    borderColor: fo.color.line,
    backgroundColor: fo.color.surface,
    borderRadius: fo.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  eventButtonAccent: {
    flex: 1,
    height: 46,
    borderWidth: 2,
    borderColor: fo.color.accent,
    backgroundColor: fo.color.accent,
    borderRadius: fo.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  eventButtonYellow: {
    flex: 1,
    height: 46,
    borderWidth: 2,
    borderColor: fo.color.cardYellow,
    backgroundColor: fo.color.cardYellow,
    borderRadius: fo.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  eventButtonRed: {
    flex: 1,
    height: 46,
    borderWidth: 2,
    borderColor: fo.color.cardRed,
    backgroundColor: fo.color.cardRed,
    borderRadius: fo.radius.sm,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  eventButtonText: { fontSize: 10, fontWeight: "800", textAlign: "center", color: fo.color.ink },
  eventButtonTextLight: { fontSize: 10, fontWeight: "800", textAlign: "center", color: "#fff" },
  timelineCard: {
    backgroundColor: fo.color.surface,
    borderWidth: 2,
    borderColor: fo.color.line,
    borderRadius: fo.radius.md,
    padding: 16,
    gap: 8,
  },
  timelineTitle: { fontSize: 13, fontFamily: fo.font.displayBold, color: fo.color.ink, letterSpacing: 0.3 },
  pendingList: { gap: 4, marginBottom: 8 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pendingMinute: { fontVariant: ["tabular-nums"], color: fo.color.inkDim, fontSize: 13, fontFamily: fo.font.mono },
  pendingType: { color: fo.color.inkDim, fontSize: 13 },
  pendingSyncing: { fontStyle: "italic", color: fo.color.inkDim, fontSize: 13 },
  pendingError: { fontStyle: "italic", color: fo.color.cardRed, fontSize: 13, fontWeight: "700" },
});
