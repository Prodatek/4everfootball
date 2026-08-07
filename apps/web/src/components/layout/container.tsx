import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

const sizeMap = {
  sm: "max-w-2xl",
  md: "max-w-4xl",
  lg: "max-w-6xl",
} as const;

export function Container({
  children,
  className,
  size = "md",
}: {
  children: ReactNode;
  className?: string;
  size?: keyof typeof sizeMap;
}) {
  return (
    <div className={cn("mx-auto w-full px-4 sm:px-6", sizeMap[size], className)}>
      {children}
    </div>
  );
}
