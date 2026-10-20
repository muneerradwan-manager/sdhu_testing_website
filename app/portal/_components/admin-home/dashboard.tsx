"use client";

import { motion } from "motion/react";
import { ArrowLeft, CircleDot, PartyPopper, RotateCcw } from "lucide-react";
import { useMemo } from "react";
import { Button, ButtonLink } from "@/components/ui/button";
import { questionCount } from "@/lib/data/admin-exam";
import { cn } from "@/lib/utils";
import { isClusterRole, journeyOf, resultOf, useAdmin } from "@/app/administrator/_lib/admin";
import { useMyHall } from "@/app/administrator/_lib/halls";
import { useClusterGroupsOf } from "@/app/administrator/_lib/formation";
import { useCoordinatorPost } from "@/app/administrator/_lib/coordinators";

type Written = { date: string; time: string; questions: number; minutes: number; center?: string };

/**
 * The next step's card; the test's numbers are the season's, as the exam system left them. `cluster`: the cluster's
 * head, who oversees all its groups rather than one.
 */
const nextSteps = (w: Written, cluster = false): Record<string, { title: string; text: string; cta: string }> => ({
  apply: { title: "سجّل لموسم 1448", text: "التسجيل يتجدد كل موسم: حدّث وثائقك ومهاراتك، واختر صفة واحدة يستوفي ملفك شروطها، ووافق على الالتزامات. تتحقق المنصة من أهليتك قبل أن تدفع.", cta: "ابدأ الطلب" },
  fee: { title: "أنت مؤهل — بقي رسم التسجيل", text: "استوفى ملفك شروط الصفة التي اخترتها. سدّد رسم 30 $ ليُقدَّم طلبك.", cta: "تسديد الرسم" },
  test: { title: "اختبارك المؤتمت في القاعة", text: `${w.center ?? "قاعة مركزك الامتحاني"} — ${w.date} الساعة ${w.time}: ${w.questions} سؤالاً في ${w.minutes} دقيقة. احضر ببطاقتك وهويتك: يسجّل المشرف حضورك، وتدخل الاختبار من جهازك برقمك الوطني بموافقته.`, cta: "قاعتي وموعدي" },
  result: { title: "نتيجتك", text: "تُحتسب بعد أن يؤكد مشرف القاعة تسليمك: تنجح باجتياز كل قسم من أقسام الاختبار بالنسبة المطلوبة فيه.", cta: "عرض النتيجة" },
  oral: { title: "امتحانك الشفهي", text: "نجحت في الاختبار المؤتمت: اختر موعدك أمام لجنة صفتك في مركزك، في مدة الامتحانات الشفهية. لا تتأهل إلا بنجاحك فيه.", cta: "موعدي الشفهي" },
  group: { title: "تُشكَّل مجموعتك في المكتب", text: "احضر مع فريقك إلى المكتب في مدة تشكيل المجموعات: باسم مجموعتك (لا تحمله مجموعة أخرى)، ورسمها 200 $، فيشكّلها الموظف بفئتك ويُجلس فيها موجّهها ومعاونها، وتوقّعون عقدها.", cta: "العقود" },
  team: { title: "مكانك يُحدَّد في المكتب", text: "يُجلسك المكتب في مقعد مجموعة عند تشكيلها، أو يختارك رئيس تكتل للتكتل كله (منسقاً أو موجّهة أو معاوناً أو محاسباً) عند تشكيله في المكتب. لكل شخص مكان واحد في الموسم.", cta: "ملفي" },
  approval: { title: "مجموعتك عند المكتب", text: "يكمل الموظف تشكيلها بفئتك وفريقها.", cta: "العقود" },
  cluster: { title: "يُشكَّل التكتل في المكتب", text: "يحضر من يحمل صفة «رئيس تكتل» ورؤساء المجموعات وكادره إلى المكتب: يُدخل الموظف المجموعات بفرقها، ويختار رئيس التكتل منسقيه وموجّهاته ومعاونه ومحاسبه، ويُدفع رسمه 500 $، ويوقّع الجميع عقده.", cta: "العقود" },
  requests: cluster
    ? { title: "حجاج مجموعات التكتل", text: "يلحق المكتب العائلات بمجموعات التكتل بعقودها، فتراها في «إدارة التكتل»: حجاج كل مجموعة ومقاعدها، وملفاتهم الصحية مع منسقي التكتل الموزّعين على المجموعات.", cta: "إدارة التكتل" }
    : { title: "حجاج مجموعتك", text: "يلحق المكتب العائلات بمجموعتك بعقودها، فتراها هنا: رحّب بها، وتابع ملفاتها الصحية مع المنسق الذي وزّعه رئيس التكتل على مجموعتك.", cta: "حجاج المجموعة" },
  field: { title: "الميدان: افتح أول تجمّع", text: "«السفر: إلى مطار دمشق» ثم «عمرة التمتّع» — تحدّد من حضر من قائمة المجموعة، ثم ترسل «انطلقنا» للجميع.", cta: "وضع الميدان" },
});

/** What an administrator's season rests on: his file, his post among a cluster's team, his result, his cluster's groups */
export function useAdminStanding() {
  const admin = useAdmin()!;
  const profile = admin.profile;
  const coord = useCoordinatorPost(admin.id, profile);
  const result = resultOf(profile);
  const clusterName = profile?.cluster?.name ?? (profile?.group?.clusterId ? "تكتل النور" : undefined);
  const clusterGroups = useClusterGroupsOf(profile);
  return { admin, profile, coord, result, clusterName, clusterGroups };
}

/**
 * The season card of an account on the administrators' way, at the top of «ملفي»: his next step in the season (where
 * he stands is on his ID card beside it, ./id-card) —
 * applying, the fee, the exams, his group or his place in a cluster, the field — or that he did not qualify.
 */
export function AdminNextStep({ onChange }: { onChange?: () => void }) {
  const admin = useAdmin()!;
  const profile = admin.profile;
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
  // Failed the written test, or its oral exam after it
  const failed = !!result.published && !result.exempt && (!result.written || result.oral?.status === "failed" || result.oral?.status === "absent");
  const next = current ? nextSteps(written, isClusterRole(profile))[current.key] : null;


  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className={cn("relative flex flex-col justify-center overflow-hidden rounded-[2rem] p-7 text-white shadow-2xl md:p-9", failed ? "bg-ink" : "bg-gradient-to-br from-maroon-dark via-maroon to-green-dark")}>
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <motion.div aria-hidden className="absolute -left-16 -top-16 size-56 rounded-full bg-gold/25 blur-3xl" animate={{ scale: [1, 1.2, 1] }} transition={{ duration: 6, repeat: Infinity }} />
      <div className="relative">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">
            <CircleDot className="size-4" /> الخطوة التالية {current && `— ${current.date}`}
          </span>
        </div>
        {failed ? (
          <>
            <p className="mt-4 font-display text-3xl font-bold">لم تجتز التأهيل هذا الموسم</p>
            <p className="mt-2 leading-8 text-white/75">{result.written ? "لم تجتز الامتحان الشفهي أمام لجنة صفتك." : "لم تبلغ النسبة المطلوبة في كل أقسام الاختبار المؤتمت."} يبقى ملفك وسجلك مرجعاً في أي تأهيل لاحق.</p>
            <ButtonLink href="/portal/exam" variant="gold" size="lg" className="mt-6">عرض التفاصيل <ArrowLeft className="size-5" /></ButtonLink>
          </>
        ) : next && current ? (
          <>
            <p className="mt-4 font-display text-3xl font-bold leading-[1.4] md:text-4xl">{next.title}</p>
            <p className="mt-2 max-w-xl leading-8 text-white/75">{next.text}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <ButtonLink href={current.href} variant="gold" size="xl">
                {next.cta} <ArrowLeft className="size-6" />
              </ButtonLink>
              {onChange && (
                <Button variant="glass" size="lg" onClick={onChange}>
                  <RotateCcw className="size-5" /> غيّرت رأيي: أختار من جديد
                </Button>
              )}
            </div>
          </>
        ) : (
          <>
            <p className="mt-4 flex items-center gap-3 font-display text-3xl font-bold">
              <PartyPopper className="size-9 text-gold" /> أتممت كل محطات الرحلة
            </p>
            <p className="mt-2 leading-8 text-white/75">{isClusterRole(profile) ? "تابع مجموعات التكتل في الميدان" : "تابع مجموعتك في الميدان"}، وتقييماتك تتجمّع من الموظفين والحجاج.</p>
            <ButtonLink href="/portal/field" variant="gold" size="lg" className="mt-6">وضع الميدان <ArrowLeft className="size-5" /></ButtonLink>
          </>
        )}
      </div>
    </motion.div>
  );
}
