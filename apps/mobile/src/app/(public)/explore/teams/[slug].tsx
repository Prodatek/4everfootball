import { FlatList, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTeamBySlug } from "@/features/teams/api";
import { fetchPlayers } from "@/features/players/api";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

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

      <Text style={styles.sectionTitle}>SQUAD</Text>
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
  container: { flex: 1, backgroundColor: fl.color.bg },
  header: { padding: 20, gap: 4, borderBottomWidth: 1, borderBottomColor: fl.color.line },
  name: { fontSize: 24, fontFamily: fl.font.display, color: fl.color.ink, textTransform: "uppercase" },
  meta: { fontSize: 13, color: fl.color.inkDim, fontFamily: fl.font.body },
  sectionTitle: { fontSize: 13, fontFamily: fl.font.bodySemibold, color: fl.color.ink, letterSpacing: 0.5, padding: 20, paddingBottom: 8 },
  playerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: fl.color.line,
  },
  playerName: { fontSize: 14, color: fl.color.ink, fontFamily: fl.font.body },
  playerMeta: { fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
});
