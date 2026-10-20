"use client";

import Link from "next/link";
import { Briefcase } from "lucide-react";
import { useEffect } from "react";
import { useAccount } from "@/lib/account";
import { useAnyOperation } from "@/lib/operations";
import { actions, useHydrated } from "@/lib/store";
import { PilgrimShell } from "../_components/pilgrim-shell";
import { ApplyFlow } from "./_components/flow";

export default function ApplyPage() {
  const hydrated = useHydrated();
  const acc = useAccount();
  const hajj = useAnyOperation(["hajj-direct", "hajj-lottery"]).open;
  // A member who opens the Hajj's registration while it is open has chosen the Hajj for the season: from now his
  // account shows the pilgrim's pages (he can take it back from «ملفي» while no application is saved)
  const choose = hydrated && !!acc && !acc.path && hajj;
  useEffect(() => {
    if (choose && acc) actions.chooseSeasonPath(acc.id, acc.season, "pilgrim");
  }, [choose, acc]);
  // One path a season: whoever chose the administrators' way this season does not register on the Hajj in it
  if (hydrated && acc?.path === "admin") return <AdminThisSeason season={acc.season} canChange={acc.canChange} />;
  return <ApplyFlow />;
}

function AdminThisSeason({ season, canChange }: { season: number; canChange: boolean }) {
  return (
    <PilgrimShell title="تقديم طلب حج" subtitle={`موسم ${season}هـ`}>
      <div className="rounded-[2rem] border-2 border-dashed border-gold/50 bg-white p-8 text-center md:p-12">
        <span className="mx-auto grid size-16 place-items-center rounded-2xl bg-maroon/10 text-maroon">
          <Briefcase className="size-8" />
        </span>
        <p className="mt-4 font-display text-2xl font-bold text-green-dark">أنت في المسار الإداري لموسم {season}</p>
        <p className="mx-auto mt-2 max-w-xl leading-8 text-ink-soft">
          تختار في كل موسم مساراً واحداً: الحج أو صفة إدارية. التسجيل على الحج يكون في موسم آخر تختاره له، ويبقى ملفك الإداري وسجلّك كما هما.
          {canChange && " ولم تبدأ شيئاً في المسار الإداري بعد، فتستطيع تغيير اختيارك من «ملفي»."}
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <Link href="/portal" className="inline-flex rounded-2xl bg-green-dark px-5 py-2.5 font-bold text-white hover:bg-green">
            منصة الإداريين
          </Link>
          <Link href="/portal" className="inline-flex rounded-2xl border-2 border-green-dark/20 px-5 py-2.5 font-bold text-green-dark hover:bg-green-dark/5">
            ملفي
          </Link>
        </div>
      </div>
    </PilgrimShell>
  );
}
