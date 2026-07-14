"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import type { NewsArticle } from "@4ef/shared";
import { ALL_NEWS_STATUSES, NewsStatus } from "@4ef/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ImageUploadField } from "@/features/media/image-upload-field";
import { newsFormSchema, type NewsFormValues } from "./schemas";
import type { NewsInput } from "./api";

interface NewsFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  article?: NewsArticle | null;
  onSubmit: (values: NewsInput) => Promise<void>;
  isSubmitting: boolean;
}

function toDefaultValues(article?: NewsArticle | null): NewsFormValues {
  return {
    title: article?.title ?? "",
    excerpt: article?.excerpt ?? "",
    body: article?.body ?? "",
    coverImageUrl: article?.coverImageUrl ?? "",
    status: article?.status ?? NewsStatus.DRAFT,
    tags: article?.tags?.join(", ") ?? "",
  };
}

export function NewsFormDialog({
  open,
  onOpenChange,
  article,
  onSubmit,
  isSubmitting,
}: NewsFormDialogProps) {
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: toDefaultValues(article),
  });

  useEffect(() => {
    if (open) {
      reset(toDefaultValues(article));
    }
  }, [open, article, reset]);

  async function handleFormSubmit(values: NewsFormValues) {
    await onSubmit({
      title: values.title,
      excerpt: values.excerpt || undefined,
      body: values.body,
      coverImageUrl: values.coverImageUrl || undefined,
      status: values.status as NewsInput["status"],
      tags: values.tags
        ? values.tags
            .split(",")
            .map((tag) => tag.trim())
            .filter(Boolean)
        : [],
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{article ? "Edit article" : "New article"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(handleFormSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register("title")} />
            {errors.title && (
              <p className="text-sm text-destructive">{errors.title.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="excerpt">Excerpt</Label>
            <Textarea id="excerpt" rows={2} {...register("excerpt")} />
            {errors.excerpt && (
              <p className="text-sm text-destructive">{errors.excerpt.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <Label htmlFor="body">Body</Label>
            <Textarea id="body" rows={8} {...register("body")} />
            {errors.body && (
              <p className="text-sm text-destructive">{errors.body.message}</p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <Label>Status</Label>
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select status" />
                    </SelectTrigger>
                    <SelectContent>
                      {ALL_NEWS_STATUSES.map((status) => (
                        <SelectItem key={status} value={status}>
                          {status}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="tags">Tags (comma separated)</Label>
              <Input id="tags" placeholder="transfers, premier-league" {...register("tags")} />
            </div>
          </div>

          <Controller
            control={control}
            name="coverImageUrl"
            render={({ field }) => (
              <ImageUploadField
                label="Cover image"
                value={field.value || undefined}
                onChange={(url) => field.onChange(url ?? "")}
              />
            )}
          />
          {errors.coverImageUrl && (
            <p className="text-sm text-destructive">{errors.coverImageUrl.message}</p>
          )}

          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
