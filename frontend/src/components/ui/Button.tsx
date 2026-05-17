"use client";

import { cn } from "@/src/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-zinc-900 text-white hover:bg-zinc-800 shadow-sm disabled:bg-zinc-400",
  secondary:
    "bg-white text-zinc-800 border border-zinc-200 hover:bg-zinc-50 shadow-sm",
  ghost: "text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900",
  danger:
    "bg-white text-rose-700 border border-rose-200 hover:bg-rose-50",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-xs rounded-md",
  md: "h-9 px-4 text-sm rounded-lg",
};

export default function Button({
  variant = "secondary",
  size = "md",
  className,
  children,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
}) {
  return (
    <button
      type="button"
      className={cn(
        "inline-flex items-center justify-center gap-1.5 font-medium transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
