"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/features/auth/auth-context";
import { deleteMedia, fetchMedia, uploadFile } from "@/features/media/api";

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdminMediaPage() {
  const router = useRouter();
  const { user, isLoading: isAuthLoading } = useAuth();
  const canManage =
    !!user &&
    (user.roles.includes("EDITOR") ||
      user.roles.includes("ADMIN") ||
      user.roles.includes("SUPER_ADMIN"));

  useEffect(() => {
    if (!isAuthLoading && !canManage) {
      router.replace("/dashboard");
    }
  }, [isAuthLoading, canManage, router]);

  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-media"],
    queryFn: () => fetchMedia({ limit: 60 }),
    enabled: canManage,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedia(id),
    onSuccess: () => {
      toast.success("Media deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    },
    onError: () => toast.error("Failed to delete media"),
  });

  async function handleFileSelected(file: File) {
    setIsUploading(true);
    try {
      await uploadFile(file);
      toast.success("File uploaded");
      queryClient.invalidateQueries({ queryKey: ["admin-media"] });
    } catch {
      toast.error("Failed to upload file");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  if (isAuthLoading || !canManage) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-muted-foreground">
        Loading...
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-1 flex-col gap-6 p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Media library</h1>
        <div>
          <input
            ref={inputRef}
            type="file"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFileSelected(file);
            }}
          />
          <Button disabled={isUploading} onClick={() => inputRef.current?.click()}>
            {isUploading ? "Uploading..." : "Upload file"}
          </Button>
        </div>
      </div>

      {isLoading && <p className="text-muted-foreground">Loading media...</p>}
      {data && data.data.length === 0 && (
        <p className="text-muted-foreground">No media uploaded yet.</p>
      )}

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {data?.data.map((item) => (
          <Card key={item.id}>
            <CardContent className="flex flex-col gap-2 p-3">
              {item.kind === "IMAGE" ? (
                // eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted upload URL
                <img
                  src={item.url}
                  alt={item.filename}
                  className="aspect-square w-full rounded-md border object-cover"
                />
              ) : (
                <div className="flex aspect-square w-full items-center justify-center rounded-md border bg-muted text-xs text-muted-foreground">
                  {item.kind}
                </div>
              )}
              <p className="truncate text-xs" title={item.filename}>
                {item.filename}
              </p>
              <p className="text-xs text-muted-foreground">{formatBytes(item.sizeBytes)}</p>
              <Button
                size="sm"
                variant="destructive"
                disabled={deleteMutation.isPending}
                onClick={() => {
                  if (window.confirm(`Delete "${item.filename}"? This cannot be undone.`)) {
                    deleteMutation.mutate(item.id);
                  }
                }}
              >
                Delete
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
