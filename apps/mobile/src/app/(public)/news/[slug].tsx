import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsBySlug } from "@/features/news/api";
import { ScreenState } from "@/components/list-row";

export default function NewsDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>();

  const { data: article, isLoading } = useQuery({
    queryKey: ["news-article", slug],
    queryFn: () => fetchNewsBySlug(slug),
  });

  if (isLoading || !article) {
    return <ScreenState>{isLoading ? "Loading..." : "Article not found."}</ScreenState>;
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {article.coverImageUrl && (
        <Image source={{ uri: article.coverImageUrl }} style={styles.cover} resizeMode="cover" />
      )}
      <Text style={styles.title}>{article.title}</Text>
      <Text style={styles.meta}>
        {article.author?.displayName ?? "4everfootball"}
        {article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ""}
      </Text>
      <Text style={styles.body}>{article.body}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  content: { padding: 16, gap: 12 },
  cover: { width: "100%", aspectRatio: 16 / 9, borderRadius: 8, backgroundColor: "#f3f4f6" },
  title: { fontSize: 22, fontWeight: "700" },
  meta: { fontSize: 13, color: "#6b7280" },
  body: { fontSize: 15, lineHeight: 22 },
});
