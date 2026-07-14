"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { isAxiosError } from "axios";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { fetchNewsBySlug } from "@/features/news/api";

export default function NewsDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = use(params);

  const {
    data: article,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["news-article", slug],
    queryFn: () => fetchNewsBySlug(slug),
    retry: (failureCount, err) =>
      isAxiosError(err) && err.response?.status === 404 ? false : failureCount < 1,
  });

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (error || !article) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
        <p className="text-muted-foreground">Article not found.</p>
        <Button render={<Link href="/news" />} variant="outline">
          Back to news
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 p-6">
      <Button render={<Link href="/news" />} variant="outline" className="w-fit">
        Back to news
      </Button>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{article.title}</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            {article.author && <span>By {article.author.displayName}</span>}
            {article.publishedAt && (
              <span>{new Date(article.publishedAt).toLocaleDateString()}</span>
            )}
            {article.tags.map((tag) => (
              <Badge key={tag} variant="secondary">
                {tag}
              </Badge>
            ))}
          </div>
          <div className="whitespace-pre-wrap text-sm leading-relaxed">{article.body}</div>
        </CardContent>
      </Card>
    </div>
  );
}
