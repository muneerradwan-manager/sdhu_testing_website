import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, BookOpenText, CalendarClock, FileCheck2, Hourglass, Plane, ShieldCheck, UsersRound, Wallet } from "lucide-react";
import { PageHero } from "@/components/ui/page-hero";
import { Reveal, SectionHeading, Stagger, StaggerItem } from "@/components/ui/motion";
import { NotifyForm } from "./notify-form";

export const metadata: Metadata = {
  title: "العمرة — قريباً",
  description: "خدمات العمرة على المنصة الوطنية قيد الإعداد، وستُعلن تفاصيلها عند اعتمادها.",
};

/**
 * Placeholder for Umrah services. No programme, price or date is invented here:
 * everything below is a planned capability, clearly marked "قريباً", until the administration publishes details.
 */
const PLANNED = [
  { icon: UsersRound, title: "التسجيل في رحلات العمرة", text: "تقديم طلب العمرة لك ولعائلتك من حسابك نفسه، بالطريقة المبسطة التي تعرفها من طلب الحج." },
  { icon: ShieldCheck, title: "الجهات المعتمدة للعمرة", text: "دليل بالشركات والحملات المعتمدة، مع إمكانية التحقق من أي جهة قبل التعامل معها." },
  { icon: Wallet, title: "البرامج والتكاليف المعلنة", text: "عرض البرامج المعتمدة وتكاليفها الرسمية بشفافية، مع إيصالات رقمية لكل دفعة." },
  { icon: FileCheck2, title: "متابعة الطلب والتأشيرة", text: "حالة الطلب والوثائق المطلوبة والتأشيرة خطوة بخطوة، مع إشعارات على الهاتف." },
  { icon: Plane, title: "الرحلة والسكن", text: "تفاصيل الرحلة والفندق والمجموعة في مكان واحد بعد اعتماد الطلب." },
  { icon: CalendarClock, title: "مواعيد المواسم", text: "مواعيد فتح التسجيل لكل موسم عمرة، وتذكير شخصي بها." },
];

export default function UmrahPage() {
  return (
    <>
      <PageHero
        image="/images/tawaf-night.jpg"
        crumbs={[{ label: "العمرة" }]}
        title={
          <span className="flex flex-wrap items-center gap-4">
            العمرة
            <span className="rounded-full border border-gold/50 bg-gold/15 px-4 py-1 text-xl text-gold md:text-2xl">قريباً</span>
          </span>
        }
        description="نعمل على إضافة خدمات العمرة إلى المنصة الوطنية. ستُعلن التفاصيل والمواعيد رسمياً عند اعتمادها من الإدارة."
      />

      <section className="mx-auto max-w-5xl px-4 pt-16 md:px-8 md:pt-20">
        <Reveal>
          <div className="flex flex-col items-start gap-5 rounded-[2rem] border border-gold/40 bg-white p-6 shadow-[0_30px_70px_-45px_rgba(0,89,79,.5)] md:flex-row md:items-center md:p-8">
            <span className="grid size-16 shrink-0 place-items-center rounded-2xl bg-gold/25 text-maroon">
              <Hourglass className="size-8" />
            </span>
            <div>
              <p className="font-display text-2xl font-bold text-green-dark">الخدمة قيد الإعداد</p>
              <p className="mt-2 leading-8 text-ink-soft">
                لم تُعلن بعد برامج العمرة ولا مواعيدها ولا تكاليفها على المنصة. أي جهة تعرض عليك اليوم «تسجيلاً عبر المنصة الوطنية» للعمرة لا تمثّل الإدارة —
                يمكنك{" "}
                <Link href="/verify" className="font-bold text-green-dark underline decoration-gold-dark underline-offset-4">
                  التحقق من الجهات المعتمدة
                </Link>
                .
              </p>
            </div>
          </div>
        </Reveal>
      </section>

      <section className="mx-auto max-w-7xl px-4 pt-20 md:px-8 md:pt-24">
        <SectionHeading eyebrow="ما الذي نعمل عليه" title="خدمات العمرة المخطط لها" description="هذه قائمة بما نعمل على إضافته، وقد تتغير تفاصيلها عند الإطلاق." />
        <Stagger className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {PLANNED.map((p) => {
            const Icon = p.icon;
            return (
              <StaggerItem key={p.title} className="relative h-full rounded-3xl border border-dashed border-gold-dark/50 bg-white/70 p-6">
                <span className="absolute left-5 top-5 rounded-full bg-sand px-2.5 py-0.5 text-xs font-bold text-hint">قريباً</span>
                <span className="grid size-12 place-items-center rounded-2xl bg-green-dark/8 text-green-dark">
                  <Icon className="size-6" />
                </span>
                <h3 className="mt-4 font-display text-xl font-bold text-green-dark">{p.title}</h3>
                <p className="mt-2 leading-7 text-ink-soft">{p.text}</p>
              </StaggerItem>
            );
          })}
        </Stagger>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 pt-20 md:px-8 md:pt-24 lg:grid-cols-2">
        <Reveal>
          <Link
            href="/academy/umrah-fiqh"
            className="group relative flex h-full flex-col justify-between overflow-hidden rounded-[2rem] bg-green-dark p-7 text-white shadow-2xl md:p-9"
          >
            <div className="bg-pattern absolute inset-0 opacity-15" />
            <div className="relative">
              <span className="inline-flex items-center gap-2 rounded-full bg-green-light/25 px-3 py-1 text-sm font-bold text-white">
                <span className="size-2 rounded-full bg-green-light" /> متاح الآن
              </span>
              <BookOpenText className="mt-5 size-10 text-gold" />
              <p className="mt-3 font-display text-3xl font-bold">مسار «فقه العمرة» في الأكاديمية</p>
              <p className="mt-2 leading-8 text-white/75">أركان العمرة وواجباتها وأخطاؤها الشائعة، بالفيديو والشرح المسموع والملخص المكتوب — دون تسجيل دخول.</p>
            </div>
            <span className="relative mt-6 inline-flex items-center gap-2 font-bold text-gold transition group-hover:gap-3">
              ابدأ التعلّم <ArrowLeft className="size-5" />
            </span>
          </Link>
        </Reveal>
        <Reveal delay={0.1}>
          <NotifyForm />
        </Reveal>
      </section>
    </>
  );
}
