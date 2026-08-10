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
          <Text style={styles.scoreText}>
            {fixture.homeTeam.name} {homeScore ?? "-"} : {awayScore ?? "-"} {fixture.awayTeam.name}
          </Text>
          <View style={[styles.badge, status === "LIVE" && styles.badgeLive]}>
            <Text style={styles.badgeText}>{status}</Text>
          </View>
        </View>
        {pendingCount > 0 && (
          <Text style={styles.pendingText}>
            {pendingCount} event{pendingCount === 1 ? "" : "s"} pending sync...
          </Text>
        )}
      </View>

      <FlatList
        data={ALL_MATCH_EVENT_TYPES}
        keyExtractor={(type) => type}
        numColumns={3}
        scrollEnabled={false}
        columnWrapperStyle={styles.gridRow}
        renderItem={({ item: type }) => (
          <Pressable
            style={styles.eventButton}
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
            <Text style={styles.eventButtonText}>{MATCH_EVENT_LABELS[type]}</Text>
          </Pressable>
        )}
      />

      <View style={styles.timelineCard}>
        <Text style={styles.timelineTitle}>Timeline</Text>
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
        <MatchTimeline events={events} />
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
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 16 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  loading: { color: "#6b7280" },
  scoreCard: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    padding: 16,
    gap: 8,
  },
  scoreRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  scoreText: { fontSize: 15, fontWeight: "600", flexShrink: 1 },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999, backgroundColor: "#e5e7eb" },
  badgeLive: { backgroundColor: "#111827" },
  badgeText: { fontSize: 12, fontWeight: "700", color: "#111827" },
  pendingText: { fontSize: 13, color: "#6b7280" },
  gridRow: { gap: 8, marginBottom: 8 },
  eventButton: {
    flex: 1,
    height: 64,
    borderWidth: 1,
    borderColor: "#d1d5db",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  eventButtonText: { fontSize: 13, textAlign: "center" },
  timelineCard: { borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 8, padding: 16, gap: 8 },
  timelineTitle: { fontSize: 16, fontWeight: "700" },
  pendingList: { gap: 4, marginBottom: 8 },
  pendingRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "wrap" },
  pendingMinute: { fontVariant: ["tabular-nums"], color: "#6b7280", fontSize: 13 },
  pendingType: { color: "#6b7280", fontSize: 13 },
  pendingSyncing: { fontStyle: "italic", color: "#6b7280", fontSize: 13 },
  pendingError: { fontStyle: "italic", color: "#dc2626", fontSize: 13 },
});
