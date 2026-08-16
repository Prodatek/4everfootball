import { Stack } from "expo-router";
import { floodlightStackScreenOptions } from "@/theme/floodlight";

export default function LiveLayout() {
  return (
    <Stack screenOptions={floodlightStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "LIVE" }} />
    </Stack>
  );
}
