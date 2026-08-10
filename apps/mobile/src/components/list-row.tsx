import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";

export function ListRow({
  title,
  subtitle,
  onPress,
}: {
  title: string;
  subtitle?: string;
  onPress: () => void;
}) {
  return (
    <Pressable style={styles.row} onPress={onPress}>
      <View style={styles.text}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
    </Pressable>
  );
}

export function ScreenState({ children }: { children: ReactNode }) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateText}>{children}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    padding: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
  },
  text: { gap: 2 },
  title: { fontSize: 15, fontWeight: "600" },
  subtitle: { fontSize: 13, color: "#6b7280" },
  state: { padding: 32, alignItems: "center" },
  stateText: { color: "#6b7280" },
});
