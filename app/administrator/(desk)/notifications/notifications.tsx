"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BellRing } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { Badge } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";
import { useAdminNotes } from "../../_lib/notifications";
import { AdminShell, SectionTitle } from "../../_components/ui";

/** «الإشعارات»: a tab of its own — what reached him, the invitations awaiting his answer first */
export function AdminNotifications() {
  const notes = useAdminNotes();
  const urgent = notes.filter((n) => n.urgent).length;
  return (
    <AdminShell title="الإشعارات" subtitle="ما وصلك من الإدارة ومن رؤساء التكتلات هذا الموسم. الدعوات التي تنتظر ردك أولاً.">
      <Card className="md:p-8">
        <SectionTitle icon={BellRing} action={urgent ? <Badge tone="maroon">{urgent} تنتظر ردك</Badge> : undefined}>
          إشعاراتي
        </SectionTitle>
        <ul className="mt-4 divide-y divide-gold-light">
          {notes.map((n, i) => (
            <motion.li key={n.t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-wrap items-start gap-3 py-4">
              <span className={cn("mt-2 size-2.5 shrink-0 rounded-full", n.urgent ? "bg-maroon" : "bg-green-light")} />
              <div className="min-w-0 flex-1">
                <p className="leading-8">{n.t}</p>
                <p className="text-xs text-hint">{n.who}</p>
              </div>
              {n.href && (
                <Link href={n.href} className="inline-flex shrink-0 items-center gap-1 rounded-xl px-3 py-1.5 text-sm font-bold text-green-dark hover:bg-sand">
                  فتح <ArrowLeft className="size-4" />
                </Link>
              )}
            </motion.li>
          ))}
        </ul>
      </Card>
    </AdminShell>
  );
}
