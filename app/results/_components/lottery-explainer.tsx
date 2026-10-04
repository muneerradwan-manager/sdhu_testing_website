import { CalendarRange, FileSpreadsheet, Gavel, Keyboard, ListChecks, Lock, ShieldCheck, Tv, UserCheck } from "lucide-react";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { drawTotals, OFFICIAL_DRAW } from "@/lib/lottery";

const POOL = drawTotals(OFFICIAL_DRAW);

const PHASES = [
  {
    tag: "قبل البث",
    time: "16 رجب – 1 شعبان",
    tone: "bg-white text-ink",
    accent: "bg-green-light/12 text-green",
    steps: [
      { icon: ListChecks, text: "يُفتح التسجيل الأولي على القرعة بطلب جديد من 16 إلى 25 رجب برسم التسجيل فقط، وتتحقق المنصة من أهلية كل طلب." },
      { icon: FileSpreadsheet, text: `تُحصي المنصة المسجّلين بحسب سنة ميلاد صاحب الطلب وشهره: ${POOL.poolApps.toLocaleString("en-US")} طلباً تضم ${POOL.poolSeats.toLocaleString("en-US")} شخصاً، فيُعرف كم مقعداً تشغل كل سنة وكل شهر.` },
      { icon: Gavel, text: "تستلم لجنة تنظيم القرعة هذا الإحصاء وتشرف على كل ما يليه." },
    ],
  },
  {
    tag: "أثناء البث",
    time: "1 شعبان — 20:00",
    tone: "bg-green-dark text-white",
    accent: "bg-white/10 text-gold",
    live: true,
    steps: [
      { icon: Tv, text: "تُسحب على الهواء مباشرة سنواتُ ميلاد، ولبعضها أشهر محددة، حتى تكتمل مقاعد القرعة. ويمكن لكل عائلة المتابعة من بيتها." },
      { icon: CalendarRange, text: "لا تُسحب أسماء: يُقبل كل طلب وُلد صاحبه في سنة مسحوبة، أو في شهر مسحوب من سنة سُحبت بأشهرها." },
      { icon: Lock, text: "المنصة مقفلة: لا يستطيع أحد تغيير أي طلب فيها أثناء القرعة." },
    ],
  },
  {
    tag: "بعد البث",
    time: "1 شعبان 23:40 ← 2 شعبان 09:05",
    tone: "bg-white text-ink",
    accent: "bg-gold/35 text-maroon",
    steps: [
      { icon: Keyboard, text: "يُدخل مكتب القرعة في المنصة ما سُحب في البث، سنةً سنة، وتحسب المنصة المقاعد التي يغطيها حتى تطابق مقاعد القرعة." },
      { icon: ShieldCheck, text: "تعتمد الإدارة النتائج وتنشرها: يظهر جدول السنوات والأشهر للجميع، ويعرف كل مسجّل نتيجته في حسابه وبرقمه الوطني." },
      { icon: UserCheck, text: "يثبّت المقبولون تسجيلهم من 2 إلى 25 شعبان بتأكيد القبول ودفع الدفعة الأولى، ومن لا يثبّت يسقط قبوله." },
    ],
  },
];

export function LotteryExplainer() {
  return (
    <section className="mx-auto max-w-7xl px-4 py-20 md:px-8 md:py-28">
      <SectionHeading
        eyebrow="الشفافية أولاً"
        title="كيف تتم القرعة؟"
        description="القرعة لا تُجرى داخل المنصة، بل ببث مباشر بإشراف لجنة رسمية تسحب سنوات الميلاد وأشهرها. دور المنصة يكون قبل البث وبعده فقط."
      />

      <Stagger className="relative grid gap-5 lg:grid-cols-3" gap={0.15}>
        <div className="absolute inset-x-10 top-10 hidden h-px bg-gradient-to-l from-gold/0 via-gold-dark/60 to-gold/0 lg:block" aria-hidden />
        {PHASES.map((p, i) => (
          <StaggerItem key={p.tag} className="h-full">
            <article className={`relative flex h-full flex-col overflow-hidden rounded-3xl border border-gold/40 p-6 shadow-[0_24px_60px_-40px_rgba(0,89,79,.6)] md:p-7 ${p.tone}`}>
              {p.live && <div className="bg-pattern absolute inset-0 opacity-15" />}
              <div className="relative flex items-center justify-between gap-3">
                <span className="flex items-center gap-3">
                  <span className={`flex size-11 items-center justify-center rounded-2xl font-display text-lg font-bold ${p.accent}`}>{i + 1}</span>
                  <span>
                    <span className="block font-display text-xl font-bold">{p.tag}</span>
                    <span className="block text-xs opacity-70">{p.time}</span>
                  </span>
                </span>
                {p.live && (
                  <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2.5 py-1 text-[11px] font-bold text-white">
                    <span className="size-1.5 animate-pulse rounded-full bg-white" /> مباشر
                  </span>
                )}
              </div>
              <ul className="relative mt-6 space-y-4">
                {p.steps.map((s) => (
                  <li key={s.text} className="flex gap-3">
                    <span className={`mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-xl ${p.accent}`}>
                      <s.icon className="size-4" />
                    </span>
                    <p className="text-sm leading-7 opacity-90">{s.text}</p>
                  </li>
                ))}
              </ul>
            </article>
          </StaggerItem>
        ))}
      </Stagger>

      <Reveal delay={0.2}>
        <div className="relative mt-8 flex flex-col items-start gap-4 overflow-hidden rounded-3xl bg-maroon-dark p-6 text-white sm:flex-row sm:items-center md:p-8">
          <div className="bg-pattern absolute inset-0 opacity-10" />
          <span className="relative flex size-14 shrink-0 items-center justify-center rounded-2xl bg-gold text-maroon-dark">
            <Lock className="size-7" />
          </span>
          <div className="relative">
            <p className="font-display text-xl font-bold text-gold md:text-2xl">قاعدة ثابتة: لا شيء يظهر قبل الاعتماد والنشر</p>
            <p className="mt-1 text-sm leading-7 text-white/75">
              لا تظهر أي نتيجة لأي شخص قبل أن تعتمدها الإدارة وتنشرها. وكل إدخال أو نشر مسجّل في سجل الأحداث باسم من نفّذه ووقته،
              ويبقى جدول النتائج متاحاً حتى نهاية الموسم ثم يُؤرشف.
            </p>
          </div>
        </div>
      </Reveal>
    </section>
  );
}
