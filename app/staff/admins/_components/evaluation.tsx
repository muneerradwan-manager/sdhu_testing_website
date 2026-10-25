"use client";

import { AlertTriangle, EyeOff } from "lucide-react";
import { useMemo, useState } from "react";
import { matches } from "@/lib/ops";
import { cn } from "@/lib/utils";
import { useEvaluationStages } from "@/app/administrator/_lib/admin-rules";
import { REFLECTION, evaluationOf, useEvaluationOf, useEvaluationState } from "@/app/administrator/_lib/evaluation";
import { roleLabel } from "../../_components/data";
import { Meter } from "../../_components/kit";
import { SearchBox } from "../../_components/ops-ui";
import { Box, EditHeader, EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, NotFound, TitleCell, useHrefWith, useOpenId } from "./ui";
import { useAdminsDesk, type AdminsDesk } from "../desk";

type Filter = "all" | "pending" | "decided" | "none";

/**
 * «التقييم» — the season's evaluation of everyone the staff rate (the groups' heads, the clusters' heads and the
 * guides), as the administration reads it: his own and the staff's side by side, his objection, the committee's decision
 * and the adopted score. The administration does not rate and does not decide: the staff rate, anonymously, and the
 * evaluation committee decides the objections. Nobody here — nor anywhere — sees who rated.
 */
export function EvaluationTab() {
  const desk = useAdminsDesk();
  const id = useOpenId();
  const hrefWith = useHrefWith();
  const stages = useEvaluationStages();
  const state = useEvaluationState();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const results = useMemo(() => new Map(desk.toEvaluate.map((r) => [r.id, evaluationOf(r.id, stages, state)])), [desk.toEvaluate, stages, state]);
  if (id) return <EvaluationScreen id={id} desk={desk} />;
  const stateOf = (rid: string): Exclude<Filter, "all"> => {
    const r = results.get(rid)!;
    return !r.objection ? "none" : r.pending > 0 ? "pending" : "decided";
  };
  const shown = desk.toEvaluate.filter((r) => filter === "all" || stateOf(r.id) === filter).filter((r) => matches(q, [r.name, r.id, roleLabel(r)]));

  return (
    <div className="space-y-4">
      <Title>نتائج التقييم</Title>
      <Lead>من يقيّمه الموظفون هذا الموسم: تقييمه لنفسه بجانب تقييم الموظفين، واعتراضه إن اعترض، وقرار لجنة التقييم، والدرجة المعتمدة. للاطلاع فقط.</Lead>
      <p className="flex items-start gap-2 rounded-2xl bg-gold/10 p-3 text-sm leading-7 text-white/85 ring-1 ring-gold/30">
        <EyeOff className="mt-1 size-4 shrink-0 text-gold" /> هوية من قيّم سرّية عن الإدارة كما هي عن الإداري، ولا تعرفها إلا لجنة التقييم: ترى هنا كم قيّم وبكم، لا من.
      </p>
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <Filters
          label="الاعتراضات"
          value={filter}
          onChange={setFilter}
          items={[
            { key: "all", label: "الكل", count: desk.toEvaluate.length },
            { key: "pending", label: "عند اللجنة", count: desk.toEvaluate.filter((r) => stateOf(r.id) === "pending").length },
            { key: "decided", label: "قرّرتها اللجنة", count: desk.toEvaluate.filter((r) => stateOf(r.id) === "decided").length },
            { key: "none", label: "بلا اعتراض", count: desk.toEvaluate.filter((r) => stateOf(r.id) === "none").length },
          ]}
        />
        <SearchBox className="md:w-80" value={q} onChange={setQ} label="بحث في الإداريين" placeholder="اسم، أو آخر أرقام الرقم الوطني، أو صفة..." />
      </div>
      <ListTable head={["الإداري", "الصفة", "تقييمه لنفسه", "الموظفون", "الاعتراض", "الإيجابيات والسلبيات", "النهائية"]}>
        {shown.length === 0 && <EmptyRow cols={7}>{desk.toEvaluate.length ? "لا أحد هنا. غيّر البحث أو التصفية." : "يظهر هنا من يقيّمه الموظفون: رؤساء المجموعات والتكتلات والموجّهون."}</EmptyRow>}
        {shown.map((r) => {
          const res = results.get(r.id)!;
          const href = hrefWith({ id: r.id });
          const st = stateOf(r.id);
          return (
            <tr key={r.id}>
              <TitleCell
                title={r.name}
                href={href}
                actions={
                  <RowActions>
                    <RowLink href={href}>النتيجة</RowLink>
                  </RowActions>
                }
              />
              <td className="p-3 align-top text-white/80">{roleLabel(r)}</td>
              <td className="p-3 align-top tabular-nums text-white/85">{res.selfAvg ?? <span className="text-white/40">—</span>}</td>
              <td className="p-3 align-top tabular-nums">
                {res.staffAvg !== null ? (
                  <span className="font-bold text-gold">
                    {res.staffAvg} <span className="text-xs font-normal text-white/55">({res.staffCount})</span>
                  </span>
                ) : (
                  <span className="text-white/40">—</span>
                )}
              </td>
              <td className="p-3 align-top">{st === "none" ? <span className="text-white/40">—</span> : <Tag tone={st === "pending" ? "gold" : "green"}>{st === "pending" ? "عند اللجنة" : "قُرّر"}</Tag>}</td>
              <td className="p-3 align-top tabular-nums text-white/85">{res.points.length ? `${res.net >= 0 ? "+" : "−"}${Math.abs(res.net)} (${res.points.length})` : <span className="text-white/40">—</span>}</td>
              <td className="p-3 align-top font-bold tabular-nums text-gold">{res.finalized ? `${res.final100} من 100` : res.base100 !== null ? <span className="font-normal text-white/55">{res.base100} مبدئية</span> : <span className="font-normal text-white/40">—</span>}</td>
            </tr>
          );
        })}
      </ListTable>
      <Help>
        <p>يقيّم الإداريَّ موظفو البعثة الذين كانوا معه: موظفو فندق مكة مرحلة مكة، وفندق المدينة مرحلة المدينة، والمخيمات مرحلة المشاعر، ومشرفو الطيران مرحلتي المطار والسفر. وتقييم رئيس المجموعة تقييم لمجموعته، ورئيس التكتل لتكتله، فتدخل درجتاهما في تصنيف المجموعات والتكتلات.</p>
        <p>من لم يعترض تُعتمد درجة الموظفين. ومن اعترض قرّرت لجنة التقييم لكل مرحلة معترض عليها: درجته، أو درجة الموظفين، أو درجة ثالثة منها.</p>
      </Help>
    </div>
  );
}

/** One administrator's result on its own screen: read-only */
function EvaluationScreen({ id, desk }: { id: string; desk: AdminsDesk }) {
  const hrefWith = useHrefWith();
  const row = desk.toEvaluate.find((r) => r.id === id);
  const back = hrefWith({ id: null });
  if (!row) return <NotFound back={back} backLabel="نتائج التقييم" what="هذا الإداري" />;
  return (
    <div>
      <EditHeader back={back} backLabel="نتائج التقييم" title={`تقييم ${row.name}`}>
        {roleLabel(row)}
      </EditHeader>
      <Result id={row.id} />
    </div>
  );
}

function Result({ id }: { id: string }) {
  const r = useEvaluationOf(id);
  if (!r) return null;
  const label = (k: string) => r.stages.find((x) => x.key === k)?.label ?? k;
  const o = r.objection;
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
      <div className="min-w-0 space-y-5">
        <div className="grid grid-cols-2 gap-2 text-center sm:grid-cols-5">
          {[
            { k: "تقييمه لنفسه", v: r.selfAvg },
            { k: `الموظفون${r.staffCount ? ` (${r.staffCount})` : ""}`, v: r.staffAvg },
            { k: "المراحل (من 100)", v: r.base100 },
            { k: "صافي الإيجابيات والسلبيات", v: r.points.length ? `${r.net >= 0 ? "+" : "−"}${Math.abs(r.net)}` : "0" },
            { k: r.finalized ? "النهائية المعتمدة" : "النهائية (بانتظار اللجنة)", v: r.finalized ? r.final100 : null },
          ].map((x) => (
            <p key={x.k} className="rounded-xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <span className="block text-[11px] text-white/60">{x.k}</span>
              <span className="font-display text-3xl font-bold text-gold">{x.v ?? "—"}</span>
            </p>
          ))}
        </div>
        <div className="overflow-x-auto rounded-2xl ring-1 ring-white/10">
          <table className="w-full min-w-[34rem] text-sm">
            <thead className="bg-black/25 text-white/70">
              <tr>
                <th className="p-2.5 text-right">المرحلة</th>
                <th className="p-2.5">تقييمه لنفسه</th>
                <th className="p-2.5">الموظفون</th>
                <th className="p-2.5">الاعتراض</th>
                <th className="p-2.5">المعتمدة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10 text-white">
              {r.stages.map((x) => (
                <tr key={x.key} className={cn(x.gap && "bg-gold/10")}>
                  <td className="p-2.5 font-semibold">
                    {x.label}
                    {x.gap && <AlertTriangle className="ms-1 inline size-4 text-gold" aria-label="فرق نقطة أو أكثر" />}
                  </td>
                  <td className="p-2.5 text-center tabular-nums">{x.self ?? "—"}</td>
                  <td className="p-2.5 text-center tabular-nums">{x.staff ?? "—"}</td>
                  <td className="p-2.5 text-center text-xs">{!x.objected ? "—" : x.pending ? <Tag tone="gold">عند اللجنة</Tag> : <Tag tone="green">{x.decision!.pick === "self" ? "درجته" : x.decision!.pick === "staff" ? "درجة الموظفين" : "درجة اللجنة"}</Tag>}</td>
                  <td className="p-2.5 text-center font-bold tabular-nums text-gold">{x.final ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {o && (
          <div className="rounded-2xl bg-maroon/30 p-4 text-sm text-white ring-1 ring-gold/40">
            <p className="font-bold text-gold">اعترض على تقييم الموظفين في: {o.stages.map(label).join("، ")}</p>
            <p className="mt-1 leading-7 text-white/85">{o.reason}</p>
            <p className="mt-2 text-xs text-white/60">{o.evidence?.length ? `بأدلة: ${o.evidence.length}.` : "بلا أدلة."} {Object.keys(o.replies ?? {}).length ? `رد ${Object.keys(o.replies!).length} من المقيّمين.` : "لم يردّ أحد من المقيّمين بعد."} القرار للجنة التقييم.</p>
          </div>
        )}
      </div>
      <div className="space-y-4">
        <Box title="مراحل الموسم">
          <ul className="space-y-1.5 text-xs text-white/75">
            {r.stages.map((x) => (
              <li key={x.key} className="flex items-center justify-between gap-2">
                <span className="truncate">{x.label}</span>
                <Meter value={x.final ?? 0} max={5} tone={x.final === null ? "gold" : "teal"} className="w-16" />
              </li>
            ))}
          </ul>
        </Box>
        {r.self?.submittedAt && REFLECTION.some((q) => r.self!.answers?.[q.key]) && (
          <Box title="خلاصة موسمه بكلماته" open={false}>
            {REFLECTION.filter((q) => r.self!.answers?.[q.key]).map((q) => (
              <p key={q.key} className="rounded-lg bg-white/[.06] p-2 text-xs leading-6">
                <b className="block text-white">{q.label}</b>
                {r.self!.answers![q.key]}
              </p>
            ))}
          </Box>
        )}
      </div>
    </div>
  );
}

/** How far each stage's evaluation has gone, among those the staff rate */
export function StageCoverage({ coverage }: { coverage: AdminsDesk["coverage"] }) {
  return (
    <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
      {coverage.map((c, i) => (
        <li key={c.stage.key} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
          <p className="flex items-center justify-between gap-2 text-sm">
            <span className="flex min-w-0 items-center gap-2 font-bold text-white">
              <span className="grid size-6 shrink-0 place-items-center rounded-lg bg-white/10 text-xs text-gold">{i + 1}</span>
              <span className="truncate">{c.stage.label}</span>
            </span>
            <span className="shrink-0 tabular-nums text-white/70">
              {c.done} من {c.total}
            </span>
          </p>
          <Meter value={c.done} max={c.total || 1} tone={c.total && c.done === c.total ? "teal" : "gold"} className="mt-2" />
        </li>
      ))}
    </ul>
  );
}
