import { StyleSheet, Text, View } from "react-native";
import type { MatchEvent } from "@4ef/shared";
import { MATCH_EVENT_LABELS } from "./event-labels";

function formatMinute(event: MatchEvent): string {
  return event.stoppageMinute ? `${event.minute}+${event.stoppageMinute}'` : `${event.minute}'`;
}

export function MatchTimeline({ events }: { events: MatchEvent[] }) {
  if (events.length === 0) {
    return <Text style={styles.empty}>No events recorded yet.</Text>;
  }

  return (
    <View style={styles.list}>
      {[...events].reverse().map((event) => (
        <View key={event.id} style={styles.row}>
          <Text style={styles.minute}>{formatMinute(event)}</Text>
          <Text style={styles.type}>{MATCH_EVENT_LABELS[event.type]}</Text>
          {event.player && (
            <Text style={styles.player}>
              {event.player.firstName} {event.player.lastName}
              {event.assistPlayer &&
                ` (assist: ${event.assistPlayer.firstName} ${event.assistPlayer.lastName})`}
            </Text>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  empty: { fontSize: 14, color: "#6b7280" },
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  minute: { width: 40, fontVariant: ["tabular-nums"], color: "#6b7280", fontSize: 13 },
  type: { fontWeight: "600", fontSize: 14 },
  player: { color: "#6b7280", fontSize: 13 },
});
