import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

const variants = {
  primary:
    "bg-green-dark text-white shadow-[0_8px_24px_-10px_rgba(0,89,79,.7)] hover:bg-green hover:shadow-[0_12px_28px_-10px_rgba(0,89,79,.8)]",
  gold: "bg-gold text-ink shadow-[0_8px_24px_-12px_rgba(173,158,110,.9)] hover:bg-gold-dark hover:text-white",
  maroon: "bg-maroon text-white hover:bg-maroon-dark shadow-[0_8px_24px_-12px_rgba(103,33,70,.8)]",
  outline: "border-2 border-green-dark/20 text-green-dark hover:border-green-dark hover:bg-green-dark/5",
  ghost: "text-green-dark hover:bg-green-dark/8",
  glass: "border border-white/25 bg-white/10 text-white backdrop-blur-md hover:bg-white/20",
} as const;

const sizes = {
  sm: "h-9 px-4 text-sm gap-1.5",
  md: "h-11 px-6 text-[15px] gap-2",
  lg: "h-14 px-8 text-lg gap-2.5",
  xl: "min-h-18 px-8 py-4 text-xl gap-3",
} as const;

type Common = {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
  className?: string;
  children: ReactNode;
};

const base =
  "group/btn relative inline-flex select-none items-center justify-center rounded-2xl font-semibold transition-all duration-300 ease-out-expo active:scale-[.97] disabled:pointer-events-none disabled:opacity-50";

export function Button({ variant = "primary", size = "md", className, children, ...props }: Common & ComponentProps<"button">) {
  return (
    <button className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </button>
  );
}

export function ButtonLink({ variant = "primary", size = "md", className, children, ...props }: Common & ComponentProps<typeof Link>) {
  return (
    <Link className={cn(base, variants[variant], sizes[size], className)} {...props}>
      {children}
    </Link>
  );
}
