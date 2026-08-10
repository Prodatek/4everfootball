import { Stack } from "expo-router";

export default function ExploreLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Explore" }} />
      <Stack.Screen name="teams/index" options={{ title: "Teams" }} />
      <Stack.Screen name="teams/[slug]" options={{ title: "Team" }} />
      <Stack.Screen name="players/index" options={{ title: "Players" }} />
      <Stack.Screen name="players/[slug]" options={{ title: "Player" }} />
      <Stack.Screen name="competitions/index" options={{ title: "Competitions" }} />
      <Stack.Screen name="competitions/[slug]" options={{ title: "Competition" }} />
      <Stack.Screen name="search" options={{ title: "Search" }} />
    </Stack>
  );
}
