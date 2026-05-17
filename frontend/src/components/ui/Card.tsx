import { cn } from "@/src/lib/cn";

export default function Card({
  className,
  children,
  padding = "md",
}: {
  className?: string;
  children: React.ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
}) {
  const pad =
    padding === "none"
      ? ""
      : padding === "sm"
        ? "p-3"
        : padding === "lg"
          ? "p-6"
          : "p-4";
  return (
    <div className={cn("vx-card", pad, className)}>{children}</div>
  );
}
