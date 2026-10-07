"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, ClipboardList, FileSignature, FileText, Printer, ScrollText } from "lucide-react";
import { useState } from "react";
import { PrintSheet } from "@/components/print/print-sheet";
import { Button, ButtonLink } from "@/components/ui/button";
import { useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { useAdminRefs, type ContractForm, type Decision, type JobDescription } from "../_lib/references";
import { DEFAULT_TIER, compositionOf, useStructure } from "../_lib/structure";
import { RefText } from "./ref-text";
import { ReferencesShell } from "./references-shell";

/** The public pages of the cadre's references, read from what the administration published in «المراجع الإدارية» */

const Card = ({ children, className }: { children: React.ReactNode; className?: string }) => <div className={cn("rounded-[1.75rem] border border-gold/30 bg-white p-6 shadow-[0_20px_60px_-40px_rgba(2,21,38,.4)]", className)}>{children}</div>;

const SheetHead = ({ title, sub }: { title: string; sub?: string }) => (
  <header className="mb-3 border-b-2 border-black pb-2">
    <p className="text-[9pt]">إدارة الحج والعمرة السورية — قسم شؤون المجموعات والتكتلات</p>
    <h1 className="text-[15pt] font-bold">{title}</h1>
    {sub && <p className="text-[10pt]">{sub}</p>}
  </header>
);

// ───────────────────────── Job descriptions ─────────────────────────

export function JobDescriptionsPage() {
  const { jobs } = useAdminRefs();
  const shown = jobs.filter((j) => !j.hidden);
  const [printing, setPrinting] = useState<JobDescription | "all" | null>(null);
  const print = (what: JobDescription | "all") => {
    setPrinting(what);
    setTimeout(() => window.print(), 50);
  };
  const sheet = printing === "all" ? shown : printing ? [printing] : [];
  return (
    <ReferencesShell title="التوصيف الوظيفي" description="لكل صفة في الموسم خلاصتها ومهامها كما تعتمدها الإدارة، والهيكل الذي تعمل فيه داخل التكتل. اطبع أي بطاقة، أو التوصيف كاملاً.">
      <OrgChart />
      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-2xl font-bold text-green-dark">الصفات ({shown.length})</h2>
        <Button variant="outline" onClick={() => print("all")}>
          <Printer className="size-4" /> طباعة التوصيف كاملاً
        </Button>
      </div>
      <div className="mt-5 grid gap-5 md:grid-cols-2">
        {shown.map((j, i) => (
          <motion.div key={j.key} initial={{ opacity: 0, y: 16 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: Math.min(i, 6) * 0.05 }}>
            <Card className="h-full">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-display text-xl font-bold text-green-dark">{j.name}</h3>
                  <p className="mt-1 flex flex-wrap gap-1.5 text-xs">
                    <span className="rounded-full bg-sand px-2.5 py-0.5 font-bold text-ink-soft">{j.level}</span>
                    {j.secondary && <span className="rounded-full bg-gold/25 px-2.5 py-0.5 font-bold text-maroon">صفة ثانوية في التكتل</span>}
                  </p>
                </div>
                <button type="button" onClick={() => print(j)} aria-label={`طباعة توصيف ${j.name}`} className="grid size-10 place-items-center rounded-xl text-ink-soft hover:bg-sand">
                  <Printer className="size-5" />
                </button>
              </div>
              <p className="mt-3 leading-8 text-ink-soft">{j.summary}</p>
              {j.duties.length > 0 && (
                <ul className="mt-3 space-y-1.5">
                  {j.duties.map((d) => (
                    <li key={d} className="flex gap-2 text-sm leading-7 text-ink">
                      <BadgeCheck className="mt-1 size-4 shrink-0 text-green-light" /> {d}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </motion.div>
        ))}
      </div>
      {sheet.length > 0 && (
        <PrintSheet>
          <SheetHead title="التوصيف الوظيفي" sub="موسم 1448هـ" />
          {sheet.map((j) => (
            <section key={j.key} className="mb-4 break-inside-avoid text-[11pt] leading-7">
              <h2 className="text-[13pt] font-bold">
                {j.name} — {j.level}
                {j.secondary ? " (صفة ثانوية)" : ""}
              </h2>
              <p>{j.summary}</p>
              <ul className="list-disc pr-5">
                {j.duties.map((d) => (
                  <li key={d}>{d}</li>
                ))}
              </ul>
            </section>
          ))}
        </PrintSheet>
      )}
    </ReferencesShell>
  );
}

/** The cluster's structure: its head and the posts around him, then the groups and their seats */
function OrgChart() {
  const comp = compositionOf(useStructure(), DEFAULT_TIER);
  const node = (title: string, sub: string, tone = "bg-sand") => (
    <div className={cn("rounded-2xl px-4 py-3 text-center ring-1 ring-gold/30", tone)}>
      <p className="font-bold text-ink">{title}</p>
      <p className="text-xs text-ink-soft">{sub}</p>
    </div>
  );
  return (
    <Card>
      <h2 className="font-display text-2xl font-bold text-green-dark">الهيكل التنظيمي للتكتل</h2>
      <div className="mt-6 grid justify-items-center gap-4">
        <div className="w-full max-w-xs">{node("رئيس التكتل", "صفة أساسية أو موسمية تمنحها الإدارة", "bg-gold/30")}</div>
        <div className="h-5 w-px bg-gold-dark/40" />
        <div className="grid w-full gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {node("نائب رئيس التكتل", "من رؤساء المجموعات")}
          {node("محاسب التكتل", "من كادر التكتل")}
          {node("المنسقون التقنيون", `منسق لكل ${comp.perCoordinator} وحدات`)}
          {node("الموجّهات الدينيات", `أ، ب، ج — واحدة لكل ${comp.perGuide} وحدات`)}
          {node("معاونو التكتل", `${comp.assistants} في الاقتصادي، ولكل مستوى عدده`)}
        </div>
        <div className="h-5 w-px bg-gold-dark/40" />
        <div className="w-full max-w-md">{node("رؤساء المجموعات", "لكل مجموعة فئة رئيسها: عدد حجاجها ومقاعد فريقها", "bg-green-light/15")}</div>
        <div className="h-5 w-px bg-gold-dark/40" />
        <div className="grid w-full max-w-lg gap-3 sm:grid-cols-3">
          {node("موجّه المجموعة", "موجّه ديني أ، ب، ج")}
          {node("معاون المجموعة", "معاون، أو معاون ومنسق تقني")}
          {node("مقعد حر", "موجّه أو معاون باختيار رئيس التكتل")}
        </div>
      </div>
    </Card>
  );
}

// ───────────────────────── The administrative system ─────────────────────────

export function SystemPage() {
  const { system } = useAdminRefs();
  const [printing, setPrinting] = useState(false);
  return (
    <ReferencesShell title="النظام الإداري" description="النظام الذي يعمل به كادر المجموعات والتكتلات لموسم 1448هـ، وتعدّله الإدارة بمقررات تُنشر في «المقررات الإدارية».">
      <div className="grid gap-8 lg:grid-cols-[18rem_1fr]">
        <aside className="lg:sticky lg:top-28 lg:self-start">
          <Card className="p-4">
            <p className="mb-2 flex items-center gap-2 font-bold text-green-dark">
              <ScrollText className="size-5 text-gold-dark" /> الأقسام
            </p>
            <ol className="space-y-1 text-sm">
              {system.map((s) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="block rounded-xl px-3 py-1.5 text-ink-soft hover:bg-sand hover:text-green-dark">
                    {s.title}
                  </a>
                </li>
              ))}
            </ol>
            <Button variant="outline" size="sm" className="mt-3 w-full" onClick={() => { setPrinting(true); setTimeout(() => window.print(), 50); }}>
              <Printer className="size-4" /> طباعة النظام
            </Button>
          </Card>
        </aside>
        <div className="space-y-6">
          {system.map((s) => (
            <Card key={s.id}>
              <section id={s.id} className="scroll-mt-28">
                <h2 className="font-display text-2xl font-bold text-green-dark">{s.title}</h2>
                <RefText body={s.body} className="mt-3" />
              </section>
            </Card>
          ))}
        </div>
      </div>
      {printing && (
        <PrintSheet>
          <SheetHead title="النظام الإداري" sub="موسم 1448هـ" />
          {system.map((s) => (
            <section key={s.id} className="mb-4 text-[11pt]">
              <h2 className="text-[13pt] font-bold">{s.title}</h2>
              <RefText body={s.body} className="text-black" />
            </section>
          ))}
        </PrintSheet>
      )}
    </ReferencesShell>
  );
}

// ───────────────────────── Decisions and contracts ─────────────────────────

function FileList({ items, icon: Icon, line }: { items: (Decision | ContractForm)[]; icon: typeof FileText; line: (x: Decision | ContractForm) => string }) {
  const [printing, setPrinting] = useState<Decision | ContractForm | null>(null);
  return (
    <>
      <div className="grid gap-5 md:grid-cols-2">
        {items.map((x) => (
          <Card key={x.id}>
            <div className="flex items-start gap-4">
              <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-sand text-gold-dark">
                <Icon className="size-6" />
              </span>
              <div className="min-w-0 flex-1">
                <h3 className="font-display text-lg font-bold text-green-dark">{x.title}</h3>
                <p className="text-sm font-bold text-maroon">{line(x)}</p>
                <p className="mt-2 leading-7 text-ink-soft">{x.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="outline" onClick={() => { setPrinting(x); setTimeout(() => window.print(), 50); }}>
                    <Printer className="size-4" /> عرض وطباعة
                  </Button>
                  <span className="text-xs text-hint">📎 {x.file}</span>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>
      {printing && (
        <PrintSheet>
          <SheetHead title={printing.title} sub={line(printing)} />
          <p className="text-[11pt] leading-8">{printing.desc}</p>
          <p className="mt-6 text-[9pt]">النسخة المعتمدة: {printing.file}</p>
        </PrintSheet>
      )}
    </>
  );
}

export function DecisionsPage() {
  const { decisions } = useAdminRefs();
  return (
    <ReferencesShell title="المقررات الإدارية" description="كتب المقررات التي تصدرها الإدارة لكل موسم، وبها يُعدَّل النظام الإداري ومواعيده وأرقامه.">
      <FileList items={decisions} icon={FileText} line={(x) => ("year" in x ? `موسم ${x.year}هـ` : "")} />
    </ReferencesShell>
  );
}

export function ContractsPage() {
  const { contracts } = useAdminRefs();
  return (
    <ReferencesShell title="العقود" description="نماذج العقود والتعهدات المعتمدة: عقد الحاج مع مجموعته، وتكليف الإداري، وتعهد رئيس التكتل، وعقود خدمات التكتل.">
      <FileList items={contracts} icon={FileSignature} line={(x) => ("party" in x ? `طرفاه: ${x.party}` : "")} />
    </ReferencesShell>
  );
}

// ───────────────────────── Operational plans ─────────────────────────

const PLAN_PARTS = [
  ["السكن", "فنادق مكة والمدينة ومسافاتها، وتوزيع المجموعات عليها، والسكن في المشاعر."],
  ["النقل", "النقل من المطار وإليه، وبين المدن والمشاعر، ومواعيده ونقاط التجمّع."],
  ["الإعاشة", "الوجبات ومواعيدها ومقدّمها، والوجبات الخاصة للمرضى وكبار السن."],
  ["التفويج", "رحلات الذهاب والعودة لكل مجموعة، ومن يرافق كل فوج."],
  ["مراحل العمل", "توزيع الكادر على المراحل: قبل السفر، المدينة، مكة، المشاعر، العودة."],
  ["الطوارئ", "خطة الحالات الصحية والمفقودين، والتنسيق مع العيادات ونقاط الإرشاد."],
] as const;

export function PlansPage() {
  const plans = Object.values(useStore((s) => s.plans));
  const accepted = plans.filter((p) => p.status === "accepted").length;
  return (
    <ReferencesShell title="الخطط التشغيلية" description="يقدّم رئيس كل تكتل معتمد خطة تكتله التشغيلية من حسابه، فتقبلها الإدارة أو تعيدها بملاحظات يصلحها ويعيد تقديمها.">
      <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
        <Card>
          <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
            <ClipboardList className="size-6 text-gold-dark" /> ما تتضمنه الخطة
          </h2>
          <ol className="mt-5 grid gap-3 sm:grid-cols-2">
            {PLAN_PARTS.map(([k, v], i) => (
              <li key={k} className="flex gap-3 rounded-2xl bg-sand/60 p-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-green-dark text-sm font-bold text-white">{i + 1}</span>
                <span>
                  <span className="block font-bold text-ink">{k}</span>
                  <span className="block text-sm leading-7 text-ink-soft">{v}</span>
                </span>
              </li>
            ))}
          </ol>
        </Card>
        <div className="space-y-4">
          <Card>
            <p className="text-sm text-ink-soft">خطط هذا الموسم</p>
            <p className="font-display text-4xl font-bold text-green-dark">{plans.length}</p>
            <p className="text-sm text-ink-soft">{accepted} منها مقبولة</p>
          </Card>
          <Card>
            <p className="font-bold text-ink">أنت رئيس تكتل؟</p>
            <p className="mt-1 text-sm leading-7 text-ink-soft">قدّم خطة تكتلك من «إدارة التكتل» في حسابك، بعد اعتماد التكتل.</p>
            <ButtonLink href="/administrator/clusters?tab=plan" className="mt-3 w-full">
              قدّم الخطة <ArrowLeft className="size-4" />
            </ButtonLink>
          </Card>
          <Link href="/administrator/system#s5" className="block text-sm font-bold text-green-dark underline">
            الخطط في النظام الإداري (القسم الخامس)
          </Link>
        </div>
      </div>
    </ReferencesShell>
  );
}
