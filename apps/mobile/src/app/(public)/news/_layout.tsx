import { Stack } from "expo-router";

export default function NewsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "News" }} />
      <Stack.Screen name="[slug]" options={{ title: "Article" }} />
    </Stack>
  );
}
