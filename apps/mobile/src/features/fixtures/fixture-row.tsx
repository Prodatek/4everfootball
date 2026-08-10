import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Fixture } from "@4ef/shared";

export function FixtureRow({ fixture, onPress }: { fixture: Fixture; onPress: () => void }) {
  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.matchup}>
        <Text style={styles.team} numberOfLines={1}>
          {fixture.homeTeam.name}
        </Text>
        <Text style={styles.score}>
          {hasScore ? `${fixture.homeScore} - ${fixture.awayScore}` : "vs"}
        </Text>
        <Text style={styles.team} numberOfLines={1}>
          {fixture.awayTeam.name}
        </Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.competition}>{fixture.competition.name}</Text>
        {fixture.status === "LIVE" ? (
          <Text style={styles.live}>LIVE</Text>
        ) : (
          <Text style={styles.time}>{new Date(fixture.kickoffAt).toLocaleString()}</Text>
        )}
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    gap: 6,
  },
  matchup: { flexDirection: "row", alignItems: "center", gap: 8 },
  team: { flex: 1, fontSize: 14, fontWeight: "600" },
  score: { fontSize: 14, fontWeight: "700", fontVariant: ["tabular-nums"] },
  metaRow: { flexDirection: "row", justifyContent: "space-between" },
  competition: { fontSize: 12, color: "#6b7280" },
  time: { fontSize: 12, color: "#6b7280" },
  live: { fontSize: 12, fontWeight: "700", color: "#dc2626" },
});
