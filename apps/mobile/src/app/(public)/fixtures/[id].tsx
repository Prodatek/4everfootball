import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFixtureById } from "@/features/fixtures/api";
import { useLiveMatch } from "@/features/matches/use-live-match";
import { MatchTimeline } from "@/features/matches/match-timeline";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

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
        {status === "LIVE" ? (
          <View style={styles.livePill}>
            <Text style={styles.liveText}>LIVE</Text>
          </View>
        ) : (
          <Text style={styles.meta}>
            {new Date(fixture.kickoffAt).toLocaleString()}
            {fixture.venueName ? ` · ${fixture.venueName}` : ""}
          </Text>
        )}
      </View>

      <View style={styles.timeline}>
        <Text style={styles.sectionTitle}>TIMELINE</Text>
        <MatchTimeline events={events} theme="floodlight" />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fl.color.bg },
  header: {
    padding: 20,
    gap: 10,
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: fl.color.line,
  },
  competition: { fontSize: 11.5, color: fl.color.inkDim, fontFamily: fl.font.body, textTransform: "uppercase", letterSpacing: 0.4 },
  matchup: { flexDirection: "row", alignItems: "center", gap: 14 },
  team: { fontSize: 15, fontFamily: fl.font.bodySemibold, color: fl.color.ink },
  score: { fontSize: 26, fontFamily: fl.font.mono, fontWeight: "700", color: fl.color.brand },
  meta: { fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.body },
  livePill: { backgroundColor: fl.color.live, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 999 },
  liveText: { fontSize: 11, fontWeight: "800", color: "#052e18", fontFamily: fl.font.mono, letterSpacing: 0.4 },
  timeline: { padding: 20, gap: 10 },
  sectionTitle: { fontSize: 15, fontFamily: fl.font.display, color: fl.color.ink, letterSpacing: 0.3 },
});
