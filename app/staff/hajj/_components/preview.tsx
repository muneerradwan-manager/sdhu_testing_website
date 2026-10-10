"use client";

import Link from "next/link";
import { ArrowRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { DEMO_SCENARIOS } from "@/lib/registry";
import { ApplyFlow } from "@/app/portal/apply/_components/flow";
import { selectClass } from "../../exam/_components/ui";
import { useRegEditor } from "./editor";

/**
 * The registration exactly as a pilgrim goes through it, with the changes not published yet: the same screens
 * on a demo pilgrim, nothing saved, sent or paid.
 */
export function PreviewPage() {
  const ed = useRegEditor();
  const [person, setPerson] = useState(DEMO_SCENARIOS[0].id);
  const [round, setRound] = useState(0);
  return (
    <div className="space-y-4">
      <div>
        <Link href="/staff/hajj/manage" className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          <ArrowRight className="size-4" /> صفحات التسجيل
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">معاينة: هكذا يرى الحاج التسجيل</h1>
        <p className="mt-1 text-sm text-white/65">بتعديلاتك التي لم تُنشر بعد. لا يُحفظ هنا شيء ولا يُدفع شيء.</p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm font-bold text-white">
          جرّب بحاج
          <select value={person} onChange={(e) => { setPerson(e.target.value); setRound((n) => n + 1); }} className={`${selectClass} h-10 w-72`}>
            {DEMO_SCENARIOS.map((d) => (
              <option key={d.id} value={d.id}>
                {d.title}
              </option>
            ))}
          </select>
        </label>
        <Button size="sm" variant="glass" onClick={() => setRound((n) => n + 1)}>
          <RotateCcw className="size-4" /> من البداية
        </Button>
      </div>
      <ApplyFlow key={`${person}-${round}-${ed.season}`} preview={{ config: ed.config, personId: person }} />
    </div>
  );
}
