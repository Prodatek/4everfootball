import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTeamBySlug } from "@/features/teams/api";
import { fetchPlayers } from "@/features/players/api";
import { ScreenState } from "@/components/list-row";

export default function TeamDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: team, isLoading } = useQuery({
    queryKey: ["team", slug],
    queryFn: () => fetchTeamBySlug(slug),
  });

  const { data: squad } = useQuery({
    queryKey: ["team-squad", team?.id],
    queryFn: () => fetchPlayers({ teamId: team!.id, limit: 50, sortBy: "lastName" }),
    enabled: !!team,
  });

  if (isLoading || !team) {
    return <ScreenState>{isLoading ? "Loading..." : "Team not found."}</ScreenState>;
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{team.name}</Text>
        {team.country && <Text style={styles.meta}>{team.country}</Text>}
        {team.venueName && <Text style={styles.meta}>{team.venueName}</Text>}
        {team.foundedYear && <Text style={styles.meta}>Founded {team.foundedYear}</Text>}
      </View>

      <Text style={styles.sectionTitle}>Squad</Text>
      <FlatList
        data={squad?.data ?? []}
        keyExtractor={(player) => player.id}
        scrollEnabled={false}
        ListEmptyComponent={<ScreenState>No players listed.</ScreenState>}
        renderItem={({ item }) => (
          <View style={styles.playerRow}>
            <Text style={styles.playerName}>
              {item.firstName} {item.lastName}
            </Text>
            <Text style={styles.playerMeta}>
              {item.position ?? ""} {item.shirtNumber ? `#${item.shirtNumber}` : ""}
            </Text>
          </View>
        )}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: { padding: 16, gap: 4, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#e5e7eb" },
  name: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 14, color: "#6b7280" },
  sectionTitle: { fontSize: 16, fontWeight: "700", padding: 16, paddingBottom: 8 },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#f3f4f6",
  },
  playerName: { fontSize: 14 },
  playerMeta: { fontSize: 13, color: "#6b7280" },
});
