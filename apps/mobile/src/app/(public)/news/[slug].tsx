import { Image, ScrollView, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams } from "expo-router";
import { useQuery } from "@tanstack/react-query";
import { fetchNewsBySlug } from "@/features/news/api";
import { ScreenState } from "@/components/list-row";
import { floodlight as fl } from "@/theme/floodlight";

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
      <View style={styles.body}>
        <Text style={styles.title}>{article.title}</Text>
        <Text style={styles.meta}>
          {article.author?.displayName ?? "4everfootball"}
          {article.publishedAt ? ` · ${new Date(article.publishedAt).toLocaleDateString()}` : ""}
        </Text>
        <Text style={styles.bodyText}>{article.body}</Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: fl.color.bg },
  content: { paddingBottom: 32 },
  cover: { width: "100%", aspectRatio: 16 / 9, backgroundColor: fl.color.surface },
  body: { padding: 20, gap: 12 },
  title: { fontSize: 24, fontFamily: fl.font.display, color: fl.color.ink, textTransform: "uppercase" },
  meta: { fontSize: 12.5, color: fl.color.inkDim, fontFamily: fl.font.mono },
  bodyText: { fontSize: 15, lineHeight: 23, color: fl.color.ink, fontFamily: fl.font.body },
});
