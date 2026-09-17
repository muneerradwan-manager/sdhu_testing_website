import Image from "next/image";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** Dark photographic band behind the fixed header, with content card floating over it */
export function PortalShell({
  children,
  image = "/images/haram-2022.jpg",
  title,
  subtitle,
  aside,
  wide = false,
}: {
  children: ReactNode;
  image?: string;
  title?: ReactNode;
  subtitle?: ReactNode;
  aside?: ReactNode;
  wide?: boolean;
}) {
  return (
    <div className="relative">
      <div className="absolute inset-x-0 top-0 -z-10 h-[26rem] overflow-hidden bg-green-dark">
        <Image src={image} alt="" fill priority sizes="100vw" quality={70} className="object-cover opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-b from-ink/70 via-green-dark/85 to-green-dark" />
        <div className="bg-pattern absolute inset-0 opacity-20" />
      </div>
      <div className={cn("mx-auto px-4 pb-10 pt-36 md:px-8 md:pt-40", wide ? "max-w-7xl" : "max-w-6xl")}>
        {(title || subtitle) && (
          <div className="mb-8 text-white">
            {title && <h1 className="font-display text-3xl font-bold md:text-5xl">{title}</h1>}
            {subtitle && <div className="mt-3 max-w-2xl text-lg text-white/75">{subtitle}</div>}
          </div>
        )}
        {aside ? (
          <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
            {children}
            <aside className="space-y-4 lg:sticky lg:top-28">{aside}</aside>
          </div>
        ) : (
          children
        )}
      </div>
    </div>
  );
}

export function Card({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("rounded-[2rem] border border-gold/30 bg-white p-6 shadow-[0_30px_80px_-40px_rgba(2,21,38,.45)] md:p-10", className)}>{children}</div>;
}
