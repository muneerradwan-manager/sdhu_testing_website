"use client";

import { Building2, FileCheck2, Languages, Sparkles } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { groupName } from "@/lib/groups";
import { matches } from "@/lib/ops";
import { cn, formatNumber, maskNationalId } from "@/lib/utils";
import { docState, resultOf } from "@/app/administrator/_lib/admin";
import { useDocTypes, useSkills } from "@/app/administrator/_lib/admin-rules";
import { roleLabel } from "../../_components/data";
import { fmtDateTime, useCan } from "../../_components/kit";
import { Chip, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory } from "../../_components/system";
import { Box, EditHeader, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, SettingsSection, Tag, Title } from "../../_components/wp";
import { useAdminsDesk, type AdminsDesk, type FileState, type Funnel } from "../desk";
import { PersonCadre } from "./cadre";
import { Help, Lead, NotFound, TitleCell, Views, useHrefWith, useOpenId, useView } from "./ui";

/**
 * «المتقدمون» — every applicant's permanent file, as a site's list: one table (those that fall short under
 * their own filter), each opening on its own screen with his documents and whether each is still valid, what
 * his role requires and his file lacks, his languages and skills. How many applied, role by role, is on the
 * file's summary (`FunnelTable` below). The exam itself is «إدارة الامتحانات»'s: its results are read here.
 */
export function ApplicantsTab() {
  const desk = useAdminsDesk();
  const id = useOpenId();
  if (id) return <FileScreen id={id} desk={desk} />;
  return (
    <div className="space-y-6">
      <Files desk={desk} />
      <RecordsBox system="admins" area="applicants" title="سجل المتقدمين وملفاتهم" />
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
 * sees them: every file in one table, those that fall short under their own filter (`?f=docs`, the summary's
 * link), each opening on its own screen (`?id=`).
 */
function Files({ desk }: { desk: AdminsDesk }) {
  const hrefWith = useHrefWith();
  const only = useView("f", ["all", "docs"] as const);
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(60);
  // The fee, the receipt and the exam result are «رسوم المتقدمين وإيصالاتهم ونتائج اختبارهم»
  const mayFiles = useCan()("admins.applicants-files.GET");
  const list = (only === "docs" ? desk.flaggedFiles : desk.files).filter((f) => matches(q, [f.row.name, f.row.id, roleLabel(f.row)]));

  return (
    <div className="space-y-4">
      <Views
        tabs
        param="f"
        value={only}
        label="الملفات المعروضة"
        items={[
          { key: "all", label: "كل الملفات", count: desk.files.length },
          { key: "docs", label: "ناقصة أو منتهية", count: desk.flaggedFiles.length },
        ]}
      />
      <Title>{only === "docs" ? "ملفات ناقصة أو منتهية" : "كل الملفات"}</Title>
      <Lead>{only === "docs" ? "من سدد الرسم وتنقصه وثيقة تطلبها صفته، أو انتهت صلاحية وثيقة في ملفه." : "كل من تقدّم هذا الموسم بوثائقه ورسمه وحاله. افتح الملف لتراه كاملاً."}</Lead>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-end">
        <SearchBox className="md:w-80" value={q} onChange={setQ} label="بحث في ملفات الإداريين" placeholder="اسم، أو آخر أرقام الرقم الوطني، أو صفة..." />
      </div>
      <ListTable head={["الإداري", "الصفة", "الوثائق", "الرسم", "الحالة"]}>
        {list.length === 0 && <EmptyRow cols={5}>{only === "docs" ? "كل من سدد الرسم ملفه مستوفٍ لما تطلبه صفته." : "لا ملفات بهذا البحث."}</EmptyRow>}
        {list.slice(0, shown).map((f) => {
          const href = hrefWith({ id: f.row.id });
          return (
            <tr key={f.row.id}>
              <TitleCell
                title={f.row.name}
                href={href}
                sub={<span dir="ltr">{maskNationalId(f.row.id)}</span>}
                actions={
                  <RowActions>
                    <RowLink href={href}>فتح الملف</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">{roleLabel(f.row)}</td>
              <td className="p-3 align-top tabular-nums text-white/80">{f.record.documents.length}</td>
              <td className="p-3 align-top">{!mayFiles ? <span className="text-white/30">—</span> : f.row.profile.feePaidAt ? <Tag tone="green">مسدَّد</Tag> : <Tag>لم يُسدَّد</Tag>}</td>
              <td className="p-3 align-top">
                <span className="flex flex-wrap gap-1">
                  {f.expired.length > 0 && <Tag tone="maroon">{f.expired.length} منتهية</Tag>}
                  {f.missing.length > 0 && <Tag tone="gold">ينقصه {f.missing.length}</Tag>}
                  {!f.expired.length && !f.missing.length && <Tag tone="green">مستوفٍ</Tag>}
                </span>
              </td>
            </tr>
          );
        })}
      </ListTable>
      {list.length > shown && (
        <Button size="sm" variant="glass" onClick={() => setShown(shown + 100)}>
          عرض المزيد ({list.length - shown})
        </Button>
      )}
      <Help>
        <p>يُدفع الرسم بعد ثبوت الأهلية فقط. «تأهّلوا»: من جدّدوا صفتهم معفين، ومن نجحوا في كل أقسام الاختبار المؤتمت وأكّد مشرف القاعة تسليمهم — وهم وحدهم من يشكّل مجموعة أو ينضم إلى فريق.</p>
        <p>الاختبار نفسه في «إدارة الامتحانات»: نتائجه تُقرأ هنا ولا تُدخل. وأعداد المتقدمين صفةً صفة في «ملخص الإداريين».</p>
      </Help>
    </div>
  );
}

/** One administrator's file on its own screen: where his application stands and his documents in the middle; his role, category and branches below; his record on the side */
function FileScreen({ id, desk }: { id: string; desk: AdminsDesk }) {
  const hrefWith = useHrefWith();
  const f = desk.files.find((x) => x.row.id === id);
  const back = hrefWith({ id: null });
  if (!f) return <NotFound back={back} backLabel="ملفات المتقدمين" what="هذا الملف" />;
  return (
    <div>
      <EditHeader back={back} backLabel="ملفات المتقدمين" title={`الملف الدائم — ${f.row.name}`}>
        {roleLabel(f.row)}
      </EditHeader>
      <EditLayout
        main={
          <>
            <FileSheet f={f} />
            <SettingsSection title="صفته الموسمية وفئته وفروعه">
              <div className="py-4">
                <PersonCadre id={f.row.id} name={f.row.name} applied={f.row.profile.positions[0]} history={false} area="applicants" />
              </div>
            </SettingsSection>
          </>
        }
        side={
          <>
            <Box title="حال الملف">
              {f.flagged ? <Tag tone="maroon">ينقصه ما تطلبه صفته</Tag> : <Tag tone="green">مستوفٍ لما تطلبه صفته</Tag>}
              <p className="text-xs leading-6 text-white/60">الحساب دائم، فتبقى وثائقه بين المواسم وتُرفق بطلبه ما دامت سارية؛ وما انتهى يحدّثه وحده من بوابته.</p>
            </Box>
            <Box title="سجلّه" open={false}>
              <RecordHistory system="admins" refId={f.row.id} bare />
            </Box>
          </>
        }
      />
    </div>
  );
}

/** One administrator's file: where his application stands, his documents and their validity, his languages and skills */
function FileSheet({ f }: { f: FileState }) {
  const { validity } = useDocTypes();
  const { all: skills } = useSkills();
  const p = f.row.profile;
  const res = resultOf(p);
  const mayFiles = useCan()("admins.applicants-files.GET");
  const hidden = "مخفي — يحتاج صلاحية «رسوم المتقدمين وإيصالاتهم ونتائج اختبارهم»";
  const oral = !res.written ? "" : res.oral?.status === "passed" ? ` — ناجح في الشفهي${res.oral.score !== undefined ? ` (${res.oral.score}%)` : ""}` : res.oral?.status === "failed" ? " — راسب في الشفهي" : res.oral?.status === "absent" ? " — غائب عن الشفهي" : res.oral ? " — الشفهي محجوز" : " — بقي الشفهي"
  const result = res.exempt ? "معفى بالتجديد في صفته" : res.confirmed ? `${res.score ?? "—"}% — ${res.written ? "ناجح في كل الأقسام" : "لم يجتز كل الأقسام"}${res.published ? "" : " (لم تُعرض عليه)"}${oral}` : res.parts.some((x) => x.status === "submitted") ? "سلّم — بانتظار تأكيد المشرف" : res.parts.some((x) => x.status === "unconfirmed") ? "غير مؤكَّد — بانتظار قرار الإدارة" : p.feePaidAt ? "لم يختبر بعد" : "";

  return (
    <div className="space-y-5">
      <InfoGrid
        rows={[
          ["الصفة", roleLabel(f.row)],
          ["الرقم الوطني", <span key="id" dir="ltr">{maskNationalId(f.row.id)}</span>],
          ["الأهلية", p.eligibleAt ? fmtDateTime(p.eligibleAt) : p.feePaidAt ? "ثبتت قبل الدفع" : "لم تثبت بعد"],
          ["رسم التسجيل", !mayFiles ? hidden : p.feePaidAt ? `${fmtDateTime(p.feePaidAt)}${p.receipt ? ` — ${p.receipt}` : ""}` : "لم يُسدَّد"],
          ["نتيجة التأهيل (من «إدارة الامتحانات»)", mayFiles ? result : hidden],
          ["المجموعة", p.group ? groupName(p.group.number) : ""],
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

      {p.cluster && (
        <p className="flex gap-2 rounded-2xl bg-white/[.06] p-3 text-sm leading-7 text-white/80 ring-1 ring-white/10">
          <Building2 className="mt-1 size-4 shrink-0 text-gold" />
          {p.cluster
            ? `شُكّل ${p.cluster.name} في المكتب برئاسته، فصارت صفته على مستوى التكتل ويدير ${Object.values(p.cluster.groups).filter((g) => g.status === "accepted").length} مجموعات.`
            : ""}
        </p>
      )}

    </div>
  );
}
