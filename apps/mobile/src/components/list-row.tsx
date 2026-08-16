import type { ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { floodlight as fl } from "@/theme/floodlight";

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
    <Pressable style={({ pressed }) => [styles.row, pressed && styles.rowPressed]} onPress={onPress}>
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
    backgroundColor: fl.color.surface,
    borderWidth: 1,
    borderColor: fl.color.line,
    borderRadius: fl.radius.md,
  },
  rowPressed: { backgroundColor: fl.color.surfaceElevated },
  text: { gap: 3 },
  title: { fontSize: 15, fontFamily: fl.font.bodySemibold, color: fl.color.ink },
  subtitle: { fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.body },
  state: { padding: 32, alignItems: "center" },
  stateText: { color: fl.color.inkDim, fontFamily: fl.font.body },
});
