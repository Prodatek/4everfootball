import { Stack } from "expo-router";
import { floodlightStackScreenOptions } from "@/theme/floodlight";

export default function NewsLayout() {
  return (
    <Stack screenOptions={floodlightStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "NEWS" }} />
      <Stack.Screen name="[slug]" options={{ title: "ARTICLE" }} />
    </Stack>
  );
}
