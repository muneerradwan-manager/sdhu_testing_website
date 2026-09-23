"use client";

import Link from "next/link";
import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  BellRing,
  CalendarClock,
  Check,
  CircleDot,
  FolderLock,
  History,
  Lock,
  PartyPopper,
  ScrollText,
} from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { ageOf } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { SKILLS, docState, effectiveRole, journeyOf, positionLabelOf, recordOf, resultOf, seasonHistory, useAdmin } from "../../_lib/admin";
import { clusterGroupsOf } from "../../_lib/cluster";
import { AdminShell } from "../../_components/ui";

const NEXT: Record<string, { title: string; text: string; cta: string }> = {
  apply: { title: "سجّل لموسم 1448", text: "التسجيل يتجدد كل موسم: اختر صفة واحدة (صفتك السابقة أو صفة جديدة)، وارفع وثائقك، ووافق على الالتزامات، وسدّد رسم 30 $.", cta: "ابدأ الطلب" },
  eligibility: { title: "التحقق من أهليتك", text: "طلبك مكتمل والرسم مسدد. شاهد تطبيق شروط الموسم على ملفك.", cta: "عرض الأهلية" },
  written: { title: "الامتحان الكتابي جاهز", text: "15 سؤالاً — 20 دقيقة — تُحفظ الإجابات تلقائياً، ولا رجوع بعد الإرسال.", cta: "الدخول إلى الامتحان" },
  oral: { title: "بانتظار نتيجة الامتحان الشفهي", text: "تُدخل لجنة الامتحانات (ماهر عيسى) النتيجة على المنصة بعد مقابلتك.", cta: "متابعة النتيجة" },
  result: { title: "نتيجتك النهائية", text: "الكتابي 60% + الشفهي 40% — الحد الأدنى للنجاح 70.", cta: "عرض النتيجة" },
  group: { title: "شكّل مجموعتك", text: "طلب تشكيل المجموعة واختيار الفريق ورسم 200 $ — حتى 25 جمادى الأولى. التكتل مرحلة لاحقة بعد انتخاب رؤساء التكتلات.", cta: "طلب تشكيل مجموعة" },
  approval: { title: "طلب المجموعة قيد الاعتماد", text: "يراجعه ماهر عيسى ثم يعتمده مدير المكتب مازن الحلبي.", cta: "متابعة الطلب" },
  contracts: { title: "ميثاق الفريق جاهز للتوقيع", text: "ميثاق فريق المجموعة — توقيع إلكتروني. عقد التكتل يأتي بعد الانضمام إليه.", cta: "توقيع الميثاق" },
  election: { title: "انتخاب رؤساء التكتلات", text: "أعلنت الإدارة عدد التكتلات وشروط الترشح. رشّح نفسك إن استوفيت الشروط، وصوّت لمرشح واحد.", cta: "التكتلات" },
  cluster: { title: "اختر تكتلاً لمجموعتك", text: "أُعلن رؤساء التكتلات. اطلب الانضمام إلى تكتل، ويقرر رئيسه بحسب سعته، ثم توقّعان العقد.", cta: "التكتلات" },
  requests: { title: "عائلات فُوّجت إلى مجموعتك", text: "رحّب بالعائلات الجديدة، وتابع تسجيل ملفاتها الصحية مع المنسق التقني.", cta: "حجاج المجموعة" },
  field: { title: "الميدان: افتح أول تجمّع", text: "«ساحة المزة ← المطار» — مسح البطاقات وإرسال «انطلقنا» للجميع.", cta: "وضع الميدان" },
};

export function AdminDashboard() {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const events = useStore((s) => s.events);
  const joinCount = Object.keys(profile?.joinDecisions ?? {}).length;
  const steps = useMemo(() => journeyOf(profile, joinCount), [profile, joinCount]);
  const current = steps.find((s) => s.state === "current");
  const done = steps.filter((s) => s.state === "done").length;
  const result = resultOf(profile);
  const failed = !!result.published && result.final !== undefined && !result.passed;
  const mine = useMemo(() => events.filter((e) => e.actor === admin.name).slice(-7).reverse(), [events, admin.name]);
  const history = seasonHistory(admin.id);
  const record = recordOf(profile, admin.id);
  const next = current ? NEXT[current.key] : null;
  const clusterName = profile?.cluster?.name ?? (profile?.group?.clusterId ? "تكتل النور" : undefined);
  const clusterGroups = clusterGroupsOf(profile, admin.name).length;
  const status1448 = profile?.deputyOf
    ? `معاون رئيس ${profile.deputyOf.clusterName} — يتابع ${clusterGroups} مجموعات، منها مجموعته ${profile.group?.number}`
    : profile?.cluster
    ? `رئيس ${profile.cluster.name} — يدير ${clusterGroups} مجموعات، منها مجموعته ${profile.group?.number}`
    : profile?.group?.approvedAt
    ? `رئيس مجموعة — المجموعة ${profile.group.number}${clusterName ? ` — ${clusterName}` : " — دون تكتل بعد"}`
    : result.exempt
      ? `مجدَّد في الصفة نفسها — دون امتحان`
      : result.passed
        ? `ناجح في التأهيل (${result.final})`
      : profile?.feePaidAt
        ? "متقدم — قيد التأهيل"
        : "لم يتقدم بعد";

  const notes = [
    profile?.deputyOf && { t: `اختارك رئيس ${profile.deputyOf.clusterName} ${profile.deputyOf.headName} معاوناً له، فصارت صفتك لهذا الموسم معاون رئيس تكتل: ترى مجموعات التكتل كلها ومعلوماته، وتنوب عن الرئيس في متابعتها.`, who: "شؤون الإداريين" },
    profile?.cluster && { t: `انتخبك رؤساء المجموعات رئيساً لتكتل، فبقيتَ رئيس المجموعة ${profile.group?.number} وارتفعت مهامك إلى مستوى التكتل: تدير الآن ${clusterGroups} مجموعات في ${profile.cluster.name}، لكل واحدة رئيسها وفريقها. معاونك ${profile.cluster.deputyName ?? "—"}.`, who: "شؤون الإداريين" },
    !profile?.cluster && profile?.group?.clusterId && { t: `قبِل رئيس تكتل النور عبد الرحمن العلي انضمام المجموعة ${profile.group.number}، ووُقّع العقد وصودق عليه.`, who: "شؤون التكتلات" },
    profile?.group?.approvedAt && { t: `اعتُمدت المجموعة ${profile.group.number} لموسم 1448. ميثاق الفريق جاهز للتوقيع في خزنة الوثائق. التكتل يُحدَّد بعد انتخاب رؤساء التكتلات.`, who: "مدير المكتب" },
    result.exempt && { t: "جُدّدت صفتك لموسم 1448 دون امتحان، لأنك شغلتها الموسم الماضي بتقييم مستوفٍ. رسم الموسم مسدد.", who: "شؤون الإداريين" },
    result.published && result.passed && !result.exempt && { t: `تهانينا، اجتزت التأهيل بنتيجة ${result.final} وصرت مؤهلاً لصفة رئيس مجموعة. يمكنك تقديم طلب تشكيل مجموعة حتى 25 جمادى الأولى.`, who: "شؤون الإداريين" },
    profile?.eligibleAt && { t: "أنت مؤهل للامتحان الكتابي. الموعد: 15 ربيع الآخر، الساعة 09:00، على المنصة.", who: "شؤون الإداريين" },
    profile?.receipt && { t: `تم استلام طلب مشاركتك في موسم 1448 ورسم التسجيل (الإيصال ${profile.receipt}). سيتم التحقق من الأهلية حتى 10 ربيع الآخر.`, who: "المنصة" },
    { t: "باب طلبات المشاركة لموسم 1448 مفتوح من 10 ربيع الأول حتى 1 ربيع الآخر.", who: "الإدارة" },
  ].filter(Boolean) as { t: string; who: string }[];

  return (
    <AdminShell
      title={
        <span className="flex flex-wrap items-center gap-3">
          ملفي كإداري
          <Badge tone="gold" className="text-sm">موسم 1448</Badge>
        </span>
      }
      subtitle={`السلام عليكم ${admin.person.firstName}. ملفك الإداري دائم: التأهيل والمناصب والتقييمات والعقود في مكان واحد.`}
    >
      <div className="grid gap-6 lg:grid-cols-[1fr_1.55fr]">
        <div className="space-y-6">
          <Card className="md:p-8">
            <div className="flex items-center gap-4">
              <span className="relative grid size-20 place-items-center rounded-3xl bg-gradient-to-br from-maroon to-maroon-dark font-display text-4xl font-bold text-gold shadow-lg">
                {admin.person.firstName[0]}
                <span className="absolute -bottom-1 -left-1 grid size-7 place-items-center rounded-full bg-green-light text-white ring-4 ring-white">
                  <Check className="size-4" />
                </span>
              </span>
              <div>
                <p className="font-display text-2xl font-bold text-green-dark">{admin.name}</p>
                <p className="font-mono text-sm text-hint" dir="ltr">{maskNationalId(admin.id)}</p>
                <Badge className="mt-2">
                  <BadgeCheck className="size-3.5" /> حساب إداري — مؤكد من الشؤون المدنية
                </Badge>
              </div>
            </div>
            <dl className="mt-6 grid grid-cols-2 gap-3 text-sm">
              {[
                ["العمر", `${ageOf(admin.person)} عاماً`],
                ["المحافظة", admin.person.governorate],
                ["الهاتف", profile?.phone ? `${profile.phone.slice(0, 4)} ••• ${profile.phone.slice(-3)}` : "—"],
                ["الصفة لموسم 1448", profile?.positions.length ? `${positionLabelOf(effectiveRole(profile))}${profile.cluster || profile.deputyOf ? " (بالانتخاب)" : profile.renewal === "keep" ? " (تجديد)" : ""}` : "لم تُحدَّد — التسجيل يتجدد كل موسم"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-sand p-3">
                  <dt className="text-xs text-hint">{k}</dt>
                  <dd className="mt-0.5 font-bold" dir={k === "الهاتف" ? "ltr" : undefined}>{v}</dd>
                </div>
              ))}
            </dl>

            <h3 className="mt-8 flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <History className="size-5 text-gold-dark" /> السجل الموسمي
            </h3>
            <ol className="relative mt-4 space-y-4 border-r-2 border-gold-light pr-5">
              {[...history, { season: "1448", role: status1448, group: "", rating: null }].map((h) => (
                <li key={h.season} className="relative">
                  <span className={cn("absolute -right-[27px] top-1.5 size-3 rounded-full ring-4 ring-white", h.season === "1448" ? "bg-maroon" : h.rating ? "bg-green-light" : "bg-gold")} />
                  <p className="font-bold">موسم {h.season}</p>
                  <p className="text-sm text-ink-soft">
                    {h.role}
                    {h.group && ` — ${h.group}`}
                  </p>
                  {h.rating && (
                    <span className="mt-1 inline-flex items-center gap-1 rounded-full bg-gold/30 px-2 py-0.5 text-xs font-bold text-maroon">★ تقييم الموسم {h.rating} من 5</span>
                  )}
                </li>
              ))}
            </ol>
          </Card>

          <Card className="md:p-7">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <FolderLock className="size-5 text-gold-dark" /> ملفي الدائم
            </h3>
            <p className="mt-1 text-sm leading-6 text-ink-soft">حسابك دائم: وثائقك ولغاتك ومهاراتك تبقى بين المواسم، ويبدأ منها طلب كل موسم جديد.</p>
            <ul className="mt-4 space-y-2 text-sm">
              {record.documents.length === 0 && <li className="rounded-xl bg-sand px-3 py-2.5 text-hint">لا وثائق بعد — ترفعها في طلب المشاركة وتبقى في ملفك.</li>}
              {record.documents.map((d) => {
                const st = docState(d);
                return (
                  <li key={d.id} className="flex items-center justify-between gap-2 rounded-xl border border-gold/30 px-3 py-2.5">
                    <span className="min-w-0">
                      <span className="block truncate font-semibold">{d.label}</span>
                      <span className="block text-xs text-hint">نسخة موسم {d.issuedSeason}</span>
                    </span>
                    <Badge tone={st.ok ? "green" : "maroon"}>{st.ok ? "سارية" : "منتهية"}</Badge>
                  </li>
                );
              })}
            </ul>
            <dl className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                ["اللغات", record.languages.join("، ") || "—"],
                ["المهارات", record.skills.map((k) => SKILLS.find((s) => s.key === k)?.label ?? k).join("، ") || "—"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-2xl bg-sand p-3">
                  <dt className="text-xs text-hint">{k}</dt>
                  <dd className="mt-0.5 text-sm font-semibold leading-6">{v}</dd>
                </div>
              ))}
            </dl>
            <ButtonLink href="/administrator/apply" size="sm" variant="outline" className="mt-4">
              إدارة ملفي من طلب الموسم <ArrowLeft className="size-4" />
            </ButtonLink>
          </Card>

          <Card className="md:p-7">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <BellRing className="size-5 text-gold-dark" /> الإشعارات
            </h3>
            <ul className="mt-3 divide-y divide-gold-light">
              {notes.map((n, i) => (
                <motion.li key={n.t} initial={{ opacity: 0, x: 12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.06 }} className="flex gap-3 py-3">
                  <span className={cn("mt-2 size-2 shrink-0 rounded-full", i === 0 ? "bg-maroon" : "bg-green-light")} />
                  <div>
                    <p className="text-sm leading-7">{n.t}</p>
                    <p className="text-xs text-hint">{n.who}</p>
                  </div>
                </motion.li>
              ))}
            </ul>
          </Card>
        </div>

        <div className="space-y-6">
          {/* Next action */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-9", failed ? "bg-ink" : "bg-gradient-to-br from-maroon-dark via-maroon to-green-dark")}>
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <motion.div aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">
                <CircleDot className="size-4" /> الخطوة التالية {current && `— ${current.date}`}
              </span>
              {failed ? (
                <>
                  <p className="mt-4 font-display text-3xl font-bold">لم تجتز التأهيل هذا الموسم</p>
                  <p className="mt-2 leading-8 text-white/75">النتيجة النهائية {result.final} من 100، والحد الأدنى 70. يبقى ملفك وسجلك مرجعاً في أي تأهيل لاحق.</p>
                  <ButtonLink href="/administrator/exam" variant="gold" size="lg" className="mt-6">عرض التفاصيل <ArrowLeft className="size-5" /></ButtonLink>
                </>
              ) : next && current ? (
                <>
                  <p className="mt-4 font-display text-3xl font-bold leading-[1.4] md:text-4xl">{next.title}</p>
                  <p className="mt-2 max-w-xl leading-8 text-white/75">{next.text}</p>
                  <ButtonLink href={current.href} variant="gold" size="xl" className="mt-6">
                    {next.cta} <ArrowLeft className="size-6" />
                  </ButtonLink>
                </>
              ) : (
                <>
                  <p className="mt-4 flex items-center gap-3 font-display text-3xl font-bold">
                    <PartyPopper className="size-9 text-gold" /> أتممت كل محطات الرحلة
                  </p>
                  <p className="mt-2 leading-8 text-white/75">تابع مجموعتك في الميدان، وتقييماتك تتجمّع من الموظفين والحجاج.</p>
                  <ButtonLink href="/administrator/field" variant="gold" size="lg" className="mt-6">وضع الميدان <ArrowLeft className="size-5" /></ButtonLink>
                </>
              )}
            </div>
            <div className="relative mt-8">
              <div className="flex items-center justify-between text-xs text-white/70">
                <span>تقدّم الرحلة</span>
                <span className="font-bold text-gold">{done} من {steps.length}</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/15">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-gold to-gold-dark" initial={{ width: 0 }} animate={{ width: `${(done / steps.length) * 100}%` }} transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }} />
              </div>
            </div>
          </motion.div>

          {/* Journey stepper */}
          <Card className="md:p-8">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
              <CalendarClock className="size-6 text-gold-dark" /> رحلتي — من الامتحان إلى الميدان
            </h3>
            <ol className="mt-6">
              {steps.map((s, i) => (
                <motion.li key={s.key} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.04 * i }} className="relative flex gap-4 pb-5 last:pb-0">
                  {i < steps.length - 1 && <span className={cn("absolute right-[19px] top-10 h-[calc(100%-2.5rem)] w-0.5", s.state === "done" ? "bg-green-light" : "bg-gold-light")} />}
                  <span
                    className={cn(
                      "relative grid size-10 shrink-0 place-items-center rounded-full text-sm font-bold",
                      s.state === "done" && "bg-green-light text-white",
                      s.state === "current" && "bg-maroon text-gold ring-4 ring-maroon/15",
                      s.state === "locked" && "bg-sand text-hint",
                    )}
                  >
                    {s.state === "current" && <span className="absolute inset-0 animate-ping rounded-full bg-maroon/30" />}
                    {s.state === "done" ? <Check className="size-5" /> : s.state === "locked" ? <Lock className="size-4" /> : i + 1}
                  </span>
                  <Link href={s.href} className={cn("group -mt-0.5 flex min-w-0 flex-1 flex-wrap items-start justify-between gap-x-3 rounded-2xl p-2 transition hover:bg-sand", s.state === "current" && "bg-maroon/5")}>
                    <span className="min-w-0">
                      <span className={cn("block font-bold", s.state === "locked" ? "text-hint" : "text-ink")}>{s.title}</span>
                      <span className="block text-sm text-ink-soft">{s.detail}</span>
                    </span>
                    <span className="shrink-0 text-xs font-semibold text-gold-dark">{s.date}</span>
                  </Link>
                </motion.li>
              ))}
            </ol>
          </Card>

          <Card className="md:p-7">
            <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
              <ScrollText className="size-5 text-gold-dark" /> سجل نشاطي
            </h3>
            <p className="text-xs text-hint">كل خطوة تُسجَّل باسمك في سجل الأحداث — للإضافة فقط، لا يُعدَّل ولا يُحذف.</p>
            {mine.length === 0 ? (
              <p className="mt-4 rounded-2xl bg-sand p-4 text-sm text-ink-soft">لا أحداث بعد.</p>
            ) : (
              <ul className="mt-4 space-y-2">
                {mine.map((e) => (
                  <li key={e.id} className="flex items-start justify-between gap-3 rounded-2xl bg-sand px-4 py-3 text-sm">
                    <span>
                      <span className="font-bold text-ink">{e.action}</span>
                      {e.detail && <span className="block text-xs leading-5 text-ink-soft">{e.detail}</span>}
                    </span>
                    <time className="shrink-0 font-mono text-xs text-hint" dir="ltr">
                      {new Date(e.at).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>
    </AdminShell>
  );
}
