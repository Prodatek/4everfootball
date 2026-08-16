import { StyleSheet, Text, View } from "react-native";
import type { MatchEvent } from "@4ef/shared";
import { MATCH_EVENT_LABELS } from "./event-labels";
import { floodlight } from "@/theme/floodlight";
import { fourthOfficial } from "@/theme/fourth-official";

function formatMinute(event: MatchEvent): string {
  return event.stoppageMinute ? `${event.minute}+${event.stoppageMinute}'` : `${event.minute}'`;
}

// Rendered in both the public fixture-detail screen (Floodlight) and the
// scout recorder (Fourth Official) — the one genuinely shared piece of UI
// across the two design systems, so it takes an explicit theme rather than
// assuming one.
export function MatchTimeline({
  events,
  theme = "floodlight",
}: {
  events: MatchEvent[];
  theme?: "floodlight" | "fourth-official";
}) {
  const t = theme === "floodlight" ? floodlightStyles : fourthOfficialStyles;

  if (events.length === 0) {
    return <Text style={t.empty}>No events recorded yet.</Text>;
  }

  return (
    <View style={t.list}>
      {[...events].reverse().map((event) => (
        <View key={event.id} style={t.row}>
          <Text style={t.minute}>{formatMinute(event)}</Text>
          <Text style={t.type}>{MATCH_EVENT_LABELS[event.type]}</Text>
          {event.player && (
            <Text style={t.player}>
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

const floodlightStyles = StyleSheet.create({
  empty: { fontSize: 14, color: floodlight.color.inkDim, fontFamily: floodlight.font.body },
  list: { gap: 10 },
  row: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  minute: {
    width: 42,
    fontVariant: ["tabular-nums"],
    color: floodlight.color.brand,
    fontSize: 12,
    fontFamily: floodlight.font.mono,
  },
  type: { fontWeight: "700", fontSize: 14, color: floodlight.color.ink, fontFamily: floodlight.font.bodySemibold },
  player: { color: floodlight.color.inkDim, fontSize: 13, fontFamily: floodlight.font.body },
});

const fourthOfficialStyles = StyleSheet.create({
  empty: { fontSize: 14, color: fourthOfficial.color.inkDim },
  list: { gap: 8 },
  row: { flexDirection: "row", alignItems: "baseline", gap: 8, flexWrap: "wrap" },
  minute: {
    width: 44,
    fontVariant: ["tabular-nums"],
    color: fourthOfficial.color.accent,
    fontSize: 12,
    fontFamily: fourthOfficial.font.mono,
    fontWeight: "700",
  },
  type: { fontWeight: "800", fontSize: 13, color: fourthOfficial.color.ink, textTransform: "uppercase" },
  player: { color: fourthOfficial.color.inkDim, fontSize: 13 },
});
