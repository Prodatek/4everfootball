import { Stack } from "expo-router";
import { floodlightStackScreenOptions } from "@/theme/floodlight";

export default function FixturesLayout() {
  return (
    <Stack screenOptions={floodlightStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "FIXTURES" }} />
      <Stack.Screen name="[id]" options={{ title: "FIXTURE" }} />
    </Stack>
  );
}
