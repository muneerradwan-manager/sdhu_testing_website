"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BellRing, Send } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { Badge, useToast } from "@/components/ui/widgets";
import { actions, getState, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, useAdmin } from "@/app/administrator/_lib/admin";
import { contactOf } from "@/app/administrator/_lib/cadre";
import { useAdminNotes } from "@/app/administrator/_lib/notifications";
import { AdminShell, SectionTitle, SimButton } from "@/app/administrator/_components/ui";

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
            <motion.li key={`${i}-${n.t}`} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="flex flex-wrap items-start gap-3 py-4">
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
      <TelegramCard />
    </AdminShell>
  );
}

/**
 * The platform's Telegram bot: he starts it with his code and his account is linked — the administration's
 * messages then reach his phone. He signs in with his national ID and password only.
 */
function TelegramCard() {
  const admin = useAdmin()!;
  const toast = useToast();
  const cadre = useStore((s) => s.cadre);
  const c = contactOf(admin.id, cadre);
  const code = `${c.pin ?? "0000"}-${admin.id.slice(-4)}`;
  const stored = () => getState().cadre.contact[admin.id] ?? {};
  const link = () => {
    actions.setCadre("contact", admin.id, { ...stored(), chatId: String(5_100_000_000 + Number(admin.id.slice(-6))) });
    logAdmin(admin.id, "ربط حسابه ببوت تيليجرام");
    toast({ title: "رُبط تيليجرام", body: "تصلك رسائل الإدارة على هاتفك.", tone: "success", icon: "✈️" });
  };
  const unlink = () => {
    actions.setCadre("contact", admin.id, { ...stored(), chatId: "" });
    logAdmin(admin.id, "فك ربط تيليجرام");
  };
  return (
    <Card className="mt-6 md:p-8">
      <SectionTitle icon={Send} action={c.chatId ? <Badge tone="green">مربوط</Badge> : <Badge tone="gold">غير مربوط</Badge>}>
        تيليجرام
      </SectionTitle>
      <div className="mt-4 max-w-2xl">
        <div className="rounded-2xl bg-sand p-4">
          {c.chatId ? (
            <>
              <p className="leading-8 text-ink">حسابك مربوط ببوت المنصة: تصلك عليه رسائل الإدارة.</p>
              <p className="text-xs text-hint" dir="ltr">
                chat_id {c.chatId}
              </p>
              <button type="button" onClick={unlink} className="mt-2 text-sm font-bold text-maroon underline">
                فك الربط
              </button>
            </>
          ) : (
            <>
              <p className="leading-8 text-ink">افتح بوت منصة الكوادر في تيليجرام، واضغط «ابدأ»، ثم أرسل إليه رمز الربط:</p>
              <p className="my-2 rounded-xl bg-white px-4 py-2 text-center font-display text-xl font-bold tracking-widest text-green-dark" dir="ltr">
                /start {code}
              </p>
              <SimButton onClick={link}>محاكاة: أرسلتُ الرمز إلى البوت</SimButton>
            </>
          )}
        </div>
      </div>
      <p className="mt-3 text-[11px] text-hint">نسخة تجريبية: لا يُرسل شيء إلى تيليجرام حقاً، ويظهر ما يصلك في الإشعارات أعلاه.</p>
    </Card>
  );
}
