import { Link } from "expo-router";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { floodlight as fl } from "@/theme/floodlight";

export default function SettingsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>4EVERFOOTBALL</Text>
      <Text style={styles.subtitle}>
        Browse teams, players, competitions, fixtures, live scores, and news — no account
        needed.
      </Text>

      <Link href="/(public)/settings/login" asChild>
        <Pressable style={({ pressed }) => [styles.loginButton, pressed && styles.loginButtonPressed]}>
          <Text style={styles.loginButtonText}>SCOUT SIGN IN</Text>
        </Pressable>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14, backgroundColor: fl.color.bg },
  title: { fontSize: 26, fontFamily: fl.font.display, color: fl.color.ink, letterSpacing: 0.5 },
  subtitle: { fontSize: 14.5, color: fl.color.inkDim, marginBottom: 16, fontFamily: fl.font.body, lineHeight: 21 },
  loginButton: {
    padding: 16,
    borderRadius: fl.radius.md,
    borderWidth: 1.5,
    borderColor: fl.color.brand,
    alignItems: "center",
  },
  loginButtonPressed: { backgroundColor: fl.color.surfaceElevated },
  loginButtonText: { fontFamily: fl.font.bodySemibold, color: fl.color.brand, letterSpacing: 0.5, fontSize: 13.5 },
});
