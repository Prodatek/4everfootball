import { Stack } from "expo-router";

export default function FixturesLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Fixtures" }} />
      <Stack.Screen name="[id]" options={{ title: "Fixture" }} />
    </Stack>
  );
}
