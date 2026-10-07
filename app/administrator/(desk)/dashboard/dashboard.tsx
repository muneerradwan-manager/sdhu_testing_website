"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
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
  LogOut,
  PartyPopper,
  ScrollText,
} from "lucide-react";
import { useMemo } from "react";
import { Card } from "@/components/portal/shell";
import { Button, ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { questionCount, weightsLabel, type ExamNumbers } from "@/lib/data/admin-exam";
import { ageOf } from "@/lib/registry";
import { actions, useStore } from "@/lib/store";
import { cn, maskNationalId } from "@/lib/utils";
import { SKILLS, docState, effectiveRole, journeyOf, logAdmin, positionLabelOf, recordOf, resultOf, seasonHistory, useAdmin } from "../../_lib/admin";
import { useExamRules } from "../../_lib/admin-rules";
import { useMyHall } from "../../_lib/halls";
import { clusterGroupsOf } from "../../_lib/cluster";
import { groupsLabel, useCoordinatorPost } from "../../_lib/coordinators";
import { AdminShell, useAdminNav } from "../../_components/ui";
import { rangeLabel, statusLabel, useOperation } from "@/lib/operations";

type Written = { date: string; time: string; questions: number; minutes: number; center?: string };

/** The next step's card; the exam's numbers are the season's, as the administration left them */
const nextSteps = (rules: ExamNumbers, w: Written): Record<string, { title: string; text: string; cta: string }> => ({
  apply: { title: "سجّل لموسم 1448", text: "التسجيل يتجدد كل موسم: حدّث وثائقك ومهاراتك، واختر صفة واحدة يستوفي ملفك شروطها، ووافق على الالتزامات. تتحقق المنصة من أهليتك قبل أن تدفع.", cta: "ابدأ الطلب" },
  fee: { title: "أنت مؤهل — بقي رسم التسجيل", text: "استوفى ملفك شروط الصفة التي اخترتها. سدّد رسم 30 $ ليُقدَّم طلبك.", cta: "تسديد الرسم" },
  written: { title: "امتحانك الكتابي في القاعة", text: `${w.center ?? "قاعة مركزك الامتحاني"} — ${w.date} الساعة ${w.time}: امتحان جماعي لصفتك، ${w.questions} سؤالاً في ${w.minutes} دقيقة. احضر بهويتك، وافتح حسابك في القاعة بعد أن يفتحها المشرف.`, cta: "قاعتي وموعدي" },
  oral: { title: "بانتظار نتيجة الامتحان الشفهي", text: "تُدخل لجنة الامتحانات (ماهر عيسى) النتيجة على المنصة بعد مقابلتك.", cta: "متابعة النتيجة" },
  result: { title: "نتيجتك النهائية", text: `${weightsLabel(rules)} — الحد الأدنى للنجاح ${rules.passMark}.`, cta: "عرض النتيجة" },
  group: { title: "شكّل مجموعتك", text: "طلب تشكيل المجموعة ورسم 200 $، في مدة تشكيل المجموعات. رقمها وسعتها يُعطيان تلقائياً، وتشكّلها وحدك: فريقها يسنده رئيس التكتل.", cta: "طلب تشكيل مجموعة" },
  team: { title: "بانتظار دعوة تكتل", text: "رؤساء التكتلات يختارون موجّهيهم ومنسقيهم ومعاونيهم للتكتل كله بدعوات فردية، ثم يسندونهم إلى المجموعات. تقبل دعوة واحدة.", cta: "دعواتي" },
  approval: { title: "طلب المجموعة قيد الاعتماد", text: "يراجعه ماهر عيسى ثم يعتمده مدير المكتب مازن الحلبي.", cta: "متابعة الطلب" },
  cluster: { title: "تشكيل التكتلات", text: "يدعو رؤساء التكتلات المجموعات بحجاجها: تقبل دعوة واحدة لمجموعتك. وإن استوفيت شروط الطلب قدّمت أنت طلب تشكيل تكتل. لا انتخاب.", cta: "تشكيل التكتلات" },
  requests: { title: "حجاج مجموعتك", text: "أُلحقت بمجموعتك عائلات جديدة بعقودها: رحّب بها، وتابع ملفاتها الصحية مع المنسق الذي أسنده رئيس التكتل.", cta: "حجاج المجموعة" },
  field: { title: "الميدان: افتح أول تجمّع", text: "«ساحة المزة ← المطار» — مسح البطاقات وإرسال «انطلقنا» للجميع.", cta: "وضع الميدان" },
});

export function AdminDashboard() {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const coord = useCoordinatorPost(admin.id, profile);
  const router = useRouter();
  const events = useStore((s) => s.events);
  const joinCount = Object.keys(profile?.joinDecisions ?? {}).length;
  const rules = useExamRules();
  const hall = useMyHall(admin.id, profile);
  const blueprint = hall.exam;
  const written = useMemo<Written>(
    () => ({ date: hall.session?.date ?? "", time: hall.session?.time ?? "", questions: blueprint ? questionCount(blueprint) : 0, minutes: blueprint?.minutes ?? 0, center: hall.center?.name }),
    [hall.session, hall.center, blueprint],
  );
  const steps = useMemo(() => journeyOf(profile, rules, joinCount, written), [profile, rules, joinCount, written]);
  const nav = useAdminNav();
  const regOp = useOperation("admin-registration");
  const registration = rangeLabel(regOp.start, regOp.end);
  const current = steps.find((s) => s.state === "current");
  const result = resultOf(profile, rules);
  const failed = !!result.published && result.final !== undefined && !result.passed;
  const mine = useMemo(() => events.filter((e) => e.actor === admin.name).slice(-7).reverse(), [events, admin.name]);
  const history = seasonHistory(admin.id);
  const record = recordOf(profile, admin.id);
  const next = current ? nextSteps(rules, written)[current.key] : null;
  const clusterName = profile?.cluster?.name ?? (profile?.group?.clusterId ? "تكتل النور" : undefined);
  const clusterGroups = clusterGroupsOf(profile, admin.name).length;
  const status1448 = coord
    ? `منسق تقني في ${coord.clusterName} — ${groupsLabel(coord.groups.map((g) => g.number))}`
    : profile?.deputyOf
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
        : profile?.eligibleAt
          ? "مؤهل — بانتظار رسم التسجيل"
          : "لم يتقدم بعد";

  const notes = [
    coord && { t: `دعاك رئيس ${coord.clusterName} ${coord.headName} إلى تكتله فقبلت، وأسند إليك ${groupsLabel(coord.groups.map((g) => g.number))}. تعمل فيها وحدها.`, who: "شؤون التكتلات" },
    profile?.deputyOf && { t: `دعاك رئيس ${profile.deputyOf.clusterName} ${profile.deputyOf.headName} نائباً له فقبلت، فصارت صفتك لهذا الموسم نائب رئيس تكتل: ترى مجموعات التكتل كلها ومعلوماته، وتنوب عن الرئيس في متابعتها.`, who: "شؤون الإداريين" },
    profile?.cluster && { t: `قدّمت طلب تشكيل ${profile.cluster.name}، فبقيتَ رئيس المجموعة ${profile.group?.number} وارتفعت مهامك إلى مستوى التكتل: تدير ${clusterGroups} مجموعات، لكل واحدة رئيسها والفريق الذي أسندته إليها. نائبك ${profile.cluster.deputy?.status === "accepted" ? profile.cluster.deputy.name : "لم يقبل بعد"}.`, who: "شؤون الإداريين" },
    !profile?.cluster && profile?.group?.clusterId && { t: `قبلتَ دعوة تكتل لمجموعتك ${profile.group.number}، فدخلته بحجاجها.`, who: "شؤون التكتلات" },
    profile?.group?.approvedAt && { t: `اعتُمدت المجموعة ${profile.group.number} لموسم 1448. فريقها يسنده رئيس التكتل الذي تدخله.`, who: "مدير المكتب" },
    result.exempt && { t: "جُدّدت صفتك لموسم 1448 دون امتحان، لأنك شغلتها الموسم الماضي بتقييم مستوفٍ. رسم الموسم مسدد.", who: "شؤون الإداريين" },
    result.published && result.passed && !result.exempt && { t: `تهانينا، اجتزت التأهيل بنتيجة ${result.final} وصرت مؤهلاً لصفة رئيس مجموعة. يمكنك تقديم طلب تشكيل مجموعة في مدة تشكيل المجموعات.`, who: "إدارة الامتحانات" },
    profile?.feePaidAt && !profile.examExempt && { t: `أنت مؤهل للامتحان الكتابي: ${hall.exam?.name ?? "امتحان صفتك"}، ${hall.session ? `يوم ${hall.session.date} الساعة ${hall.session.time}` : "يُحدَّد موعده"}، في ${hall.center?.name ?? "المركز الامتحاني الذي تُسندك إليه إدارة الامتحانات"}.`, who: "إدارة الامتحانات" },
    profile?.receipt && { t: `تم استلام طلب مشاركتك في موسم 1448 ورسم التسجيل (الإيصال ${profile.receipt}).`, who: "المنصة" },
    profile?.eligibleAt && { t: `تحققت المنصة من أهليتك لصفة ${positionLabelOf(profile.positions[0] ?? "")} وفق جدول شروط الصفات لموسم 1448${profile.feePaidAt ? "" : ". بقي تسديد رسم التسجيل ليُقدَّم طلبك"}.`, who: "المنصة" },
    { t: `التسجيل كإداري لموسم 1448: ${registration}.`, who: "الإدارة" },
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
                ["الصفة لموسم 1448", profile?.positions.length ? `${positionLabelOf(effectiveRole(profile))}${profile.cluster || profile.deputyOf ? " (بتشكيل التكتل)" : profile.renewal === "keep" ? " (تجديد)" : ""}` : "لم تُحدَّد — التسجيل يتجدد كل موسم"],
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

            <div className="mt-8 border-t border-gold-light pt-6">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  logAdmin(admin.id, "تسجيل خروج الإداري");
                  actions.adminLogout();
                  router.push("/administrator");
                }}
              >
                <LogOut className="size-4" /> تسجيل الخروج
              </Button>
            </div>
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
          </motion.div>

          {/* His operations: each its own tab with its own dates — not one chain from the exam to the field */}
          <Card className="md:p-8">
            <h3 className="flex items-center gap-2 font-display text-xl font-bold text-green-dark">
              <CalendarClock className="size-6 text-gold-dark" /> عملياتي هذا الموسم
            </h3>
            <p className="mt-1 text-sm text-ink-soft">كل عملية مستقلة لها تبويبها في القائمة ومدتها، تُفتح وتُغلق وحدها. ما أنجزته في كل منها يبقى فيها.</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-2">
              {nav.filter((n) => n.href !== "/administrator/dashboard").map((n, i) => {
                const mineIn = steps.filter((s) => s.href === n.href);
                const where = mineIn.find((s) => s.state === "current") ?? mineIn.filter((s) => s.state === "done").at(-1) ?? mineIn[0];
                const finished = mineIn.length > 0 && mineIn.every((s) => s.state === "done");
                return (
                  <motion.li key={n.href} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.04 * i }}>
                    <Link href={n.href} className={cn("flex h-full gap-3 rounded-2xl border-2 p-3 transition hover:border-gold-dark", n.open ? "border-gold/40 bg-white" : "border-transparent bg-sand")}>
                      <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", finished ? "bg-green-light text-white" : n.open ? "bg-gold/30 text-green-dark" : "bg-white text-hint")}>
                        {finished ? <Check className="size-5" /> : n.open ? <n.icon className="size-5" /> : <Lock className="size-4" />}
                      </span>
                      <span className="min-w-0">
                        <span className={cn("block font-bold", n.open ? "text-ink" : "text-ink-soft")}>{n.label}</span>
                        {n.shown && n.shown.status !== "always" && <span className={cn("block text-xs font-semibold", n.open ? "text-green" : "text-hint")}>{statusLabel(n.shown)}</span>}
                        {where && <span className="mt-0.5 block text-xs leading-5 text-ink-soft">{where.detail}</span>}
                      </span>
                    </Link>
                  </motion.li>
                );
              })}
            </ul>
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
