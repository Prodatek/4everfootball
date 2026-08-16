import { Stack } from "expo-router";
import { floodlightStackScreenOptions } from "@/theme/floodlight";

export default function SettingsLayout() {
  return (
    <Stack screenOptions={floodlightStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "SETTINGS" }} />
      <Stack.Screen name="login" options={{ title: "SCOUT SIGN IN" }} />
    </Stack>
  );
}
