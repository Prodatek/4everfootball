"use client";

import { useRef, useState } from "react";
import { UserRound } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { uploadFile } from "@/features/media/api";

/**
 * Brief §5 B3: "photo capture must work from a phone camera directly, with
 * client-side compression before upload." `capture="environment"` opens the
 * rear camera directly on mobile (falls back to the normal file picker on
 * desktop, where the attribute is a no-op). Compression is plain Canvas —
 * no new dependency, downscales to a max dimension and re-encodes as JPEG
 * before the existing presigned-upload flow ever sees the file.
 */
async function compressImage(file: File, maxDimension = 800, quality = 0.75): Promise<File> {
  if (typeof createImageBitmap === "undefined") return file;

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);

  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob((b) => resolve(b), "image/jpeg", quality),
  );
  if (!blob) return file;

  return new File([blob], file.name.replace(/\.\w+$/, ".jpg"), { type: "image/jpeg" });
}

interface SquadPlayerPhotoFieldProps {
  value: string | undefined;
  onChange: (url: string | undefined) => void;
}

export function SquadPlayerPhotoField({ value, onChange }: SquadPlayerPhotoFieldProps) {
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(file: File) {
    setIsUploading(true);
    try {
      const compressed = await compressImage(file);
      const media = await uploadFile(compressed);
      onChange(media.url);
      toast.success("Photo added");
    } catch {
      toast.error("Failed to upload photo");
    } finally {
      setIsUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <Label>Photo</Label>
      <div className="flex items-center gap-3">
        {value ? (
          // eslint-disable-next-line @next/next/no-img-element -- dynamic, externally-hosted upload URL
          <img src={value} alt="" className="size-16 shrink-0 rounded-md border object-cover" />
        ) : (
          <div className="flex size-16 shrink-0 items-center justify-center rounded-md border bg-muted text-muted-foreground">
            <UserRound className="size-6" />
          </div>
        )}
        <div className="flex flex-col gap-1">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              if (file) void handleFile(file);
            }}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isUploading}
            onClick={() => inputRef.current?.click()}
          >
            {isUploading ? "Uploading..." : value ? "Retake photo" : "Take or upload photo"}
          </Button>
          {value && (
            <Button type="button" variant="ghost" size="sm" onClick={() => onChange(undefined)}>
              Remove
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
