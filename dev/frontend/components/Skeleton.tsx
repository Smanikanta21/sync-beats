import { cn } from "@/lib/utils";

export function Skeleton({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "animate-shimmer bg-foreground/5 dark:bg-white/[0.06] rounded-xl relative overflow-hidden",
        className
      )}
      {...props}
    />
  );
}
