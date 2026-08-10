import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchTeams } from "@/features/teams/api";
import { ListRow, ScreenState } from "@/components/list-row";

export default function TeamsListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["teams"],
    queryFn: () => fetchTeams({ limit: 50, sortBy: "name", sortOrder: "asc" }),
  });

  return (
    <FlatList
      data={data?.data ?? []}
      keyExtractor={(team) => team.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListEmptyComponent={
        <ScreenState>{isLoading ? "Loading teams..." : "No teams found."}</ScreenState>
      }
      renderItem={({ item }) => (
        <ListRow
          title={item.name}
          subtitle={item.country ?? undefined}
          onPress={() => router.push(`/(public)/explore/teams/${item.slug}`)}
        />
      )}
    />
  );
}
