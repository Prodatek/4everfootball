import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

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
          <Pressable style={styles.card}>
            <Text style={styles.label}>{section.label}</Text>
          </Pressable>
        </Link>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 12, backgroundColor: "#fff" },
  card: {
    padding: 20,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  label: { fontSize: 17, fontWeight: "600" },
});
