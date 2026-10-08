"use client";

import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeftRight, ChevronDown, Download, RotateCcw, UsersRound, X } from "lucide-react";
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
import { Empty, Panel, logAs, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { STANDING, useExamDesk } from "./desk";
import { Records } from "./records";
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
 * The applicants, as the administration sees them: everyone who sits a test this season (one line per test for
 * whoever sits two), with his national id in full, his role, his hall, the sitting he is at and where he stands.
 * Each sits in his registry governorate's hall unless moved; the owner moves one or many to another hall from
 * this list. The card barcode he is checked in with is in his line's detail, not in the list.
 */
export function People() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const halls = useHalls();
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
    .filter((a) => matches(q, [a.row.name, a.row.id, getPerson(a.row.id)?.governorate]))
    .sort((x, y) => Number(!!x.center) - Number(!!y.center) || (x.center?.name ?? "").localeCompare(y.center?.name ?? "", "ar") || x.row.name.localeCompare(y.row.name, "ar"));
  const movable = list.filter((a) => a.pending);
  const shownIds = [...new Set(movable.map((a) => a.row.id))];
  const allPicked = shownIds.length > 0 && shownIds.every((id) => picked.includes(id));
  const inCenter = (id: string) => entries.filter((a) => a.center?.id === id).length;
  const noCenter = entries.filter((a) => !a.center).length;

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
  const attendance = () =>
    downloadCsv("المتقدمون-والحضور-1448.csv", [
      ["الاسم", "الرقم الوطني", "الباركود", "المحافظة", "الصفة", "القاعة", "الاختبار", "الموعد", "حال الجلسة", "الحال"],
      ...entries.map((a) => [
        a.row.name,
        a.row.id,
        barcodeOf(a.row.id),
        getPerson(a.row.id)?.governorate,
        roleLabelOf(a.role),
        a.center?.name,
        a.sitting?.exam?.name,
        a.sitting?.exam ? dayTimeLabel(a.sitting.exam.day, a.sitting.exam.time) : "",
        a.sitting?.stage ? STAGE_LABEL[a.sitting.stage] : "",
        STANDING[desk.standings.get(a.row.id) ?? "waiting"].label,
      ]),
    ]);

  return (
    <div className="space-y-4 pb-24">
      <Panel
        icon={<UsersRound />}
        title="المتقدمون"
        action={
          <span className="flex items-center gap-2">
            <Chip tone="gold">{entries.length}</Chip>
            <Button size="sm" variant="glass" onClick={attendance}>
              <Download className="size-4" /> تصدير Excel
            </Button>
          </span>
        }
        bodyClass="space-y-3"
      >
        <p className="text-sm leading-7 text-white/70">
          كل من ثبتت أهليته ودفع رسم التسجيل، بسطر لكل اختبار يؤديه{exempt ? `، ومعهم ${exempt} معفَون من الاختبار لا يظهرون هنا` : ""}. يُسند كل متقدم تلقائياً إلى قاعة محافظة قيده؛ لنقل واحد غيّر قاعته من أمام اسمه، ولنقل مجموعة حدّدها ثم اختر القاعة من الشريط في الأسفل. الباركود الذي يُسجَّل به حضوره في تفاصيل سطره.
        </p>
        {noCenter > 0 && center !== "none" && (
          <button type="button" onClick={() => setCenter("none")} className="flex w-full items-center gap-2 rounded-2xl bg-maroon/25 p-3 text-right text-sm font-bold text-white ring-1 ring-maroon/50 hover:bg-maroon/35">
            <AlertTriangle className="size-4 shrink-0 text-gold" /> {noCenter} متقدمين بلا قاعة — اعرضهم لإسنادهم
          </button>
        )}
        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في المتقدمين" placeholder="اسم، رقم وطني، محافظة..." />
          <FilterSelect
            label="القاعة"
            all="كل القاعات"
            value={center}
            onChange={setCenter}
            options={[{ value: "none", label: `بلا قاعة (${noCenter})` }, ...halls.centers.map((c) => ({ value: c.id, label: `${c.name} (${inCenter(c.id)})` }))]}
          />
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
      </Panel>

      <Panel bodyClass="space-y-2">
        {list.length === 0 ? (
          <Empty icon={<UsersRound />} title={entries.length ? "لا أحد يطابق هذا البحث" : "لا متقدمين للاختبار"} text={entries.length ? "امسح البحث أو غيّر التصفية." : "يظهر هنا كل من دفع رسم التسجيل ولم يُعفَ من الاختبار."} />
        ) : (
          <>
            {shownIds.length > 0 && (
              <label className="flex items-center gap-2 px-1 pb-1 text-xs font-bold text-white/70">
                <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? picked.filter((id) => !shownIds.includes(id)) : [...new Set([...picked, ...shownIds])])} className="size-4 accent-[#D9C89E]" />
                تحديد من لم يختبر بعد من الظاهرين ({shownIds.length})
              </label>
            )}
            {list.map((a) => (
              <Row
                key={a.key}
                a={a}
                on={picked.includes(a.row.id)}
                open={open === a.key}
                onOpen={() => setOpen(open === a.key ? null : a.key)}
                onPick={() => setPicked(picked.includes(a.row.id) ? picked.filter((x) => x !== a.row.id) : [...picked, a.row.id])}
                onMove={(c) => move([a.row.id], c)}
              />
            ))}
          </>
        )}
      </Panel>

      <Records area="people" />

      <AnimatePresence>
        {picked.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 30 }} className="sticky bottom-4 z-10 flex flex-wrap items-center gap-2 rounded-3xl border border-gold/40 bg-[#00352f] p-3 shadow-2xl">
            <span className="px-2 font-bold text-white">{picked.length} محددون</span>
            <span className="w-56 max-w-full">
              <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="القاعة التي يُنقلون إليها">
                <option value="">— اختر القاعة —</option>
                {halls.live.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
            <Button size="sm" variant="gold" disabled={!to} onClick={() => move(picked, to)}>
              <ArrowLeftRight className="size-4" /> نقل إليها
            </Button>
            <Button size="sm" variant="glass" onClick={() => move(picked, undefined)}>
              <RotateCcw className="size-4" /> إعادتهم إلى قاعات محافظاتهم
            </Button>
            <Button size="sm" variant="ghost" className="mr-auto text-white" onClick={() => setPicked([])}>
              <X className="size-4" /> إلغاء التحديد
            </Button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Row({ a, on, open, onOpen, onPick, onMove }: { a: Entry; on: boolean; open: boolean; onOpen: () => void; onPick: () => void; onMove: (center: string | undefined) => void }) {
  const halls = useHalls();
  const desk = useExamDesk();
  const auto = halls.autoCenterOf(a.row.id);
  const s = a.sitting;
  const standing = STANDING[desk.standings.get(a.row.id) ?? "waiting"];
  const paper = paperOf(a.row.profile, a.role);
  const status = statusOf(paper);
  return (
    <div className={cn("rounded-2xl p-3 ring-1 transition", on ? "bg-gold/15 ring-gold/50" : a.center ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
      <div className="flex flex-wrap items-center gap-3">
        {a.pending ? <input type="checkbox" checked={on} onChange={onPick} className="size-4 shrink-0 accent-[#D9C89E]" aria-label={`تحديد ${a.row.name}`} /> : <span className="size-4 shrink-0" />}
        <button type="button" onClick={onOpen} className="min-w-0 flex-1 basis-56 text-right" aria-expanded={open}>
          <p className="flex items-center gap-1.5 font-bold text-white">
            {a.row.name}
            <ChevronDown className={cn("size-4 text-white/50 transition", open && "rotate-180")} />
          </p>
          <p className="text-xs text-white/65">
            <span dir="ltr">{a.row.id}</span> · {roleLabelOf(a.role)} · {a.center?.name ?? "بلا قاعة"}
          </p>
        </button>
        <div className="flex flex-wrap items-center gap-1.5">
          {!a.center ? (
            <Chip tone="maroon">بلا قاعة</Chip>
          ) : !s?.exam ? (
            <Chip tone="maroon">{a.pending ? `لا اختبار له في ${a.center.name}` : "أدّاه قبل القاعات"}</Chip>
          ) : a.pending && s.stage === "closed" ? (
            <Chip tone="maroon">غاب عن {s.exam.name}</Chip>
          ) : (
            <Chip tone={s.stage === "running" || s.stage === "open" ? "gold" : "muted"}>
              {s.exam.kind === "makeup" ? `${EXAM_KINDS.makeup} — ` : ""}
              {s.stage ? STAGE_LABEL[s.stage] : "مجدولة"}
            </Chip>
          )}
          <Chip tone={standing.tone}>{standing.label}</Chip>
          {a.moved && <Chip tone="gold">منقول</Chip>}
        </div>
        {a.pending ? (
          <span className="w-60 max-w-full shrink-0">
            <select value={a.moved ? a.center!.id : ""} onChange={(e) => onMove(e.target.value || undefined)} className={selectClass} aria-label={`قاعة ${a.row.name}`}>
              <option value="">{auto ? `تلقائي — ${auto.name}` : "— بلا قاعة —"}</option>
              {halls.live.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </span>
        ) : (
          <span className="w-60 max-w-full shrink-0 text-xs text-white/55">أدّى اختباره: لا يُنقل</span>
        )}
      </div>
      {open && (
        <dl className="mt-3 grid grid-cols-2 gap-2 border-t border-white/10 pt-3 text-sm sm:grid-cols-3 lg:grid-cols-6">
          {[
            ["الباركود", <span key="b" dir="ltr" className="font-mono">{barcodeOf(a.row.id)}</span>],
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
      )}
    </div>
  );
}
