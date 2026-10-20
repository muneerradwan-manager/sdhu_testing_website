"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Goes on to the page's new address at once, with a link for a browser that does not follow */
export function MovedTo({ href }: { href: string }) {
  const router = useRouter();
  useEffect(() => router.replace(href), [router, href]);
  return (
    <div className="grid min-h-[60vh] place-items-center px-4 pt-32 text-center">
      <p className="text-ink-soft">
        انتقلت هذه الصفحة إلى حسابك في المنصة. <Link href={href} className="font-bold text-green-dark underline">افتحها</Link>
      </p>
    </div>
  );
}
