import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/features/auth/auth-context";
import { fourthOfficial as fo } from "@/theme/fourth-official";

export default function ScoutProfile() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.name}>{user?.displayName}</Text>
        <Text style={styles.email}>{user?.email}</Text>
        <View style={styles.roles}>
          {user?.roles.map((role) => (
            <Text key={role} style={styles.roleChip}>
              {role}
            </Text>
          ))}
        </View>
      </View>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>LOG OUT</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16, gap: 16, backgroundColor: fo.color.bg },
  card: {
    backgroundColor: fo.color.surface,
    borderWidth: 2,
    borderColor: fo.color.line,
    borderRadius: fo.radius.md,
    padding: 20,
    gap: 8,
  },
  name: { fontSize: 20, fontFamily: fo.font.display, color: fo.color.ink, textTransform: "uppercase" },
  email: { fontSize: 14, color: fo.color.inkDim },
  roles: { flexDirection: "row", flexWrap: "wrap", gap: 6, marginTop: 8 },
  roleChip: {
    fontSize: 10,
    fontFamily: fo.font.mono,
    fontWeight: "700",
    color: fo.color.ink,
    borderWidth: 1,
    borderColor: fo.color.line,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderRadius: 2,
  },
  logoutButton: {
    padding: 16,
    borderRadius: fo.radius.md,
    backgroundColor: fo.color.cardRed,
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontFamily: fo.font.displayBold, letterSpacing: 0.5 },
});
