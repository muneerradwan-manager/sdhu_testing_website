"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { Building2, FileCheck2, FolderLock, Funnel as FunnelIcon, Languages, Sparkles, UsersRound } from "lucide-react";
import { useState } from "react";
import { matches } from "@/lib/ops";
import { cn, formatNumber, maskNationalId } from "@/lib/utils";
import { docState, resultOf } from "@/app/administrator/_lib/admin";
import { useDocTypes, useExamRules, useSkills } from "@/app/administrator/_lib/admin-rules";
import { clusterGroupsOf } from "@/app/administrator/_lib/cluster";
import { roleLabel } from "../../_components/data";
import { Drawer, Empty, fmtDateTime, Panel } from "../../_components/kit";
import { Chip, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { useAdminsDesk, type AdminsDesk, type FileState, type Funnel } from "../desk";

/**
 * Who applied this season and how far each got, role by role — from the choice of a role to the
 * qualification the exam file announces — and every applicant's permanent file: his documents and whether
 * each is still valid, what his role requires and his file lacks, his languages and skills. The exam
 * itself is «إدارة الامتحانات»'s: its results are read here, never entered.
 */
export function ApplicantsTab() {
  const desk = useAdminsDesk();
  return (
    <div className="space-y-6">
      <Panel icon={<FunnelIcon />} title="المتقدمون صفةً صفة" action={<Chip tone="gold">{formatNumber(desk.totals.applied)} متقدماً</Chip>} bodyClass="-mx-5 md:-mx-6">
        <FunnelTable funnel={desk.funnel} totals={desk.totals} />
        <p className="mt-3 px-5 text-xs leading-6 text-white/55 md:px-6">
          {desk.noRole ? `و${desk.noRole} حسابات إدارية لم تختر صفة بعد. ` : ""}يُدفع الرسم بعد ثبوت الأهلية فقط. «تأهّلوا»: من جدّدوا صفتهم معفين، ومن نجحوا وأعلنت «إدارة الامتحانات» نتيجتهم — وهم وحدهم من يشكّل مجموعة أو ينضم إلى فريق.
        </p>
      </Panel>
      <Files desk={desk} />
      <SystemRecords system="admins" area="applicants" title="سجل المتقدمين وملفاتهم" />
    </div>
  );
}

const COLUMNS: [keyof Omit<Funnel, "role" | "label" | "open">, string][] = [
  ["applied", "تقدّموا"],
  ["eligible", "ثبتت أهليتهم"],
  ["paid", "سددوا الرسم"],
  ["exempt", "معفون بالتجديد"],
  ["sitting", "يُمتحنون"],
  ["passed", "نجحوا"],
  ["qualified", "تأهّلوا"],
];

/** The season's applicants, a row per role and a column per step, with the totals under them */
export function FunnelTable({ funnel, totals }: { funnel: Funnel[]; totals: Record<(typeof COLUMNS)[number][0], number> }) {
  return (
    <div className="overflow-x-auto px-5 md:px-6">
      <table className="w-full min-w-[42rem] text-sm">
        <thead>
          <tr className="border-b border-white/10 text-right text-xs text-gold">
            <th className="pb-2 font-bold">الصفة</th>
            {COLUMNS.map(([, h]) => (
              <th key={h} className="pb-2 font-bold">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-white/10">
          {funnel.map((f) => (
            <tr key={f.role} className={f.open ? "text-white" : "text-white/50"}>
              <td className="py-2.5 font-bold">
                {f.label} {!f.open && <Chip tone="maroon">مغلقة</Chip>}
              </td>
              {COLUMNS.map(([k]) => (
                <td key={k} className={cn("py-2.5 tabular-nums", k === "qualified" && f[k] > 0 && "font-bold text-green-light")}>
                  {formatNumber(f[k])}
                </td>
              ))}
            </tr>
          ))}
          <tr className="font-bold text-gold">
            <td className="py-2.5">المجموع</td>
            {COLUMNS.map(([k]) => (
              <td key={k} className="py-2.5 tabular-nums">
                {formatNumber(totals[k])}
              </td>
            ))}
          </tr>
        </tbody>
      </table>
    </div>
  );
}

// ───────────────────────── The permanent files ─────────────────────────

/**
 * The administrator is told his documents are reviewed by the administrators' affairs desk, so the desk
 * sees them: every file with its documents, their issuing season and whether each is still valid under
 * this season's lists, and what his role requires that the file does not have. Opened from the summary
 * on the files that fall short (`?f=docs`).
 */
function Files({ desk }: { desk: AdminsDesk }) {
  const params = useSearchParams();
  const [only, setOnly] = useState(params.get("f") === "docs");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const shown = (only ? desk.flaggedFiles : desk.files).filter((f) => matches(q, [f.row.name, f.row.id, roleLabel(f.row)]));
  const file = desk.files.find((f) => f.row.id === open);

  return (
    <Panel icon={<FolderLock />} title="الملفات الدائمة" bodyClass="space-y-3">
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox className="md:w-80" value={q} onChange={setQ} label="بحث في ملفات الإداريين" placeholder="اسم، أو آخر أرقام الرقم الوطني، أو صفة..." />
        <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="الملفات المعروضة">
          {[
            { on: !only, label: `الكل (${desk.files.length})`, set: false },
            { on: only, label: `ناقصة أو منتهية (${desk.flaggedFiles.length})`, set: true },
          ].map((b) => (
            <button
              key={String(b.set)}
              type="button"
              role="radio"
              aria-checked={b.on}
              onClick={() => setOnly(b.set)}
              className={cn("rounded-full px-3 py-1.5 text-xs font-bold ring-1 transition", b.on ? "bg-gold text-ink ring-gold" : "bg-white/[.06] text-white/85 ring-white/15 hover:bg-white/10")}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>
      {shown.length === 0 ? (
        <Empty icon={<UsersRound />} title="لا ملفات هنا" text={only ? "كل من سدد الرسم ملفه مستوفٍ لما تطلبه صفته." : "غيّر البحث أو امسحه."} />
      ) : (
        <ul className="grid gap-2 lg:grid-cols-2">
          {shown.map((f, i) => (
            <motion.li key={f.row.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: Math.min(i, 12) * 0.03 }}>
              <button
                type="button"
                onClick={() => setOpen(f.row.id)}
                className={cn("flex w-full flex-wrap items-center gap-3 rounded-2xl p-3 text-right ring-1 transition hover:ring-gold/50", f.flagged ? "bg-maroon/15 ring-maroon/40" : "bg-white/[.06] ring-white/10")}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gold/20 font-display font-bold text-gold ring-1 ring-gold/40">{f.row.name.replace("الشيخ ", "")[0]}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-bold text-white">{f.row.name}</span>
                  <span className="block truncate text-xs text-white/65">
                    {roleLabel(f.row)} · <span dir="ltr">{maskNationalId(f.row.id)}</span>
                  </span>
                </span>
                <span className="flex flex-wrap gap-1.5">
                  <Chip>{f.record.documents.length} وثائق</Chip>
                  {f.expired.length > 0 && <Chip tone="maroon">{f.expired.length} منتهية</Chip>}
                  {f.missing.length > 0 && <Chip tone="gold">ينقصه {f.missing.length}</Chip>}
                </span>
              </button>
            </motion.li>
          ))}
        </ul>
      )}
      <Drawer open={!!file} onClose={() => setOpen(null)} title={file ? `الملف الدائم — ${file.row.name}` : ""}>
        {file && <FileSheet f={file} />}
      </Drawer>
    </Panel>
  );
}

/** One administrator's file: where his application stands, his documents and their validity, his languages and skills */
function FileSheet({ f }: { f: FileState }) {
  const rules = useExamRules();
  const { validity } = useDocTypes();
  const { all: skills } = useSkills();
  const p = f.row.profile;
  const res = resultOf(p, rules);
  const result = res.exempt ? "معفى بالتجديد في صفته" : res.final !== undefined ? `${res.final} من 100 — ${res.passed ? "ناجح" : "لم يجتز"}${res.published ? "" : " (لم تُعلن)"}` : p.exam?.submittedAt ? "قيد التصحيح" : p.feePaidAt ? "لم يُمتحن بعد" : "";

  return (
    <div className="space-y-5">
      <InfoGrid
        rows={[
          ["الصفة", roleLabel(f.row)],
          ["الرقم الوطني", <span key="id" dir="ltr">{maskNationalId(f.row.id)}</span>],
          ["الأهلية", p.eligibleAt ? fmtDateTime(p.eligibleAt) : p.feePaidAt ? "ثبتت قبل الدفع" : "لم تثبت بعد"],
          ["رسم التسجيل", p.feePaidAt ? `${fmtDateTime(p.feePaidAt)}${p.receipt ? ` — ${p.receipt}` : ""}` : "لم يُسدَّد"],
          ["نتيجة التأهيل (من «إدارة الامتحانات»)", result],
          ["المجموعة", p.group ? `المجموعة ${p.group.number}` : ""],
        ]}
      />

      <div>
        <p className="mb-2 flex items-center justify-between gap-2 text-sm font-bold text-white">
          الوثائق والشهادات
          <Chip tone={f.expired.length ? "maroon" : "green"}>{f.expired.length ? `${f.expired.length} منتهية` : "كلها سارية"}</Chip>
        </p>
        <ul className="space-y-2">
          {f.record.documents.length === 0 && <li className="rounded-2xl bg-white/5 p-4 text-sm text-white/60">لا وثائق في ملفه بعد.</li>}
          {f.record.documents.map((d) => {
            const st = docState(d, undefined, validity);
            return (
              <li key={d.id} className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1", st.ok ? "bg-white/5 ring-white/10" : "bg-maroon/20 ring-maroon/40")}>
                <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl", st.ok ? "bg-green-light/20 text-green-light" : "bg-maroon/40 text-white")}>
                  <FileCheck2 className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2 font-bold text-white">
                    {d.label}
                    {d.key === "custom" && <Chip tone="gold">أضافها بنفسه</Chip>}
                  </span>
                  <span className="block text-xs text-white/60">
                    <span dir="ltr" className="font-mono">
                      {d.file}
                    </span>{" "}
                    — نسخة موسم {d.issuedSeason}
                  </span>
                </span>
                <Chip tone={st.ok ? "green" : "maroon"}>{st.text}</Chip>
              </li>
            );
          })}
        </ul>
        {f.missing.length > 0 && <p className="mt-3 rounded-2xl bg-gold/15 p-3 text-sm text-gold ring-1 ring-gold/30">ينقص ملفه مما تطلبه صفته: {f.missing.map((d) => d.label).join("، ")}</p>}
        <p className="mt-2 text-xs leading-6 text-white/55">الحساب دائم، فتبقى وثائقه بين المواسم وتُرفق بطلبه ما دامت سارية؛ وما انتهى يحدّثه وحده من بوابته.</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
            <Languages className="size-4 text-gold" /> اللغات
          </p>
          <div className="flex flex-wrap gap-2">
            {f.record.languages.length === 0 && <span className="text-sm text-white/60">لم يسجّل لغات.</span>}
            {f.record.languages.map((l) => (
              <Chip key={l} tone="green">
                {l}
              </Chip>
            ))}
          </div>
        </div>
        <div>
          <p className="mb-2 flex items-center gap-1.5 text-sm font-bold text-white">
            <Sparkles className="size-4 text-gold" /> المهارات
          </p>
          <div className="flex flex-wrap gap-2">
            {f.record.skills.length === 0 && <span className="text-sm text-white/60">لم يسجّل مهارات.</span>}
            {f.record.skills.map((k) => (
              <Chip key={k} tone="gold">
                {skills.find((x) => x.key === k)?.label ?? k}
              </Chip>
            ))}
          </div>
        </div>
      </div>

      {(p.cluster || p.deputyOf) && (
        <p className="flex gap-2 rounded-2xl bg-white/[.06] p-3 text-sm leading-7 text-white/80 ring-1 ring-white/10">
          <Building2 className="mt-1 size-4 shrink-0 text-gold" />
          {p.cluster
            ? `انتخبه رؤساء المجموعات رئيساً لـ${p.cluster.name}، فصارت صفته على مستوى التكتل ويدير ${clusterGroupsOf(p, f.row.name).length} مجموعات، ومعاونه ${p.cluster.deputyName ?? "لم يُختر"}.`
            : `اختاره رئيس ${p.deputyOf!.clusterName} ${p.deputyOf!.headName} معاوناً له، فصارت صفته على مستوى التكتل.`}
        </p>
      )}

      <RecordHistory system="admins" refId={f.row.id} />
    </div>
  );
}
