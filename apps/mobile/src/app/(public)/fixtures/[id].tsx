import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFixtureById } from "@/features/fixtures/api";
import { useLiveMatch } from "@/features/matches/use-live-match";
import { MatchTimeline } from "@/features/matches/match-timeline";
import { ScreenState } from "@/components/list-row";

export default function FixtureDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();

  const { data: fixture, isLoading } = useQuery({
    queryKey: ["fixture", id],
    queryFn: () => fetchFixtureById(id),
  });

  const { events, liveState } = useLiveMatch(id);

  if (isLoading || !fixture) {
    return <ScreenState>{isLoading ? "Loading..." : "Fixture not found."}</ScreenState>;
  }

  const status = liveState?.status ?? fixture.status;
  const homeScore = liveState?.homeScore ?? fixture.homeScore;
  const awayScore = liveState?.awayScore ?? fixture.awayScore;

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.competition}>{fixture.competition.name}</Text>
        <View style={styles.matchup}>
          <Text style={styles.team}>{fixture.homeTeam.name}</Text>
          <Text style={styles.score}>{homeScore ?? "-"} : {awayScore ?? "-"}</Text>
          <Text style={styles.team}>{fixture.awayTeam.name}</Text>
        </View>
        <Text style={styles.meta}>
          {status === "LIVE" ? "LIVE" : new Date(fixture.kickoffAt).toLocaleString()}
          {fixture.venueName ? ` · ${fixture.venueName}` : ""}
        </Text>
      </View>

      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>Timeline</Text>
        <MatchTimeline events={events} />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 8, alignItems: "center", borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  competition: { fontSize: 13, color: "#6b7280" },
  matchup: { flexDirection: "row", alignItems: "center", gap: 12 },
  team: { fontSize: 16, fontWeight: "700" },
  score: { fontSize: 20, fontWeight: "800", fontVariant: ["tabular-nums"] },
  meta: { fontSize: 13, color: "#6b7280" },
  timeline: { padding: 16, gap: 8 },
  sectionTitle: { fontSize: 16, fontWeight: "700" },
});
