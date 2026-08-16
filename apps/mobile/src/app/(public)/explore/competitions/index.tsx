import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchCompetitions } from "@/features/competitions/api";
import { ListRow, ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

export default function CompetitionsListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["competitions"],
    queryFn: () => fetchCompetitions({ limit: 50, sortBy: "name", sortOrder: "asc" }),
  });

  return (
    <FlatList
      style={{ backgroundColor: fl.color.bg }}
      data={data?.data ?? []}
      keyExtractor={(competition) => competition.id}
      contentContainerStyle={{ padding: 16, gap: 8, flexGrow: 1 }}
      ListEmptyComponent={
        <ScreenState>{isLoading ? "Loading competitions..." : "No competitions found."}</ScreenState>
      }
      renderItem={({ item }) => (
        <ListRow
          title={item.name}
          subtitle={`${item.season}${item.country ? ` · ${item.country}` : ""}`}
          onPress={() => router.push(`/(public)/explore/competitions/${item.slug}`)}
        />
      )}
    />
  );
}
