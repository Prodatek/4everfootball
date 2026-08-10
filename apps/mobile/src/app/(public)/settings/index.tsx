import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>4everfootball</Text>
      <Text style={styles.subtitle}>
        Browse teams, players, competitions, fixtures, live scores, and news — no account
        needed.
      </Text>

      <Link href="/(public)/settings/login" asChild>
        <Pressable style={styles.loginButton}>
          <Text style={styles.loginButtonText}>Scout Sign In</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 12, backgroundColor: "#fff" },
  title: { fontSize: 22, fontWeight: "700" },
  subtitle: { fontSize: 14, color: "#6b7280", marginBottom: 16 },
  loginButton: {
    padding: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#111827",
    alignItems: "center",
  },
  loginButtonText: { fontWeight: "700", color: "#111827" },
});
