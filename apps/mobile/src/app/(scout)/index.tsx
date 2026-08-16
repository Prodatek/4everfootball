import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Fixture } from "@4ef/shared";
import { fetchFixtures } from "@/features/fixtures/api";
import { useAuth } from "@/features/auth/auth-context";
import { fourthOfficial as fo } from "@/theme/fourth-official";

// Any SCOUT/ADMIN/SUPER_ADMIN account can record events for any fixture —
// there's no per-scout assignment concept in the backend, so this is simply
// every SCHEDULED or LIVE fixture, no "assigned to me" filter to apply.
export default function ScoutFixturePicker() {
  const router = useRouter();
  const { user, logout } = useAuth();

  const { data: live, isLoading: isLiveLoading } = useQuery({
    queryKey: ["scout-fixtures", "LIVE"],
    queryFn: () => fetchFixtures({ status: "LIVE", limit: 50, sortBy: "kickoffAt", sortOrder: "asc" }),
  });

  const { data: scheduled, isLoading: isScheduledLoading } = useQuery({
    queryKey: ["scout-fixtures", "SCHEDULED"],
    queryFn: () =>
      fetchFixtures({ status: "SCHEDULED", limit: 50, sortBy: "kickoffAt", sortOrder: "asc" }),
  });

  const fixtures = [...(live?.data ?? []), ...(scheduled?.data ?? [])];

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.welcome}>
          SIGNED IN AS <Text style={styles.welcomeName}>{user?.displayName}</Text>
        </Text>
        <Pressable onPress={logout} hitSlop={8}>
          <Text style={styles.logout}>LOG OUT</Text>
        </Pressable>
      </View>

      <FlatList
        data={fixtures}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          isLiveLoading || isScheduledLoading ? (
            <Text style={styles.empty}>Loading fixtures...</Text>
          ) : (
            <Text style={styles.empty}>No live or upcoming fixtures right now.</Text>
          )
        }
        renderItem={({ item }: { item: Fixture }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push(`/(scout)/fixtures/${item.id}`)}
          >
            <View style={styles.rowText}>
              <Text style={styles.matchup}>
                {item.homeTeam.name} vs {item.awayTeam.name}
              </Text>
              <View style={styles.metaRow}>
                <Text style={styles.comp}>{item.competition.name}</Text>
                {item.status === "LIVE" ? (
                  <Text style={styles.live}>LIVE</Text>
                ) : (
                  <Text style={styles.time}>{new Date(item.kickoffAt).toLocaleString()}</Text>
                )}
              </View>
            </View>
            <View style={styles.chevron} />
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fo.color.bg },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: 2,
    borderBottomColor: fo.color.line,
    backgroundColor: fo.color.surface,
  },
  welcome: { fontSize: 10.5, letterSpacing: 0.5, color: fo.color.inkDim, fontWeight: "700" },
  welcomeName: { color: fo.color.ink },
  logout: { fontSize: 11, fontWeight: "800", letterSpacing: 0.4, color: fo.color.cardRed },
  list: { padding: 16, gap: 10 },
  empty: { textAlign: "center", color: fo.color.inkDim, marginTop: 32, fontSize: 14 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    backgroundColor: fo.color.surface,
    borderWidth: 2,
    borderColor: fo.color.line,
    borderRadius: fo.radius.md,
  },
  rowText: { flex: 1, gap: 6 },
  matchup: { fontSize: 15, fontFamily: fo.font.displayBold, color: fo.color.ink, textTransform: "uppercase" },
  metaRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  comp: { fontSize: 11, color: fo.color.inkDim, textTransform: "uppercase", letterSpacing: 0.3 },
  time: { fontSize: 11, color: fo.color.inkDim, fontFamily: fo.font.mono },
  live: {
    fontSize: 10,
    fontFamily: fo.font.mono,
    fontWeight: "700",
    color: "#fff",
    backgroundColor: fo.color.live,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 2,
  },
  chevron: { width: 8, height: 8, borderTopWidth: 2, borderRightWidth: 2, borderColor: fo.color.ink, transform: [{ rotate: "45deg" }] },
});
