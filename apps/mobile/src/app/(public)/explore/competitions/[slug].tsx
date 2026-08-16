import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchStandings } from "@/features/standings/api";
import { fetchTopAssists, fetchTopScorers } from "@/features/stats/api";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

export default function CompetitionDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: competition, isLoading } = useQuery({
    queryKey: ["competition", slug],
    queryFn: () => fetchCompetitionBySlug(slug),
  });

  const { data: standings } = useQuery({
    queryKey: ["standings", competition?.id],
    queryFn: () => fetchStandings(competition!.id),
    enabled: !!competition,
  });

  const { data: topScorers } = useQuery({
    queryKey: ["top-scorers", competition?.id],
    queryFn: () => fetchTopScorers(competition!.id),
    enabled: !!competition,
  });

  const { data: topAssists } = useQuery({
    queryKey: ["top-assists", competition?.id],
    queryFn: () => fetchTopAssists(competition!.id),
    enabled: !!competition,
  });

  if (isLoading || !competition) {
    return <ScreenState>{isLoading ? "Loading..." : "Competition not found."}</ScreenState>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{competition.name}</Text>
        <Text style={styles.meta}>
          {competition.season}
          {competition.country ? ` · ${competition.country}` : ""}
        </Text>
      </View>

      <Text style={styles.sectionTitle}>TABLE</Text>
      <View style={styles.table}>
        {(standings ?? []).map((row) => (
          <View key={row.teamId} style={styles.tableRow}>
            <Text style={styles.tablePos}>{row.position}</Text>
            <Text style={styles.tableTeam} numberOfLines={1}>
              {row.teamName}
            </Text>
            <Text style={styles.tableStat}>{row.played}</Text>
            <Text style={styles.tableStat}>{row.goalDifference}</Text>
            <Text style={styles.tablePoints}>{row.points}</Text>
          </View>
        ))}
        {(standings ?? []).length === 0 && <ScreenState>No standings yet.</ScreenState>}
      </View>

      <Text style={styles.sectionTitle}>TOP SCORERS</Text>
      <LeaderboardList rows={topScorers} />

      <Text style={styles.sectionTitle}>TOP ASSISTS</Text>
      <LeaderboardList rows={topAssists} />
    </ScrollView>
  );
}

function LeaderboardList({ rows }: { rows?: { playerId: string; playerName: string; count: number }[] }) {
  if (!rows || rows.length === 0) {
    return <ScreenState>No data yet.</ScreenState>;
  }

  return (
    <View style={styles.leaderboard}>
      {rows.map((row, index) => (
        <View key={row.playerId} style={styles.leaderRow}>
          <Text style={styles.leaderRank}>{index + 1}</Text>
          <Text style={styles.leaderName}>{row.playerName}</Text>
          <Text style={styles.leaderCount}>{row.count}</Text>
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fl.color.bg },
  header: { padding: 20, gap: 4, borderBottomWidth: 1, borderBottomColor: fl.color.line },
  name: { fontSize: 24, fontFamily: fl.font.display, color: fl.color.ink, textTransform: "uppercase" },
  meta: { fontSize: 13, color: fl.color.inkDim, fontFamily: fl.font.body },
  sectionTitle: { fontSize: 13, fontFamily: fl.font.bodySemibold, color: fl.color.ink, letterSpacing: 0.5, padding: 20, paddingBottom: 8 },
  table: { paddingHorizontal: 20 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: fl.color.line,
  },
  tablePos: { width: 20, fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
  tableTeam: { flex: 1, fontSize: 13.5, color: fl.color.ink, fontFamily: fl.font.body },
  tableStat: { width: 30, textAlign: "right", fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
  tablePoints: { width: 32, textAlign: "right", fontSize: 14, fontFamily: fl.font.mono, fontWeight: "700", color: fl.color.brand },
  leaderboard: { paddingHorizontal: 20, marginBottom: 8 },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: fl.color.line,
  },
  leaderRank: { width: 20, fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
  leaderName: { flex: 1, fontSize: 13.5, color: fl.color.ink, fontFamily: fl.font.body },
  leaderCount: { fontSize: 14, fontFamily: fl.font.mono, fontWeight: "700", color: fl.color.ink },
});
