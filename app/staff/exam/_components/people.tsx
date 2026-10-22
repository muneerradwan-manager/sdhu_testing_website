"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle, ArrowLeftRight, RotateCcw } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { EXAM_KINDS, type ExamCenter, type ExamDef } from "@/lib/data/admin-exam";
import { matches } from "@/lib/ops";
import { dayTimeLabel } from "@/lib/operations";
import { getPerson } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { APPLIED_ROLES, paperOf, statusOf } from "@/app/administrator/_lib/admin";
import { ATTEMPT_LABEL, STAGE_LABEL, barcodeOf, hallActions, roleLabelOf, stageOf, useHalls, type HallStage } from "@/app/administrator/_lib/halls";
import type { AdminRow } from "../../_components/data";
import { Drawer, logAs, useCan, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { STANDING, useExamDesk } from "./desk";
import { RecordHistory, Records } from "./records";
import { examRolesOfRow } from "./sittings";
import { ATTEMPT_TONE, Chip, Segments, downloadCsv, pct, selectClass } from "./ui";

/** One test an applicant sits: his hall, the sitting he is at (or sat in), and whether he still has it to sit */
type Entry = {
  key: string;
  row: AdminRow;
  role: string;
  center?: ExamCenter;
  moved: boolean;
  sitting?: { exam?: ExamDef; center?: ExamCenter; stage?: HallStage };
  /** Has a sitting to go to, or sat in one */
  assigned: boolean;
  /** Not sent yet: he can still be moved to another hall */
  pending: boolean;
};

type Assigned = "all" | "none" | "some";

/**
 * The applicants as a list: everyone who sits a test this season (one line per test for whoever sits two), his
 * role, his hall and his sitting. Each sits in his registry governorate's hall unless moved: one is moved from his
 * sheet, many by ticking them and choosing the hall above the list. His barcode and attempt are in his sheet.
 */
export function People() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const halls = useHalls();
  const may = useCan();
  const canMove = may("exams.applicants.move");
  // National ids and barcodes are personal: shown and exported only with their own permission
  const seePii = may("exams.applicants-pii.GET");
  const [center, setCenter] = useState(params.get("c") ?? "");
  const [role, setRole] = useState("");
  const [assigned, setAssigned] = useState<Assigned>("all");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [to, setTo] = useState("");
  const [open, setOpen] = useState<string | null>(null);

  // Whoever sits a test this season, and whoever already has a paper of one
  const sits = (r: AdminRow) => !!r.profile.eligibleAt && !!r.profile.feePaidAt && !r.profile.examExempt;
  const entries: Entry[] = desk.rows.flatMap((r) =>
    examRolesOfRow(r)
      .filter((roleKey) => sits(r) || !!paperOf(r.profile, roleKey))
      .map((roleKey) => {
        const paper = paperOf(r.profile, roleKey);
        const pending = !paper?.submittedAt;
        const here = halls.centerOf(r.id);
        const [examId, centerId] = (paper?.hall ?? "").split("@");
        const s = paper?.hall ? undefined : here ? halls.sittingOf(r.id, roleKey) : undefined;
        const run = paper?.hall ? halls.runs[paper.hall] : undefined;
        const sitting = paper?.hall ? { exam: halls.examById(examId), center: halls.centerById(centerId), stage: run ? stageOf(run) : ("closed" as const) } : s ? { exam: s.exam, center: here, stage: s.stage } : undefined;
        return {
          key: `${r.id}:${roleKey}`,
          row: r,
          role: roleKey,
          center: pending ? here : (halls.centerById(centerId) ?? here),
          moved: pending && !!here && halls.moved[r.id] === here.id,
          sitting,
          assigned: !!paper || (!!s && s.stage !== "closed"),
          pending,
        } satisfies Entry;
      }),
  );

  const exempt = desk.rows.filter((r) => r.profile.examExempt && !examRolesOfRow(r).some((x) => paperOf(r.profile, x))).length;
  const list = entries
    .filter((a) => !center || (center === "none" ? !a.center : a.center?.id === center))
    .filter((a) => !role || a.role === role)
    .filter((a) => assigned === "all" || (assigned === "some") === a.assigned)
    .filter((a) => matches(q, [a.row.name, seePii ? a.row.id : undefined, getPerson(a.row.id)?.governorate]))
    .sort((x, y) => Number(!!x.center) - Number(!!y.center) || (x.center?.name ?? "").localeCompare(y.center?.name ?? "", "ar") || x.row.name.localeCompare(y.row.name, "ar"));
  const movable = list.filter((a) => a.pending);
  const shownIds = [...new Set(movable.map((a) => a.row.id))];
  const allPicked = shownIds.length > 0 && shownIds.every((id) => picked.includes(id));
  const inCenter = (id: string) => entries.filter((a) => a.center?.id === id).length;
  const noCenter = entries.filter((a) => !a.center).length;
  const current = entries.find((a) => a.key === open);

  const move = (ids: string[], centerId: string | undefined) => {
    if (!ids.length) return;
    const target = halls.centerById(centerId);
    hallActions.move(ids, centerId);
    const one = ids.length === 1 ? desk.rows.find((r) => r.id === ids[0]) : undefined;
    logAs(user, {
      action: centerId ? (one ? "نقل متقدم إلى قاعة" : "نقل متقدمين إلى قاعة") : one ? "إعادة متقدم إلى قاعة محافظته" : "إعادة متقدمين إلى قاعات محافظاتهم",
      target: one ? one.name : `${ids.length} متقدمين`,
      before: one ? (halls.centerOf(one.id)?.name ?? "بلا قاعة") : undefined,
      after: target?.name ?? (one ? (halls.autoCenterOf(one.id)?.name ?? "بلا قاعة") : "قاعات محافظاتهم"),
      detail: one
        ? undefined
        : desk.rows
            .filter((r) => ids.includes(r.id))
            .map((r) => r.name)
            .slice(0, 6)
            .join("، ") + (ids.length > 6 ? "…" : ""),
      system: "exams",
      area: "people",
      ref: one?.id,
    });
    toast({ title: target ? `${one ? one.name.split(" ")[0] : `${ids.length} متقدمين`} إلى ${target.name}` : "أُعيدوا إلى قاعات محافظاتهم", body: "يرى كل منهم قاعته وموعده في بوابته.", tone: "success", icon: "🏛️" });
    setPicked([]);
    setTo("");
  };

  /** Everyone who sits a test, past or to come: where, which test, his barcode for check-in, and whether he came */
  const attendance = () => {
    logAs(user, { action: "تصدير المتقدمين والحضور", target: `${entries.length} متقدماً`, detail: seePii ? "بالأرقام الوطنية والباركود" : "بلا الأرقام الوطنية والباركود", system: "exams", area: "people" });
    downloadCsv("المتقدمون-والحضور-1448.csv", [
      ["الاسم", ...(seePii ? ["الرقم الوطني", "الباركود"] : []), "المحافظة", "الصفة", "القاعة", "الاختبار", "الموعد", "حال الجلسة", "الحال"],
      ...entries.map((a) => [
        a.row.name,
        ...(seePii ? [a.row.id, barcodeOf(a.row.id)] : []),
        getPerson(a.row.id)?.governorate,
        roleLabelOf(a.role),
        a.center?.name,
        a.sitting?.exam?.name,
        a.sitting?.exam ? dayTimeLabel(a.sitting.exam.day, a.sitting.exam.time) : "",
        a.sitting?.stage ? STAGE_LABEL[a.sitting.stage] : "",
        STANDING[desk.standings.get(a.row.id) ?? "waiting"].label,
      ]),
    ]);
  };

  return (
    <div className="space-y-5">
      <Title
        action={
          may("exams.applicants.export") && (
            <span className="text-sm font-bold">
              <RowLink onClick={attendance}>تصدير Excel</RowLink>
            </span>
          )
        }
      />
      {noCenter > 0 && center !== "none" && (
        <button type="button" onClick={() => setCenter("none")} className="flex w-full items-center gap-2 rounded-2xl bg-maroon/25 p-3 text-right text-sm font-bold text-white ring-1 ring-maroon/50 hover:bg-maroon/35">
          <AlertTriangle className="size-4 shrink-0 text-gold" /> {noCenter} متقدمين بلا قاعة — اعرضهم لإسنادهم
        </button>
      )}
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} label="بحث في المتقدمين" placeholder="اسم، رقم وطني، محافظة..." />
        <FilterSelect label="القاعة" all="كل القاعات" value={center} onChange={setCenter} options={[{ value: "none", label: `بلا قاعة (${noCenter})` }, ...halls.centers.map((c) => ({ value: c.id, label: `${c.name} (${inCenter(c.id)})` }))]} />
        <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={APPLIED_ROLES.map((r) => ({ value: r.key, label: r.label }))} />
      </div>
      <Segments
        label="الإسناد إلى جلسة"
        value={assigned}
        onChange={setAssigned}
        items={[
          { value: "all", label: "الكل", count: entries.length },
          { value: "none", label: "غير مُسند لجلسة", count: entries.filter((a) => !a.assigned).length, tone: "maroon" },
          { value: "some", label: "مُسند لجلسة", count: entries.filter((a) => a.assigned).length },
        ]}
      />

      {/* Bulk actions, as a site's list has them: tick the lines, then choose what to do with them */}
      {canMove && (
      <div className="flex flex-wrap items-center gap-2 rounded-2xl bg-white/[.04] p-2 ring-1 ring-white/10">
        <span className="px-2 text-sm font-bold text-white/80">{picked.length ? `${picked.length} محددون:` : "مع المحددين:"}</span>
        <span className="w-56 max-w-full">
          <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="القاعة التي يُنقلون إليها" disabled={!picked.length}>
            <option value="">— اختر القاعة —</option>
            {halls.live.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </span>
        <Button size="sm" variant="gold" disabled={!picked.length || !to} onClick={() => move(picked, to)}>
          <ArrowLeftRight className="size-4" /> نقل إليها
        </Button>
        <Button size="sm" variant="glass" disabled={!picked.length} onClick={() => move(picked, undefined)}>
          <RotateCcw className="size-4" /> إعادتهم إلى قاعات محافظاتهم
        </Button>
        {picked.length > 0 && (
          <button type="button" className="ms-auto px-2 text-xs font-bold text-white/60 hover:text-white" onClick={() => setPicked([])}>
            إلغاء التحديد
          </button>
        )}
      </div>
      )}

      <ListTable
        head={[
          <input key="all" type="checkbox" checked={allPicked} disabled={!shownIds.length} onChange={() => setPicked(allPicked ? picked.filter((id) => !shownIds.includes(id)) : [...new Set([...picked, ...shownIds])])} className="size-4 accent-[#D9C89E]" aria-label="تحديد من لم يختبر بعد من الظاهرين" />,
          "المتقدم",
          "الصفة",
          "القاعة",
          "الجلسة",
          "الحال",
        ]}
        minWidth="54rem"
      >
        {list.length === 0 && <EmptyRow cols={6}>{entries.length ? "لا أحد يطابق هذا البحث. امسح البحث أو غيّر التصفية." : "لا متقدمين للاختبار: يظهر هنا كل من دفع رسم التسجيل ولم يُعفَ منه."}</EmptyRow>}
        {list.map((a) => {
          const on = picked.includes(a.row.id);
          const s = a.sitting;
          const standing = STANDING[desk.standings.get(a.row.id) ?? "waiting"];
          return (
            <tr key={a.key} className={cn("align-top", on && "bg-gold/10")}>
              <td className="w-10 p-3">
                {a.pending && canMove && <input type="checkbox" checked={on} onChange={() => setPicked(on ? picked.filter((x) => x !== a.row.id) : [...picked, a.row.id])} className="size-4 accent-[#D9C89E]" aria-label={`تحديد ${a.row.name}`} />}
              </td>
              <td className="p-3">
                <button type="button" onClick={() => setOpen(a.key)} className="text-right font-bold text-white hover:text-gold">
                  {a.row.name}
                </button>
                {seePii && (
                  <p className="text-xs text-white/55" dir="ltr">
                    {a.row.id}
                  </p>
                )}
                <RowActions>
                  <RowLink onClick={() => setOpen(a.key)}>{a.pending && canMove ? "التفاصيل والنقل" : "التفاصيل"}</RowLink>
                </RowActions>
              </td>
              <td className="p-3 text-white/80">{roleLabelOf(a.role)}</td>
              <td className="p-3">
                {a.center ? a.center.name : <Tag tone="maroon">بلا قاعة</Tag>}
                {a.moved && (
                  <span className="ms-1">
                    <Tag tone="gold">منقول</Tag>
                  </span>
                )}
              </td>
              <td className="p-3">
                {!a.center ? (
                  <span className="text-white/45">—</span>
                ) : !s?.exam ? (
                  <Tag tone="maroon">{a.pending ? `لا اختبار له في ${a.center.name}` : "أدّاه قبل القاعات"}</Tag>
                ) : a.pending && s.stage === "closed" ? (
                  <Tag tone="maroon">غاب عن {s.exam.name}</Tag>
                ) : (
                  <Tag tone={s.stage === "running" || s.stage === "open" ? "gold" : "muted"}>
                    {s.exam.kind === "makeup" ? `${EXAM_KINDS.makeup} — ` : ""}
                    {s.stage ? STAGE_LABEL[s.stage] : "مجدولة"}
                  </Tag>
                )}
              </td>
              <td className="p-3">
                <Chip tone={standing.tone}>{standing.label}</Chip>
              </td>
            </tr>
          );
        })}
      </ListTable>
      {exempt > 0 && <p className="text-xs text-white/55">ومعهم {exempt} معفَون من الاختبار لا يظهرون هنا.</p>}

      <Records area="people" />

      <Drawer open={!!current} onClose={() => setOpen(null)} title={current ? current.row.name : ""} width="max-w-xl">
        {current && <ApplicantSheet a={current} onMove={(c) => move([current.row.id], c)} />}
      </Drawer>
    </div>
  );
}

/** One applicant's test, in a side sheet: where and when he sits it, his barcode and attempt, and moving him */
function ApplicantSheet({ a, onMove }: { a: Entry; onMove: (center: string | undefined) => void }) {
  const halls = useHalls();
  const may = useCan();
  const seePii = may("exams.applicants-pii.GET");
  const desk = useExamDesk();
  const auto = halls.autoCenterOf(a.row.id);
  const s = a.sitting;
  const standing = STANDING[desk.standings.get(a.row.id) ?? "waiting"];
  const paper = paperOf(a.row.profile, a.role);
  const status = statusOf(paper);
  return (
    <div className="space-y-5">
      <p className="flex flex-wrap items-center gap-1.5">
        <Chip tone={standing.tone}>{standing.label}</Chip>
        <Chip tone="muted">{roleLabelOf(a.role)}</Chip>
        {a.moved && <Chip tone="gold">منقول</Chip>}
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        {[
          ["الرقم الوطني", seePii ? <span key="id" dir="ltr">{a.row.id}</span> : "مخفي — صلاحية مستقلة"],
          ["الباركود", seePii ? <span key="b" dir="ltr" className="font-mono">{barcodeOf(a.row.id)}</span> : "مخفي — صلاحية مستقلة"],
          ["محافظة القيد", getPerson(a.row.id)?.governorate ?? "غير معروفة"],
          ["قاعة محافظته", auto?.name ?? "لا قاعة تخدمها"],
          ["الجلسة", s?.exam ? `${s.exam.name}${s.center ? ` — ${s.center.name}` : ""}` : "—"],
          ["موعدها", s?.exam ? dayTimeLabel(s.exam.day, s.exam.time) || "بلا موعد" : "—"],
          ["المحاولة", status ? <Chip key="s" tone={ATTEMPT_TONE[status]}>{`${ATTEMPT_LABEL[status]}${paper?.submittedAt ? ` · ${pct(paper.score)}` : ""}`}</Chip> : "لم تبدأ"],
        ].map(([k, v]) => (
          <div key={String(k)} className="rounded-xl bg-black/15 p-2">
            <dt className="text-[11px] text-white/60">{k}</dt>
            <dd className="font-bold leading-6 text-white">{v}</dd>
          </div>
        ))}
      </dl>
      <section className="border-t border-white/10 pt-4">
        <p className="mb-2 text-sm font-bold text-white">قاعته</p>
        {a.pending && !may("exams.applicants.move") ? (
          <p className="text-sm text-white/65">{a.center?.name ?? "بلا قاعة"}. نقل المتقدمين بين القاعات يحتاج صلاحيته.</p>
        ) : a.pending ? (
          <>
            <select value={a.moved ? a.center!.id : ""} onChange={(e) => onMove(e.target.value || undefined)} className={selectClass} aria-label={`قاعة ${a.row.name}`}>
              <option value="">{auto ? `تلقائي — ${auto.name}` : "— بلا قاعة —"}</option>
              {halls.live.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-white/55">يُحفظ فوراً، ويرى قاعته وموعده في بوابته.</p>
          </>
        ) : (
          <p className="text-sm text-white/65">أدّى اختباره في {a.center?.name ?? "—"}: لا يُنقل.</p>
        )}
      </section>
      <RecordHistory refId={a.row.id} />
    </div>
  );
}
