import { FlatList } from "react-native";
import { useRouter } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNews } from "@/features/news/api";
import { ListRow, ScreenState } from "@/components/list-row";

export default function NewsListScreen() {
  const router = useRouter();
  const { data, isLoading } = useQuery({
    queryKey: ["news"],
    queryFn: () => fetchNews({ limit: 50, sortBy: "publishedAt", sortOrder: "desc" }),
  });

  return (
    <FlatList
      data={data?.data ?? []}
      keyExtractor={(article) => article.id}
      contentContainerStyle={{ padding: 16, gap: 8 }}
      ListEmptyComponent={
        <ScreenState>{isLoading ? "Loading news..." : "No articles yet."}</ScreenState>
      }
      renderItem={({ item }) => (
        <ListRow
          title={item.title}
          subtitle={item.excerpt ?? undefined}
          onPress={() => router.push(`/(public)/news/${item.slug}`)}
        />
      )}
    />
  );
}
