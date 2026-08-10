import { Pressable, StyleSheet, Text, View } from "react-native";
import { useAuth } from "@/features/auth/auth-context";

export default function ScoutProfile() {
  const { user, logout } = useAuth();

  return (
    <View style={styles.container}>
      <Text style={styles.name}>{user?.displayName}</Text>
      <Text style={styles.email}>{user?.email}</Text>
      <Text style={styles.roles}>{user?.roles.join(", ")}</Text>

      <Pressable style={styles.logoutButton} onPress={logout}>
        <Text style={styles.logoutText}>Log out</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 8, backgroundColor: "#fff" },
  name: { fontSize: 20, fontWeight: "700" },
  email: { fontSize: 14, color: "#6b7280" },
  roles: { fontSize: 13, color: "#9ca3af", marginBottom: 24 },
  logoutButton: {
    padding: 14,
    borderRadius: 8,
    backgroundColor: "#111827",
    alignItems: "center",
  },
  logoutText: { color: "#fff", fontWeight: "700" },
});
