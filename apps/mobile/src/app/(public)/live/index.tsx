import { ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import type { Fixture } from "@4ef/shared";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

const POLL_INTERVAL_MS = 30_000;
const CONCLUDED_WINDOW_HOURS = 3;
const UPCOMING_WINDOW_HOURS = 24;

export default function LiveScreen() {
  const router = useRouter();
  const now = Date.now();

  const { data: live } = useQuery({
    queryKey: ["live-fixtures", "live"],
    queryFn: () => fetchFixtures({ status: "LIVE", limit: 50 }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: concluded } = useQuery({
    queryKey: ["live-fixtures", "concluded"],
    queryFn: () =>
      fetchFixtures({
        status: "FINISHED",
        fromDate: new Date(now - CONCLUDED_WINDOW_HOURS * 3_600_000).toISOString(),
        toDate: new Date(now).toISOString(),
        limit: 50,
      }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  const { data: upcoming } = useQuery({
    queryKey: ["live-fixtures", "upcoming"],
    queryFn: () =>
      fetchFixtures({
        status: "SCHEDULED",
        fromDate: new Date(now).toISOString(),
        toDate: new Date(now + UPCOMING_WINDOW_HOURS * 3_600_000).toISOString(),
        limit: 50,
      }),
    refetchInterval: POLL_INTERVAL_MS,
  });

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Section title="LIVE NOW" fixtures={live?.data} onPress={goTo} accent />
      <Section title="JUST CONCLUDED" fixtures={concluded?.data} onPress={goTo} />
      <Section title="UPCOMING · NEXT 24H" fixtures={upcoming?.data} onPress={goTo} />
    </ScrollView>
  );

  function goTo(id: string) {
    router.push(`/(public)/fixtures/${id}`);
  }
}

function Section({
  title,
  fixtures,
  onPress,
  accent,
}: {
  title: string;
  fixtures?: Fixture[];
  onPress: (id: string) => void;
  accent?: boolean;
}) {
  return (
    <View style={styles.section}>
      <View style={styles.sectionHead}>
        {accent && <View style={styles.liveDot} />}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {!fixtures ? (
        <ScreenState>Loading...</ScreenState>
      ) : fixtures.length === 0 ? (
        <ScreenState>Nothing here right now.</ScreenState>
      ) : (
        <View style={styles.list}>
          {fixtures.map((fixture) => (
            <FixtureRow key={fixture.id} fixture={fixture} onPress={() => onPress(fixture.id)} />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { backgroundColor: fl.color.bg },
  content: { padding: 16, gap: 28, flexGrow: 1 },
  section: { gap: 10 },
  sectionHead: { flexDirection: "row", alignItems: "center", gap: 8 },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: fl.color.live },
  sectionTitle: { fontSize: 13, fontFamily: fl.font.bodySemibold, color: fl.color.ink, letterSpacing: 0.5 },
  list: { gap: 8 },
});
