import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Fixture } from "@4ef/shared";
import { fetchFixtures } from "@/features/fixtures/api";
import { useAuth } from "@/features/auth/auth-context";

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
        <Text style={styles.welcome}>Signed in as {user?.displayName}</Text>
        <Pressable onPress={logout}>
          <Text style={styles.logout}>Log out</Text>
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
              <Text style={styles.meta}>
                {item.status === "LIVE" ? "LIVE now" : new Date(item.kickoffAt).toLocaleString()}
              </Text>
            </View>
          </Pressable>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#e5e7eb",
  },
  welcome: { fontSize: 14, color: "#374151" },
  logout: { fontSize: 14, color: "#dc2626", fontWeight: "600" },
  list: { padding: 16, gap: 8 },
  empty: { textAlign: "center", color: "#6b7280", marginTop: 32 },
  row: {
    padding: 16,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  rowText: { gap: 4 },
  matchup: { fontSize: 16, fontWeight: "600" },
  meta: { fontSize: 13, color: "#6b7280" },
});
