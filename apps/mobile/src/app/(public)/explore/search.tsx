import { useState, type ReactNode } from "react";
import { ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { search } from "@/features/search/api";
import { ListRow, ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

export default function SearchScreen() {
  const router = useRouter();
  const [query, setQuery] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["search", query],
    queryFn: () => search(query, 10),
    enabled: query.length > 0,
  });

  const hasResults =
    data &&
    (data.teams.length > 0 ||
      data.players.length > 0 ||
      data.competitions.length > 0 ||
      data.news.length > 0);

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Search teams, players, competitions, news..."
        placeholderTextColor={fl.color.inkDim}
        value={query}
        onChangeText={setQuery}
        autoCapitalize="none"
      />

      <ScrollView contentContainerStyle={styles.results}>
        {!query && <ScreenState>Type something to search.</ScreenState>}
        {query && isLoading && <ScreenState>Searching...</ScreenState>}
        {query && !isLoading && !hasResults && <ScreenState>No results for &quot;{query}&quot;.</ScreenState>}

        {data && data.teams.length > 0 && (
          <Section title="TEAMS">
            {data.teams.map((team) => (
              <ListRow
                key={team.id}
                title={team.name}
                subtitle={team.country ?? undefined}
                onPress={() => router.push(`/(public)/explore/teams/${team.slug}`)}
              />
            ))}
          </Section>
        )}

        {data && data.players.length > 0 && (
          <Section title="PLAYERS">
            {data.players.map((player) => (
              <ListRow
                key={player.id}
                title={`${player.firstName} ${player.lastName}`}
                subtitle={player.teamName ?? undefined}
                onPress={() => router.push(`/(public)/explore/players/${player.slug}`)}
              />
            ))}
          </Section>
        )}

        {data && data.competitions.length > 0 && (
          <Section title="COMPETITIONS">
            {data.competitions.map((competition) => (
              <ListRow
                key={competition.id}
                title={competition.name}
                subtitle={competition.season}
                onPress={() => router.push(`/(public)/explore/competitions/${competition.slug}`)}
              />
            ))}
          </Section>
        )}

        {data && data.news.length > 0 && (
          <Section title="NEWS">
            {data.news.map((article) => (
              <ListRow
                key={article.id}
                title={article.title}
                onPress={() => router.push(`/(public)/news/${article.slug}`)}
              />
            ))}
          </Section>
        )}
      </ScrollView>
    </View>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionList}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fl.color.bg },
  input: {
    margin: 16,
    borderWidth: 1,
    borderColor: fl.color.line,
    backgroundColor: fl.color.surface,
    borderRadius: fl.radius.md,
    padding: 13,
    fontSize: 15,
    color: fl.color.ink,
    fontFamily: fl.font.body,
  },
  results: { paddingHorizontal: 16, paddingBottom: 24, gap: 20, flexGrow: 1 },
  section: { gap: 8 },
  sectionTitle: { fontSize: 13, fontFamily: fl.font.bodySemibold, color: fl.color.ink, letterSpacing: 0.5 },
  sectionList: { gap: 8 },
});
