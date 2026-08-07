"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Container } from "@/components/layout/container";
import { EntityImage } from "@/components/media/entity-image";
import { fetchNews } from "@/features/news/api";

export default function NewsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["news", { search, page }],
    queryFn: () => fetchNews({ search: search || undefined, page, limit: 12 }),
  });

  return (
    <Container size="md" className="flex flex-1 flex-col gap-6 py-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-2xl uppercase tracking-wide">News</h1>
        <Input
          placeholder="Search articles..."
          className="max-w-xs"
          value={search}
          onChange={(event) => {
            setSearch(event.target.value);
            setPage(1);
          }}
        />
      </div>

      {isError && <p className="text-destructive">Failed to load articles.</p>}
      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No articles found.</p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
        {isLoading &&
          Array.from({ length: 6 }).map((_, index) => (
            <Skeleton key={index} className="aspect-[4/3] rounded-lg" />
          ))}
        {data?.data.map((article) => (
          <Link key={article.id} href={`/news/${article.slug}`}>
            <Card className="h-full overflow-hidden transition-colors hover:border-primary hover:bg-muted">
              <EntityImage
                src={article.coverImageUrl}
                alt={article.title}
                fallback="news"
                className="aspect-video w-full rounded-none"
                sizes="(min-width: 768px) 33vw, 100vw"
              />
              <CardHeader>
                <CardTitle className="text-base">{article.title}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1 text-sm text-muted-foreground">
                {article.excerpt && <p className="line-clamp-3">{article.excerpt}</p>}
                {article.publishedAt && (
                  <p className="text-xs">
                    {new Date(article.publishedAt).toLocaleDateString()}
                  </p>
                )}
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {data && data.meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((current) => current - 1)}
          >
            Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {data.meta.page} of {data.meta.totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= data.meta.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </Container>
  );
}
