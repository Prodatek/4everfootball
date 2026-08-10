import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCompetitionBySlug } from "@/features/competitions/api";
import { fetchStandings } from "@/features/standings/api";
import { fetchTopAssists, fetchTopScorers } from "@/features/stats/api";
import { ScreenState } from "@/components/list-row";

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

      <Text style={styles.sectionTitle}>Table</Text>
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

      <Text style={styles.sectionTitle}>Top scorers</Text>
      <LeaderboardList rows={topScorers} />

      <Text style={styles.sectionTitle}>Top assists</Text>
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
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "700", padding: 16, paddingBottom: 8 },
  table: { paddingHorizontal: 16 },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  tablePos: { width: 20, fontSize: 13, color: "#6b7280" },
  tableTeam: { flex: 1, fontSize: 14 },
  tableStat: { width: 30, textAlign: "right", fontSize: 13, color: "#6b7280" },
  tablePoints: { width: 30, textAlign: "right", fontSize: 14, fontWeight: "700" },
  leaderboard: { paddingHorizontal: 16, marginBottom: 8 },
  leaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  leaderRank: { width: 20, fontSize: 13, color: "#6b7280" },
  leaderName: { flex: 1, fontSize: 14 },
  leaderCount: { fontSize: 14, fontWeight: "700" },
});
