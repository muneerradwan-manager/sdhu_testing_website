"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { Emblem } from "@/components/brand/logo";
import { useHydrated, useStore } from "@/lib/store";

export function AuthGate({ children }: { children: ReactNode }) {
  const hydrated = useHydrated();
  const sessionId = useStore((s) => s.sessionId);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (hydrated && !sessionId) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [hydrated, sessionId, router, pathname]);

  if (!hydrated || !sessionId) {
    return (
      <div className="grid min-h-[80vh] place-items-center bg-green-dark">
        <Emblem className="size-20 animate-pulse" animated />
      </div>
    );
  }
  return children;
}
