import Image from "next/image";
import { Newspaper, Shield, UserRound } from "lucide-react";
import { cn } from "@/lib/utils";

const FALLBACK_ICONS = {
  team: Shield,
  player: UserRound,
  competition: Shield,
  news: Newspaper,
} as const;

export function EntityImage({
  src,
  alt,
  className,
  fallback,
  sizes,
}: {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallback: keyof typeof FALLBACK_ICONS;
  sizes?: string;
}) {
  if (!src) {
    const FallbackIcon = FALLBACK_ICONS[fallback];
    return (
      <div
        className={cn(
          "flex items-center justify-center overflow-hidden rounded-md bg-muted text-primary/70",
          className,
        )}
      >
        <FallbackIcon className="size-1/2" />
      </div>
    );
  }

  return (
    <div className={cn("relative overflow-hidden rounded-md", className)}>
      <Image
        src={src}
        alt={alt}
        fill
        sizes={sizes ?? "96px"}
        className="object-cover"
      />
    </div>
  );
}
