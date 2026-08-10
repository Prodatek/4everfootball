import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPlayerBySlug } from "@/features/players/api";
import { fetchPlayerStats } from "@/features/stats/api";
import { ScreenState } from "@/components/list-row";

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
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", padding: 16, gap: 12 },
  statCell: { width: "30%", alignItems: "center", gap: 2 },
  statValue: { fontSize: 20, fontWeight: "700" },
  statLabel: { fontSize: 12, color: "#6b7280", textAlign: "center" },
});
