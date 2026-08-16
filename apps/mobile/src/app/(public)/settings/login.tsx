import { useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useAuth } from "@/features/auth/auth-context";
import { floodlight as fl } from "@/theme/floodlight";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setIsSubmitting(true);
    try {
      await login({ email, password });
      // On success, (public)/_layout.tsx's own guard redirects to (scout)
      // once the auth context's user state updates — no manual nav here.
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed. Check your credentials.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>SCOUT SIGN IN</Text>
      <Text style={styles.subtitle}>For authorized scouts and admins only.</Text>

      <View style={styles.field}>
        <Text style={styles.label}>EMAIL</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={fl.color.inkDim}
          autoCapitalize="none"
          autoComplete="email"
          keyboardType="email-address"
          value={email}
          onChangeText={setEmail}
        />
      </View>

      <View style={styles.field}>
        <Text style={styles.label}>PASSWORD</Text>
        <TextInput
          style={styles.input}
          placeholderTextColor={fl.color.inkDim}
          secureTextEntry
          autoCapitalize="none"
          value={password}
          onChangeText={setPassword}
        />
      </View>

      {error && <Text style={styles.error}>{error}</Text>}

      <Pressable
        style={({ pressed }) => [
          styles.button,
          (isSubmitting || pressed) && styles.buttonPressed,
          isSubmitting && styles.buttonDisabled,
        ]}
        disabled={isSubmitting || !email || !password}
        onPress={handleSubmit}
      >
        {isSubmitting ? (
          <ActivityIndicator color={fl.color.brandInk} />
        ) : (
          <Text style={styles.buttonText}>SIGN IN</Text>
        )}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 16, backgroundColor: fl.color.bg },
  title: { fontSize: 22, fontFamily: fl.font.display, color: fl.color.ink, letterSpacing: 0.5 },
  subtitle: { fontSize: 14, color: fl.color.inkDim, marginBottom: 8, fontFamily: fl.font.body },
  field: { gap: 6 },
  label: { fontSize: 11.5, fontFamily: fl.font.bodySemibold, color: fl.color.inkDim, letterSpacing: 0.4 },
  input: {
    borderWidth: 1,
    borderColor: fl.color.line,
    backgroundColor: fl.color.surface,
    borderRadius: fl.radius.md,
    padding: 13,
    fontSize: 16,
    color: fl.color.ink,
    fontFamily: fl.font.body,
  },
  error: { color: fl.color.danger, fontSize: 13, fontFamily: fl.font.body },
  button: {
    marginTop: 8,
    padding: 15,
    borderRadius: fl.radius.md,
    backgroundColor: fl.color.brand,
    alignItems: "center",
  },
  buttonPressed: { opacity: 0.85 },
  buttonDisabled: { opacity: 0.5 },
  buttonText: { color: fl.color.brandInk, fontFamily: fl.font.bodySemibold, letterSpacing: 0.5, fontSize: 13.5 },
});
