import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchFixtures } from "@/features/fixtures/api";
import { FixtureRow } from "@/features/fixtures/fixture-row";
import { ScreenState } from "@/components/list-row";

export default function FixturesListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["fixtures"],
    queryFn: () => fetchFixtures({ limit: 50, sortBy: "kickoffAt", sortOrder: "desc" }),
  });

  return (
    <FlatList
      data={data?.data ?? []}
      keyExtractor={(fixture) => fixture.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListEmptyComponent={
        <ScreenState>{isLoading ? "Loading fixtures..." : "No fixtures found."}</ScreenState>
      }
      renderItem={({ item }) => (
        <FixtureRow fixture={item} onPress={() => router.push(`/(public)/fixtures/${item.id}`)} />
      )}
    />
  );
}
