import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchPlayers } from "@/features/players/api";
import { ListRow, ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

export default function PlayersListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: () => fetchPlayers({ limit: 50, sortBy: "lastName", sortOrder: "asc" }),
  });

  return (
    <FlatList
      style={{ backgroundColor: fl.color.bg }}
      data={data?.data ?? []}
      keyExtractor={(player) => player.id}
      contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
      ListEmptyComponent={
        <ScreenState>{isLoading ? "Loading players..." : "No players found."}</ScreenState>
      }
      renderItem={({ item }) => (
        <ListRow
          title={`${item.firstName} ${item.lastName}`}
          subtitle={item.position ?? undefined}
          onPress={() => router.push(`/(public)/explore/players/${item.slug}`)}
        />
      )}
    />
  );
}
