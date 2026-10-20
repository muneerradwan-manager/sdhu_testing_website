"use client";

import Link from "next/link";
import { Lock } from "lucide-react";
import type { ReactNode } from "react";
import { PortalShell } from "@/components/portal/shell";
import { AccountSidebar } from "./account-sidebar";

/** A page of the pilgrim's account: its title over the band, and the sidebar beside its content */
export function PilgrimShell({ title, subtitle, image = "/images/haram-2022.jpg", children }: { title: ReactNode; subtitle?: ReactNode; image?: string; children: ReactNode }) {
  return (
    <PortalShell
      wide
      image={image}
      header={
        <div className="text-white">
          <h1 className="font-display text-3xl font-bold md:text-5xl">{title}</h1>
          {subtitle && <div className="mt-3 max-w-3xl text-lg leading-8 text-white/75">{subtitle}</div>}
        </div>
      }
    >
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[16rem_minmax(0,1fr)]">
        <AccountSidebar />
        <div className="min-w-0">{children}</div>
      </div>
    </PortalShell>
  );
}

/** A page whose step has not come yet: what opens it, and the way to the steps */
export function PilgrimLocked({ title, text }: { title: string; text: string }) {
  return (
    <div className="rounded-[2rem] border-2 border-dashed border-gold/50 bg-white p-8 text-center md:p-12">
      <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-sand text-gold-dark">
        <Lock className="size-8" />
      </span>
      <p className="mt-4 font-display text-2xl font-bold text-green-dark">{title}</p>
      <p className="mx-auto mt-2 max-w-xl leading-8 text-ink-soft">{text}</p>
      <Link href="/portal/application" className="mt-5 inline-flex rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
        طلبي وخطواته
      </Link>
    </div>
  );
}
