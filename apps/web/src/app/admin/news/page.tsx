"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuth } from "@/features/auth/auth-context";
import {
  createNews,
  deleteNews,
  fetchNewsForAdmin,
  updateNews,
  type NewsInput,
} from "@/features/news/api";
import { NewsFormDialog } from "@/features/news/news-form-dialog";
import type { NewsArticle } from "@4ef/shared";

export default function AdminNewsPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const canEdit =
    !!user &&
    (user.roles.includes("EDITOR") ||
      user.roles.includes("ADMIN") ||
      user.roles.includes("SUPER_ADMIN"));

  useEffect(() => {
    if (!isAuthLoading && !canEdit) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, canEdit, router]);

  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingArticle, setEditingArticle] = useState<NewsArticle | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-news"],
    queryFn: () =>
      fetchNewsForAdmin({ limit: 100, sortBy: "createdAt", sortOrder: "desc" }),
    enabled: canEdit,
  });

  const createMutation = useMutation({
    mutationFn: (input: NewsInput) => createNews(input),
    onSuccess: () => {
      toast.success("Article created");
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      setIsDialogOpen(false);
    },
    onError: () => toast.error("Failed to create article"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: NewsInput }) => updateNews(id, input),
    onSuccess: () => {
      toast.success("Article updated");
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
      setIsDialogOpen(false);
      setEditingArticle(null);
    },
    onError: () => toast.error("Failed to update article"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteNews(id),
    onSuccess: () => {
      toast.success("Article deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-news"] });
    },
    onError: () => toast.error("Failed to delete article"),
  });

  if (isAuthLoading || !canEdit) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Manage news</h1>
        <Button
          onClick={() => {
            setEditingArticle(null);
            setIsDialogOpen(true);
          }}
        >
          New article
        </Button>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading articles...</p>}

      {data && (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Title</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Published</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.data.map((article) => (
              <TableRow key={article.id}>
                <TableCell className="font-medium">{article.title}</TableCell>
                <TableCell>
                  <Badge variant={article.status === "PUBLISHED" ? "default" : "secondary"}>
                    {article.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  {article.publishedAt
                    ? new Date(article.publishedAt).toLocaleDateString()
                    : "—"}
                </TableCell>
                <TableCell className="flex justify-end gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setEditingArticle(article);
                      setIsDialogOpen(true);
                    }}
                  >
                    Edit
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => {
                      if (window.confirm(`Delete "${article.title}"? This cannot be undone.`)) {
                        deleteMutation.mutate(article.id);
                      }
                    }}
                  >
                    Delete
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}

      <NewsFormDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        article={editingArticle}
        isSubmitting={createMutation.isPending || updateMutation.isPending}
        onSubmit={async (values) => {
          if (editingArticle) {
            await updateMutation.mutateAsync({ id: editingArticle.id, input: values });
          } else {
            await createMutation.mutateAsync(values);
          }
        }}
      />
    </div>
  );
}
