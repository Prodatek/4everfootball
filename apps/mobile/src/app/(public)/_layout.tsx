import { Redirect, Tabs } from "expo-router";
import { useAuth } from "@/features/auth/auth-context";

// A privileged (SCOUT/ADMIN/SUPER_ADMIN) session means the whole app UI is
// the scout tool, not the public browsing tabs — this is the other half of
// the guard in (scout)/_layout.tsx, which redirects the other direction.
export default function PublicLayout() {
  const { user, isLoading } = useAuth();

  if (!isLoading && user) {
    return <Redirect href="/(scout)" />;
  }

  // Every tab folder has its own nested Stack managing its own header (see
  // each tab's _layout.tsx) — the Tabs navigator itself stays header-free so
  // the two don't double up.
  return (
    <Tabs screenOptions={{ headerShown: false }}>
      <Tabs.Screen name="fixtures" options={{ title: "Fixtures" }} />
      <Tabs.Screen name="live" options={{ title: "Live" }} />
      <Tabs.Screen name="explore" options={{ title: "Explore" }} />
      <Tabs.Screen name="news" options={{ title: "News" }} />
      <Tabs.Screen name="settings" options={{ title: "Settings" }} />
    </Tabs>
  );
}
