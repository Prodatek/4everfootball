import { Stack } from "expo-router";
import { floodlightStackScreenOptions } from "@/theme/floodlight";

export default function ExploreLayout() {
  return (
    <Stack screenOptions={floodlightStackScreenOptions}>
      <Stack.Screen name="index" options={{ title: "EXPLORE" }} />
      <Stack.Screen name="teams/index" options={{ title: "TEAMS" }} />
      <Stack.Screen name="teams/[slug]" options={{ title: "TEAM" }} />
      <Stack.Screen name="players/index" options={{ title: "PLAYERS" }} />
      <Stack.Screen name="players/[slug]" options={{ title: "PLAYER" }} />
      <Stack.Screen name="competitions/index" options={{ title: "COMPETITIONS" }} />
      <Stack.Screen name="competitions/[slug]" options={{ title: "COMPETITION" }} />
      <Stack.Screen name="search" options={{ title: "SEARCH" }} />
    </Stack>
  );
}
