import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPlayerBySlug } from "@/features/players/api";
import { fetchPlayerStats } from "@/features/stats/api";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

export default function PlayerDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: player, isLoading } = useQuery({
    queryKey: ["player", slug],
    queryFn: () => fetchPlayerBySlug(slug),
  });

  const { data: stats } = useQuery({
    queryKey: ["player-stats", slug],
    queryFn: () => fetchPlayerStats(slug),
    enabled: !!player,
  });

  if (isLoading || !player) {
    return <ScreenState>{isLoading ? "Loading..." : "Player not found."}</ScreenState>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>
          {player.firstName} {player.lastName}
        </Text>
        <Text style={styles.meta}>
          {[player.position, player.nationality].filter(Boolean).join(" · ")}
        </Text>
        {player.shirtNumber && <Text style={styles.meta}>#{player.shirtNumber}</Text>}
      </View>

      {stats && (
        <View style={styles.statsGrid}>
          <StatCell label="Appearances" value={stats.appearances} />
          <StatCell label="Goals" value={stats.goals} />
          <StatCell label="Assists" value={stats.assists} />
          <StatCell label="Yellow cards" value={stats.yellowCards} />
          <StatCell label="Red cards" value={stats.redCards} />
        </View>
      )}
    </ScrollView>
  );
}

function StatCell({ label, value }: { label: string; value: number }) {
  return (
    <View style={styles.statCell}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fl.color.bg },
  header: { padding: 20, gap: 4, borderBottomWidth: 1, borderBottomColor: fl.color.line },
  name: { fontSize: 24, fontFamily: fl.font.display, color: fl.color.ink, textTransform: "uppercase" },
  meta: { fontSize: 13, color: fl.color.inkDim, fontFamily: fl.font.body },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 20, gap: 16 },
  statCell: { width: "28%", alignItems: "center", gap: 2 },
  statValue: { fontSize: 22, fontFamily: fl.font.mono, fontWeight: "700", color: fl.color.brand },
  statLabel: { fontSize: 11, color: fl.color.inkDim, textAlign: "center", fontFamily: fl.font.body },
});
