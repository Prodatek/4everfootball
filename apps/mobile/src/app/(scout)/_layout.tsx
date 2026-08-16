import { Redirect, Stack } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";
import { fourthOfficial as fo } from "@/theme/fourth-official";

// The mirror image of (public)/_layout.tsx's guard: this whole group is
// off-limits to anyone without a privileged (SCOUT/ADMIN/SUPER_ADMIN)
// session, even though the API itself is what actually enforces the real
// security boundary — this is a UX guard, not the auth boundary.
export default function ScoutLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && !user) {
    return <Redirect href="/(public)/settings/login" />;
  }

  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: fo.color.ink },
        headerTintColor: "#fff",
        headerTitleStyle: { fontFamily: fo.font.displayBold, fontSize: 15 },
        contentStyle: { backgroundColor: fo.color.bg },
      }}
    >
      <Stack.Screen name="index" options={{ title: "PICK A FIXTURE" }} />
      <Stack.Screen name="fixtures/[id]" options={{ title: "RECORD EVENTS" }} />
      <Stack.Screen name="profile" options={{ title: "PROFILE" }} />
    </Stack>
  );
}
