"use client";

import { motion } from "motion/react";
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  CircleDot,
  History,
  PartyPopper,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { ButtonLink } from "@/components/ui/button";
import { Badge } from "@/components/ui/widgets";
import { questionCount } from "@/lib/data/admin-exam";
import { ageOf } from "@/lib/registry";
import { cn, maskNationalId } from "@/lib/utils";
import { effectiveRole, journeyOf, positionLabelOf, resultOf, seasonHistory, useAdmin, type SeasonRecord } from "../../_lib/admin";
import { useMyHall } from "../../_lib/halls";
import { POOLS, useClusterGroupsOf } from "../../_lib/formation";
import { groupsLabel, useCoordinatorPost } from "../../_lib/coordinators";
import { groupName } from "@/lib/groups";
import { AdminShell } from "../../_components/ui";
import { SeasonSheet } from "./season-sheet";

type Written = { date: string; time: string; questions: number; minutes: number; center?: string };

/** The next step's card; the test's numbers are the season's, as the exam system left them */
const nextSteps = (w: Written): Record<string, { title: string; text: string; cta: string }> => ({
  apply: { title: "سجّل لموسم 1448", text: "التسجيل يتجدد كل موسم: حدّث وثائقك ومهاراتك، واختر صفة واحدة يستوفي ملفك شروطها، ووافق على الالتزامات. تتحقق المنصة من أهليتك قبل أن تدفع.", cta: "ابدأ الطلب" },
  fee: { title: "أنت مؤهل — بقي رسم التسجيل", text: "استوفى ملفك شروط الصفة التي اخترتها. سدّد رسم 30 $ ليُقدَّم طلبك.", cta: "تسديد الرسم" },
  test: { title: "اختبارك المؤتمت في القاعة", text: `${w.center ?? "قاعة مركزك الامتحاني"} — ${w.date} الساعة ${w.time}: ${w.questions} سؤالاً في ${w.minutes} دقيقة. احضر ببطاقتك وهويتك: يسجّل المشرف حضورك، وتدخل الاختبار من جهازك برقمك الوطني بموافقته.`, cta: "قاعتي وموعدي" },
  result: { title: "نتيجتك", text: "تُحتسب بعد أن يؤكد مشرف القاعة تسليمك: تنجح باجتياز كل قسم من أقسام الاختبار بالنسبة المطلوبة فيه.", cta: "عرض النتيجة" },
  group: { title: "تُشكَّل مجموعتك في المكتب", text: "راجع المكتب في مدة تشكيل المجموعات باسم مجموعتك (لا تحمله مجموعة أخرى)، وسدّد رسمها 200 $ هناك، فيشكّلها موظف إدارة الإداريين بفئتك: منها عدد حجاجها ومقاعد فريقها. مقاعد فريقها يملؤها رئيس التكتل.", cta: "كيف تُشكَّل" },
  team: { title: "بانتظار دعوة تكتل", text: "رؤساء التكتلات يدعون كل واحد إلى مكانه: مقعد الموجّه أو المعاون في إحدى مجموعاتهم، أو من منسقي التكتل أو موجّهاته أو معاونيه. تقبل دعوة واحدة: لكل شخص مكان واحد في الموسم.", cta: "دعواتي" },
  approval: { title: "مجموعتك عند المكتب", text: "يكمل موظف إدارة الإداريين تشكيلها بفئتك.", cta: "تشكيل المجموعة" },
  cluster: { title: "تشكيل التكتلات", text: "يدعو رؤساء التكتلات المجموعات بحجاجها: تقبل دعوة واحدة لمجموعتك. ومن يحمل صفة «رئيس تكتل» أساسيةً أو موسمية يقدّم طلب تشكيل تكتل. لا انتخاب.", cta: "تشكيل التكتلات" },
  requests: { title: "حجاج مجموعتك", text: "يلحق المكتب العائلات بمجموعتك بعقودها، فتراها هنا: رحّب بها، وتابع ملفاتها الصحية مع المنسق الذي وزّعه رئيس التكتل على مجموعتك.", cta: "حجاج المجموعة" },
  field: { title: "الميدان: افتح أول تجمّع", text: "«ساحة المزة ← المطار» — مسح البطاقات وإرسال «انطلقنا» للجميع.", cta: "وضع الميدان" },
});

export function AdminDashboard() {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const coord = useCoordinatorPost(admin.id, profile);
  const joinCount = Object.keys(profile?.joinDecisions ?? {}).length;
  const hall = useMyHall(admin.id, profile);
  const blueprint = hall.exam;
  const written = useMemo<Written>(
    () => ({ date: hall.session?.date ?? "", time: hall.session?.time ?? "", questions: blueprint ? questionCount(blueprint) : 0, minutes: blueprint?.minutes ?? 0, center: hall.center?.name }),
    [hall.session, hall.center, blueprint],
  );
  const steps = useMemo(() => journeyOf(profile, joinCount, written), [profile, joinCount, written]);
  const current = steps.find((s) => s.state === "current");
  const result = resultOf(profile);
  const failed = !!result.published && !result.exempt && !result.passed;
  const history = seasonHistory(admin.id);
  const [openSeason, setOpenSeason] = useState<SeasonRecord | null>(null);
  const next = current ? nextSteps(written)[current.key] : null;
  const clusterName = profile?.cluster?.name ?? (profile?.group?.clusterId ? "تكتل النور" : undefined);
  const clusterGroups = useClusterGroupsOf(profile).length;
  const status1448 = coord
    ? `${POOLS[coord.role].title} في ${coord.clusterName} — ${coord.role === "guide-f" || coord.role === "cluster-assistant" ? "للتكتل كله" : groupsLabel(coord.groups.map((g) => g.number))}${profile?.accountantOf ? ` — ومحاسب التكتل` : ""}`
    : profile?.deputyOf
    ? `نائب رئيس ${profile.deputyOf.clusterName} — يتابع ${clusterGroups} مجموعات، منها مجموعته «${profile.group ? groupName(profile.group.number) : ""}»`
    : profile?.cluster
    ? `رئيس ${profile.cluster.name} — يدير ${clusterGroups} مجموعات، منها مجموعته «${profile.group ? groupName(profile.group.number) : ""}»`
    : profile?.group?.approvedAt
    ? `رئيس ${groupName(profile.group.number)}${clusterName ? ` — ${clusterName}` : " — دون تكتل بعد"}`
    : result.exempt
      ? `مجدَّد في الصفة نفسها — دون اختبار`
      : result.passed
        ? `ناجح في التأهيل${result.score !== undefined ? ` (${result.score}%)` : ""}`
      : profile?.feePaidAt
        ? "متقدم — قيد التأهيل"
        : profile?.eligibleAt
          ? "مؤهل — بانتظار رسم التسجيل"
          : "لم يتقدم بعد";


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
      {/* Who he is and his next step side by side, of equal height; his seasons across, under both */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="flex flex-col justify-center md:p-8">
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

        </Card>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative flex flex-col justify-center overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-9", failed ? "bg-ink" : "bg-gradient-to-br from-maroon-dark via-maroon to-green-dark")}>
          <div className="bg-pattern absolute inset-0 opacity-15" />
          <motion.div aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
          <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">
              <CircleDot className="size-4" /> الخطوة التالية {current && `— ${current.date}`}
            </span>
            {failed ? (
              <>
                <p className="mt-4 font-display text-3xl font-bold">لم تجتز التأهيل هذا الموسم</p>
                <p className="mt-2 leading-8 text-white/75">لم تبلغ النسبة المطلوبة في كل أقسام الاختبار المؤتمت. يبقى ملفك وسجلك مرجعاً في أي تأهيل لاحق.</p>
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

        <Card className="md:p-8 lg:col-span-2">
          <h3 className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
            <History className="size-5 text-gold-dark" /> السجل الموسمي
          </h3>
          <p className="mt-1 text-sm text-ink-soft">اضغط على موسم خدمت فيه لترى كيف حُسب تقييمه وما جرى فيه.</p>
          <ol className="mt-4 grid gap-3 sm:grid-cols-[repeat(auto-fit,minmax(13rem,1fr))]">
            {[...history, { season: "1448", roleKey: null, role: status1448, group: "", rating: null }].map((h) => {
              const rated = !!h.roleKey && h.rating !== null;
              const body = (
                <>
                  <span className="flex items-center gap-2 font-bold">
                    <span className={cn("size-3 shrink-0 rounded-full", h.season === "1448" ? "bg-maroon" : h.rating ? "bg-green-light" : "bg-gold")} />
                    موسم {h.season}
                  </span>
                  <span className="mt-1 block text-sm leading-6 text-ink-soft">
                    {h.role}
                    {h.group && ` — ${h.group}`}
                  </span>
                  {rated ? (
                    <span className="mt-2 flex flex-wrap items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 rounded-full bg-gold/30 px-2 py-0.5 text-xs font-bold text-maroon">★ تقييم الموسم {h.rating} من 5</span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-green-dark">
                        كيف حُسب؟ <ArrowLeft className="size-3.5" />
                      </span>
                    </span>
                  ) : (
                    h.season === "1448" && <span className="mt-2 block text-xs text-hint">يُقيَّم بعد العودة من الموسم</span>
                  )}
                </>
              );
              return (
                <li key={h.season}>
                  {rated ? (
                    <button type="button" onClick={() => setOpenSeason(h)} className="block h-full w-full rounded-2xl border-2 border-gold/30 bg-sand/60 p-4 text-right transition hover:border-gold-dark hover:bg-white">
                      {body}
                    </button>
                  ) : (
                    <div className={cn("h-full rounded-2xl border-2 p-4", h.season === "1448" ? "border-maroon/30 bg-maroon/5" : "border-gold/30 bg-sand/60")}>{body}</div>
                  )}
                </li>
              );
            })}
          </ol>
          <SeasonSheet id={admin.id} record={openSeason} onClose={() => setOpenSeason(null)} />
        </Card>
      </div>
    </AdminShell>
  );
}
