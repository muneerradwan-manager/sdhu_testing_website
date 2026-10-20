"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { ArrowLeft, Briefcase, GraduationCap, History, Landmark } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/widgets";
import { AdminNextStep } from "./admin-home/dashboard";
import { AdminIdCard } from "./admin-home/id-card";
import { useAccount, type Participation } from "@/lib/account";
import { statusLabel, useAnyOperation, useOperation } from "@/lib/operations";
import { actions } from "@/lib/store";
import { cn } from "@/lib/utils";

/** «في موسم 1447 كنت رئيس مجموعة — مجموعة الهدى، بتقييم 4.4» */
export function pastLine(p: Participation) {
  return p.kind === "admin"
    ? `في موسم ${p.season} كنت إدارياً: ${p.label}${p.detail ? ` — ${p.detail}` : ""}${p.rating ? `، بتقييم ${p.rating} من 5` : ""}.`
    : `في موسم ${p.season} كنت على الحج: ${p.label}.`;
}

/**
 * What the account does this season, on its «ملفي». Creating the account chose nothing: here, each season, its
 * holder chooses the Hajj or an administrative role — or neither, and goes on learning in the Academy. Whoever took
 * part in an earlier season is told what he was, and asked whether he goes on the same way or opens the other file;
 * his record stays whatever he chooses. Once he chose the administrators' way the card leads to their platform; once
 * he chose the Hajj, the page shows his application instead. A choice is taken back only while nothing was started on it.
 */
export function SeasonChoice() {
  const acc = useAccount();
  const router = useRouter();
  const focus = useSearchParams().get("choose");
  const hajj = useAnyOperation(["hajj-direct", "hajj-lottery"]);
  const adminOp = useOperation("admin-registration");
  if (!acc) return null;
  const { id, season, path, last, canChange } = acc;

  // On the administrators' way: his season's next step, and beside it his ID card for the season
  if (path === "admin")
    return (
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <AdminNextStep onChange={canChange ? () => actions.chooseSeasonPath(id, season, null) : undefined} />
        <AdminIdCard season={season} />
      </div>
    );
  if (path === "pilgrim") return null;

  const wasAdmin = last?.kind === "admin";
  const wasPilgrim = last?.kind === "pilgrim";
  const options = [
    {
      key: "pilgrim" as const,
      icon: Landmark,
      title: wasPilgrim ? "أتابع كحاج" : wasAdmin ? "أفتح ملف حاج لهذا الموسم" : "التسجيل على الحج",
      text: wasAdmin
        ? "تسجّل على الحج هذا الموسم لك أو لعائلتك. ويبقى ملفك الإداري بوثائقه وسجلّه محفوظاً لموسم آخر."
        : "تقدّم طلب حج لك وحدك أو مع عائلتك: القبول المباشر لكبار السن، ثم القرعة بطلب مستقل.",
      state: hajj.states.find((s) => s.open) ?? hajj.states.find((s) => s.status === "upcoming") ?? hajj.states.at(-1),
      go: () => {
        actions.chooseSeasonPath(id, season, "pilgrim");
        router.push("/portal/apply");
      },
    },
    {
      key: "admin" as const,
      icon: Briefcase,
      title: wasAdmin ? "أتابع كإداري" : wasPilgrim ? "أفتح ملفاً إدارياً جديداً" : "التقدّم لصفة إدارية",
      text: wasAdmin
        ? "بملفك الإداري الدائم: وثائقك ومهاراتك وسجلّ مواسمك. تجدّد صفتك أو تتقدّم لغيرها."
        : "رئيس مجموعة، أو معاون، أو موجّه ديني، أو منسق تقني: يُفتح لك ملف إداري دائم، وتتقدّم لصفة واحدة يستوفي ملفك شروطها.",
      state: adminOp,
      go: () => {
        actions.chooseSeasonPath(id, season, "admin");
        router.push("/portal/role");
      },
    },
  ];
  // The way he came in by goes first
  if (focus === "admin") options.reverse();

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-[2rem] bg-green-dark p-7 text-white shadow-2xl md:p-9" data-season-choice>
      <div className="bg-pattern absolute inset-0 opacity-15" />
      <div className="absolute -left-20 -top-20 size-64 rounded-full bg-gold/20 blur-3xl" />
      <div className="relative">
        <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-sm text-gold">موسم {season}هـ</span>
        <p className="mt-4 font-display text-3xl font-bold leading-[1.4] md:text-4xl">{last ? "كيف تتابع هذا الموسم؟" : "ماذا تريد أن تفعل هذا الموسم؟"}</p>
        {last ? (
          <p className="mt-2 flex max-w-2xl items-start gap-2 leading-8 text-white/80">
            <History className="mt-1.5 size-5 shrink-0 text-gold" /> {pastLine(last)} سجلّك محفوظ كما هو، وتختار لهذا الموسم: تتابع كما كنت، أو تفتح ملفاً للشيء الجديد.
          </p>
        ) : (
          <p className="mt-2 max-w-2xl leading-8 text-white/75">حسابك واحد، وفي كل موسم تختار ما تفعله به. تختار مساراً واحداً للموسم، وفي الموسم التالي تختار من جديد.</p>
        )}
        {focus === "admin" && <p className="mt-3 max-w-2xl rounded-2xl bg-white/10 p-3 text-sm leading-7 text-gold-light">دخلت من باب الإداريين: ليس لحسابك ملف إداري في هذا الموسم بعد. اختر المسار الإداري ليُفتح لك.</p>}
        <div className="mt-6 grid gap-3 md:grid-cols-2">
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={o.go}
              data-path={o.key}
              className={cn(
                "group flex h-full flex-col items-start rounded-3xl bg-white p-5 text-start text-ink shadow-lg transition hover:-translate-y-1",
                focus === o.key && "ring-4 ring-gold",
              )}
            >
              <span className="flex w-full items-center justify-between gap-3">
                <span className={cn("grid size-12 place-items-center rounded-2xl", o.key === "admin" ? "bg-maroon text-gold" : "bg-green-dark text-gold")}>
                  <o.icon className="size-6" />
                </span>
                {o.state && <Badge tone={o.state.open ? "green" : "ink"}>{statusLabel(o.state)}</Badge>}
              </span>
              <span className="mt-3 font-display text-xl font-bold text-green-dark">{o.title}</span>
              <span className="mt-1 text-sm leading-7 text-ink-soft">{o.text}</span>
              <span className="mt-auto inline-flex items-center gap-1 pt-3 text-sm font-bold text-green-dark transition group-hover:gap-2">
                أختار هذا <ArrowLeft className="size-4" />
              </span>
            </button>
          ))}
        </div>
        <p className="mt-5 flex flex-wrap items-center gap-2 text-sm text-white/70">
          <GraduationCap className="size-4 text-gold" /> أو تابع المنصة دون تسجيل هذا الموسم:
          <Link href="/portal/academy" className="font-bold text-gold hover:underline">الأكاديمية</Link>،
          <Link href="/guide" className="font-bold text-gold hover:underline">ودليل المناسك</Link>. يبقى السؤال هنا حتى تختار.
        </p>
      </div>
    </motion.div>
  );
}
