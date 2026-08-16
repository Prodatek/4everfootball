import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Fixture } from "@4ef/shared";
import { floodlight as fl } from "@/theme/floodlight";

export function FixtureRow({ fixture, onPress }: { fixture: Fixture; onPress: () => void }) {
  const hasScore = fixture.homeScore !== null && fixture.awayScore !== null;

  return (
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
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
          <View style={styles.livePill}>
            <Text style={styles.live}>LIVE</Text>
          </View>
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
    backgroundColor: fl.color.surface,
    borderWidth: 1,
    borderColor: fl.color.line,
    borderRadius: fl.radius.md,
    gap: 8,
  },
  rowPressed: { backgroundColor: fl.color.surfaceElevated },
  matchup: { flexDirection: "row", alignItems: "center", gap: 8 },
  team: { flex: 1, fontSize: 13.5, fontFamily: fl.font.bodySemibold, color: fl.color.ink },
  score: { fontSize: 14, fontFamily: fl.font.mono, fontWeight: "700", color: fl.color.ink },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  competition: { fontSize: 11.5, color: fl.color.inkDim, fontFamily: fl.font.body },
  time: { fontSize: 11.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
  livePill: { backgroundColor: fl.color.live, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  live: { fontSize: 10, fontWeight: "800", color: "#052e18", fontFamily: fl.font.mono, letterSpacing: 0.4 },
});
