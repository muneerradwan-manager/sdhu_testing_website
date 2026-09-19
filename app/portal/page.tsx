"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  BookOpen,
  CalendarClock,
  Clock3,
  FileSearch,
  HeartHandshake,
  LogOut,
  MapPin,
  NotebookTabs,
  Phone,
  RotateCcw,
  ShieldCheck,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Card, PortalShell } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge, useToast } from "@/components/ui/widgets";
import { directAccepted, stageAt, trackOf, trackSteps } from "@/lib/journey";
import { SEASON } from "@/lib/season";
import { ageOf, fullName, getPerson } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";

function history(id: string) {
  if (id === "01012345412") return [
    { season: "1446", status: "تقدّم ولم يُقبل", tone: "maroon" as const },
    { season: "1447", status: "لم يتقدم", tone: "ink" as const },
  ];
  return [
    { season: "1446", status: "لم يتقدم", tone: "ink" as const },
    { season: "1447", status: "لم يتقدم", tone: "ink" as const },
  ];
}

export default function PortalHome() {
  const router = useRouter();
  const toast = useToast();
  const sessionId = useStore((s) => s.sessionId)!;
  const account = useStore((s) => s.accounts[s.sessionId ?? ""]);
  const app = useStore((s) => s.applications[s.sessionId ?? ""]);
  const person = getPerson(sessionId)!;
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const elapsed = app ? (now - app.submittedAt) / 1000 : 0;
  const steps = app ? trackSteps(trackOf(app), directAccepted(app)) : [];
  const stage = app ? stageAt(steps, elapsed).stage : null;

  return (
    <PortalShell
      wide
      image="/images/umayyad-courtyard.jpg"
      title={
        <span className="flex flex-wrap items-center gap-3">
          السلام عليكم، {person.firstName}
          <motion.span animate={{ rotate: [0, 18, -8, 14, 0] }} transition={{ delay: 0.6, duration: 1.2 }} className="inline-block origin-bottom-right">
            👋
          </motion.span>
        </span>
      }
      subtitle="هذا ملفك الدائم في منصة الحج الوطنية. يبقى معك عبر المواسم."
    >
      <div className="grid gap-6 lg:grid-cols-[1.1fr_1.6fr]">
        {/* Profile */}
        <Card className="md:p-8">
          <div className="flex items-center gap-4">
            <span className="grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-gold to-gold-dark font-display text-4xl font-bold text-ink shadow-lg">
              {person.firstName[0]}
            </span>
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">{fullName(person)}</p>
              <p className="font-mono text-sm text-hint" dir="ltr">{maskNationalId(person.id)}</p>
              <Badge className="mt-2">
                <BadgeCheck className="size-3.5" /> مؤكدة من الشؤون المدنية
              </Badge>
            </div>
          </div>
          <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
            {[
              ["المحافظة", person.governorate],
              ["مكان القيد", person.registry],
              ["تاريخ الميلاد", `${person.birthDate.slice(0, 4)} (${ageOf(person)} عاماً)`],
              ["الحالة المدنية", person.maritalStatus],
              ["الهاتف", account?.phone ? `${account.phone.slice(0, 4)} ••• ${account.phone.slice(-3)}` : "—"],
              ["جهة الطوارئ", account?.emergencyName || "لم تُضف بعد"],
            ].map(([k, v]) => (
              <div key={k} className="rounded-2xl bg-sand p-3">
                <dt className="text-xs text-hint">{k}</dt>
                <dd className="mt-0.5 font-bold" dir={k === "الهاتف" ? "ltr" : undefined}>{v}</dd>
              </div>
            ))}
          </dl>

          <h3 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <CalendarClock className="size-5 text-gold-dark" /> سجل مواسم الحج
          </h3>
          <ol className="relative mt-4 space-y-3 border-r-2 border-gold-light pr-5">
            {[...history(person.id), { season: "1448", status: app ? `طلب رقم ${app.number} — ${stage?.title}` : "لم يتقدم بعد", tone: app ? ("green" as const) : ("gold" as const) }].map((h) => (
              <li key={h.season} className="relative">
                <span className={cn("absolute -right-[27px] top-1.5 size-3 rounded-full ring-4 ring-white", h.season === "1448" ? "bg-green-light" : "bg-gold")} />
                <span className="font-bold">موسم {h.season}</span>
                <Badge tone={h.tone} className="mr-2">{h.status}</Badge>
              </li>
            ))}
          </ol>

          <div className="mt-8 flex flex-wrap gap-2 border-t border-gold-light pt-6">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                actions.logout();
                router.push("/");
              }}
            >
              <LogOut className="size-4" /> تسجيل الخروج
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="text-maroon"
              onClick={() => {
                actions.resetDemo();
                toast({ title: "أُعيد ضبط النسخة التجريبية", body: "حُذفت جميع الحسابات والطلبات من هذا المتصفح.", icon: "🧹" });
                router.push("/");
              }}
            >
              <RotateCcw className="size-4" /> إعادة ضبط التجربة
            </Button>
          </div>
        </Card>

        <div className="space-y-6">
          {/* Application CTA / status */}
          {app ? (
            <Link href="/portal/application" className="group relative block overflow-hidden rounded-[2rem] bg-green-dark p-7 text-white shadow-2xl md:p-9">
              <div className="bg-pattern absolute inset-0 opacity-20" />
              <div className="relative flex flex-wrap items-center justify-between gap-6">
                <div>
                  <p className="text-sm text-gold">
                    طلبي رقم {app.number} — {app.members.length} أفراد — {trackOf(app) === "lottery" ? "التسجيل على القرعة" : "التسجيل على القبول المباشر"}
                  </p>
                  <p className="mt-2 font-display text-3xl font-bold md:text-4xl">{stage?.title}</p>
                  <p className="mt-2 text-white/75">{stage?.text}</p>
                </div>
                <span className="flex items-center gap-2 rounded-2xl bg-gold px-6 py-4 font-bold text-ink transition group-hover:gap-4">
                  متابعة الطلب <ArrowLeft className="size-5" />
                </span>
              </div>
              <div className="relative mt-7 flex gap-1.5">
                {steps.map((t) => (
                  <span key={t.key} className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                    <motion.span className="block h-full bg-gold" initial={{ width: 0 }} animate={{ width: elapsed >= t.at ? "100%" : "0%" }} transition={{ duration: 0.6 }} />
                  </span>
                ))}
              </div>
            </Link>
          ) : (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-maroon-dark p-7 text-white shadow-2xl md:p-10">
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <div className="absolute -left-20 -top-20 size-64 rounded-full bg-gold/20 blur-3xl" />
              <div className="relative">
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">
                  <span className="relative flex size-2"><span className="absolute inset-0 animate-ping rounded-full bg-green-light" /><span className="relative size-2 rounded-full bg-green-light" /></span>
                  التسجيل على القبول المباشر: {SEASON.windows.direct.hijri}
                </span>
                <p className="mt-4 font-display text-3xl font-bold leading-[1.4] md:text-4xl">تقديم طلب حج لموسم 1448هـ</p>
                <p className="mt-3 max-w-xl leading-8 text-white/75">
                  لك وحدك أو مع عائلتك. التسجيل على القبول المباشر (الأكبر سناً) يُفتح أولاً، ثم يُفتح التسجيل على القرعة بطلب مستقل
                  ({SEASON.windows.lottery.hijri}). سنسألك أسئلة بسيطة واحداً تلو الآخر، ونجلب بيانات مرافقيك من الشؤون المدنية.
                </p>
                <ButtonLink href="/portal/apply" variant="gold" size="xl" className="mt-7">
                  ابدأ الطلب الآن <ArrowLeft className="size-6" />
                </ButtonLink>
              </div>
            </motion.div>
          )}

          {/* Quick tiles */}
          <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
            {[
              { href: "/academy", icon: BookOpen, label: "الأكاديمية", sub: "تتبع تقدمك" },
              { href: "/guide", icon: NotebookTabs, label: "دليل المناسك", sub: "يوماً بيوم" },
              { href: "/prayer-times", icon: Clock3, label: "مواقيت الصلاة", sub: "مدينتك" },
              { href: "/results", icon: FileSearch, label: "نتائج القبول", sub: "القوائم العامة" },
              { href: "/verify", icon: ShieldCheck, label: "التحقق", sub: "الجهات والإيصالات" },
              { href: "/conditions", icon: HeartHandshake, label: "الأسئلة الشائعة", sub: "أجوبة معتمدة" },
            ].map((t, i) => (
              <motion.div key={t.href} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.05 }}>
                <Link href={t.href} className="group flex h-full flex-col rounded-3xl border border-gold/30 bg-white p-5 transition hover:-translate-y-1 hover:shadow-lg">
                  <t.icon className="size-7 text-green-dark transition group-hover:scale-110 group-hover:text-gold-dark" />
                  <span className="mt-3 font-bold">{t.label}</span>
                  <span className="text-xs text-hint">{t.sub}</span>
                </Link>
              </motion.div>
            ))}
          </div>

          {/* Notifications */}
          <Card className="md:p-7">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <BellRing className="size-5 text-gold-dark" /> الإشعارات
            </h3>
            <ul className="mt-4 divide-y divide-gold-light">
              {[
                app && { t: `تم استلام طلبك رقم ${app.number} لـ ${app.members.length} أفراد، وتم تسديد رسم التسجيل (الإيصال ${app.receipt}).`, when: "طلبك" },
                { t: `أهلاً ${person.firstName}، تم إنشاء حسابك في منصة الحج الوطنية. التسجيل لموسم 1448هـ مفتوح حتى 1 رجب.`, when: "ترحيب" },
                { t: "إعلان رسمي: القرعة الإلكترونية يوم 1 شعبان الساعة 20:00 ببث مباشر.", when: "الإدارة" },
              ]
                .filter(Boolean)
                .map((n) => n as { t: string; when: string })
                .map((n, i) => (
                  <li key={i} className="flex gap-3 py-3">
                    <span className="mt-1.5 size-2 shrink-0 rounded-full bg-green-light" />
                    <div>
                      <p className="leading-7">{n.t}</p>
                      <p className="text-xs text-hint">{n.when}</p>
                    </div>
                  </li>
                ))}
            </ul>
          </Card>

          <div className="flex flex-wrap items-center gap-4 rounded-3xl border border-gold/30 bg-white p-5 text-sm text-ink-soft">
            <MapPin className="size-5 text-gold-dark" /> مكتبك: {person.governorate} — {person.registry.split(" ")[0]}
            <span className="mx-2 h-4 w-px bg-gold-light" />
            <Phone className="size-5 text-gold-dark" /> <span dir="ltr">+963 11 000 1448</span>
          </div>
        </div>
      </div>
    </PortalShell>
  );
}
