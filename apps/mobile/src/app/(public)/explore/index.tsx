import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { floodlight as fl } from "@/theme/floodlight";

const SECTIONS = [
  { href: "/(public)/explore/teams", label: "Teams" },
  { href: "/(public)/explore/players", label: "Players" },
  { href: "/(public)/explore/competitions", label: "Competitions" },
  { href: "/(public)/explore/search", label: "Search" },
] as const;

export default function ExploreScreen() {
  return (
    <View style={styles.container}>
      {SECTIONS.map((section) => (
        <Link key={section.href} href={section.href} asChild>
          <Pressable style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}>
            <Text style={styles.label}>{section.label}</Text>
            <View style={styles.chevron} />
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 10, backgroundColor: fl.color.bg },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 20,
    backgroundColor: fl.color.surface,
    borderWidth: 1,
    borderColor: fl.color.line,
    borderRadius: fl.radius.lg,
  },
  cardPressed: { backgroundColor: fl.color.surfaceElevated },
  label: { fontSize: 18, fontFamily: fl.font.display, color: fl.color.ink, textTransform: "uppercase" },
  chevron: {
    width: 8,
    height: 8,
    borderTopWidth: 2,
    borderRightWidth: 2,
    borderColor: fl.color.brand,
    transform: [{ rotate: "45deg" }],
  },
});
