"use client";

import { motion, useMotionValue, useMotionValueEvent, useScroll, useSpring, useTransform } from "motion/react";
import { BadgeCheck, FileSignature, Plane, ScanSearch, Ticket, UserRoundPlus } from "lucide-react";
import { useCallback, useEffect, useRef } from "react";
import { SectionHeading } from "@/components/ui/motion";

const STEPS = [
  { icon: UserRoundPlus, title: "إنشاء الحساب", text: "الرقم الوطني ورقم الهاتف فقط — وبياناتك تصل من الشؤون المدنية للتأكيد.", when: "دقيقتان" },
  { icon: FileSignature, title: "تقديم الطلب", text: "أسئلة بسيطة واحدة تلو الأخرى، وإضافة العائلة من دفتر العائلة أو بالرقم الوطني.", when: "9 جمادى الآخرة – 1 رجب" },
  { icon: ScanSearch, title: "التحقق من الأهلية", text: "تطبّق المنصة شروط الموسم على كل فرد وتشرح لك أي ملاحظة بوضوح.", when: "حتى 10 رجب" },
  { icon: Ticket, title: "القبول على مرحلتين", text: "35% قبول مباشر للأكبر سناً، ثم قرعة علنية ببث مباشر على 65% من الحصة.", when: "15 رجب و1 شعبان" },
  { icon: BadgeCheck, title: "التجهيز والتسديد", text: "المجموعة، العقد، الإيصالات، التأشيرة، والدروس الدينية قبل السفر.", when: "شعبان – ذو القعدة" },
  { icon: Plane, title: "السفر والعودة", text: "الرحلة والفندق والمخيم وبطاقتك الرقمية في جيبك طوال الرحلة.", when: "24 ذو القعدة – 23 ذو الحجة" },
];

export function Journey() {
  const ref = useRef<HTMLDivElement>(null);
  // Progress = how far the line at 55% of the screen height has travelled down the track, so the plane
  // rides at a steady spot in view and points at the station being read. Measured from on-screen rects,
  // which stays correct under the page zoom used on large screens and phones (useScroll's target offsets did not).
  const raw = useMotionValue(0);
  const { scrollY } = useScroll();
  const update = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    raw.set(Math.min(1, Math.max(0, (window.innerHeight * 0.55 - r.top) / r.height)));
  }, [raw]);
  useMotionValueEvent(scrollY, "change", update);
  useEffect(() => {
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [update]);
  const progress = useSpring(raw, { stiffness: 140, damping: 26 });
  const planeTop = useTransform(progress, [0, 1], ["0%", "100%"]);

  return (
    <section className="relative overflow-hidden py-24">
      <div className="bg-pattern-dark absolute inset-0" />
      <div className="relative mx-auto max-w-5xl px-4 md:px-8">
        <SectionHeading
          eyebrow="كيف تعمل المنصة؟"
          title="رحلتك في ست محطات واضحة"
          description="لن تحتاج إلى مراجعة المكتب أو السؤال عن الخطوة التالية؛ كل محطة تظهر في حسابك مع موعدها وما هو مطلوب منك."
        />

        <div ref={ref} className="relative">
          {/* Track */}
          <div className="absolute bottom-0 right-7 top-0 w-1 rounded-full bg-gold-light md:right-1/2 md:translate-x-1/2" />
          <motion.div
            style={{ scaleY: progress }}
            className="absolute bottom-0 right-7 top-0 w-1 origin-top rounded-full bg-gradient-to-b from-green-light via-green-dark to-gold-dark md:right-1/2 md:translate-x-1/2"
          />
          <motion.div style={{ top: planeTop }} className="absolute right-7 z-10 -translate-y-1/2 translate-x-1/2 md:right-1/2">
            <span className="grid size-10 place-items-center rounded-full bg-gold text-ink shadow-lg shadow-gold-dark/30 ring-4 ring-sand">
              <Plane className="size-5 rotate-90" />
            </span>
          </motion.div>

          <div className="space-y-10 md:space-y-16">
            {STEPS.map((s, i) => {
              const Icon = s.icon;
              const left = i % 2 === 1;
              return (
                <motion.div
                  key={s.title}
                  initial={{ opacity: 0, x: left ? -50 : 50 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                  className={`relative flex pr-20 md:w-1/2 md:pr-0 ${left ? "md:mr-auto md:pr-14" : "md:pl-14"}`}
                >
                  <span
                    className={`absolute right-3 top-6 grid size-9 place-items-center rounded-full border-4 border-sand bg-green-dark font-display text-sm font-bold text-gold md:top-8 ${left ? "md:-right-[18px]" : "md:-left-[18px] md:right-auto"}`}
                  >
                    {i + 1}
                  </span>
                  <div className="group w-full rounded-3xl border border-gold/30 bg-white p-6 shadow-[0_20px_50px_-30px_rgba(0,89,79,.35)] transition duration-500 hover:-translate-y-1 hover:border-gold-dark/50 hover:shadow-[0_30px_60px_-30px_rgba(0,89,79,.45)]">
                    <div className="flex items-start gap-4">
                      <span className="grid size-13 shrink-0 place-items-center rounded-2xl bg-green-dark/8 text-green-dark transition duration-500 group-hover:rotate-6 group-hover:bg-green-dark group-hover:text-gold">
                        <Icon className="size-6" />
                      </span>
                      <div>
                        <p className="text-xs font-bold text-gold-dark">{s.when}</p>
                        <h3 className="mt-1 font-display text-xl font-bold text-green-dark">{s.title}</h3>
                        <p className="mt-2 leading-7 text-ink-soft">{s.text}</p>
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
