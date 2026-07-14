import { z } from "zod";
import { ALL_NEWS_STATUSES } from "@4ef/shared";

export const newsFormSchema = z.object({
  title: z.string().min(4, "Title is required").max(160),
  excerpt: z.string().max(280).optional().or(z.literal("")),
  body: z.string().min(10, "Body is required"),
  coverImageUrl: z.string().url("Enter a valid URL").optional().or(z.literal("")),
  status: z.enum(ALL_NEWS_STATUSES as [string, ...string[]]),
  tags: z.string().optional().or(z.literal("")),
});

export type NewsFormValues = z.infer<typeof newsFormSchema>;
