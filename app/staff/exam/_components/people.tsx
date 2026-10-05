"use client";

import { useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeftRight, Download, RotateCcw, UsersRound, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { matches } from "@/lib/ops";
import { getPerson } from "@/lib/registry";
import { cn, maskNationalId } from "@/lib/utils";
import { APPLIED_ROLES } from "@/app/administrator/_lib/admin";
import { hallActions, roleKeyOf, roleLabelOf, STAGE_LABEL, useHalls } from "@/app/administrator/_lib/halls";
import { Empty, Panel, logAs, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { useExamDesk, type Applicant } from "./desk";
import { Records } from "./records";
import { Chip, downloadCsv, selectClass } from "./ui";

/**
 * Everyone who still has to sit the written, and where. Each applicant sits in his registry governorate's
 * centre on his own; the owner moves one or many to another centre, or sends them back to their own, from
 * this one list — filtered to a centre, it is also «who sits in this centre».
 */
export function People() {
  const params = useSearchParams();
  const user = useStaffUser()!;
  const toast = useToast();
  const desk = useExamDesk();
  const halls = useHalls();
  const [center, setCenter] = useState(params.get("c") ?? "");
  const [role, setRole] = useState("");
  const [q, setQ] = useState("");
  const [picked, setPicked] = useState<string[]>([]);
  const [to, setTo] = useState("");

  const list = desk.applicants
    .filter((a) => !center || (center === "none" ? !a.center : a.center?.id === center))
    .filter((a) => !role || a.role === role)
    .filter((a) => matches(q, [a.row.name, a.row.id, getPerson(a.row.id)?.governorate]))
    .sort((x, y) => Number(!!x.center) - Number(!!y.center) || (x.center?.name ?? "").localeCompare(y.center?.name ?? "", "ar") || x.row.name.localeCompare(y.row.name, "ar"));
  const shownIds = list.map((a) => a.row.id);
  const allPicked = shownIds.length > 0 && shownIds.every((id) => picked.includes(id));
  const inCenter = (id: string) => desk.applicants.filter((a) => a.center?.id === id).length;

  const move = (rows: Applicant[], centerId: string | undefined) => {
    if (!rows.length) return;
    const target = halls.centerById(centerId);
    hallActions.move(
      rows.map((a) => a.row.id),
      centerId,
    );
    const one = rows.length === 1 ? rows[0] : null;
    logAs(user, {
      action: centerId ? (one ? "نقل متقدم إلى مركز امتحاني" : "نقل متقدمين إلى مركز امتحاني") : one ? "إعادة متقدم إلى مركز محافظته" : "إعادة متقدمين إلى مراكز محافظاتهم",
      target: one ? one.row.name : `${rows.length} متقدمين`,
      before: one ? (one.center?.name ?? "بلا مركز") : undefined,
      after: target?.name ?? (one ? (halls.autoCenterOf(one.row.id)?.name ?? "بلا مركز") : "مراكز محافظاتهم"),
      detail: one ? undefined : rows.map((a) => a.row.name).slice(0, 6).join("، ") + (rows.length > 6 ? "…" : ""),
      system: "exams",
      area: "people",
      ref: one?.row.id,
    });
    toast({ title: target ? `${rows.length === 1 ? rows[0].row.name.split(" ")[0] : `${rows.length} متقدمين`} إلى ${target.name}` : "أُعيدوا إلى مراكز محافظاتهم", body: "يرى كل منهم مركزه وقاعته وموعده في بوابته.", tone: "success", icon: "🏛️" });
    setPicked([]);
    setTo("");
  };

  const pickedRows = desk.applicants.filter((a) => picked.includes(a.row.id));

  /** Everyone with a sitting, past or to come: where, which exam, and whether he came */
  const attendance = () =>
    downloadCsv("حضور-الامتحان-الكتابي-1448.csv", [
      ["الاسم", "الرقم الوطني", "الصفة", "المركز", "الامتحان", "الموعد", "الحال"],
      ...desk.rows
        .filter((r) => !r.profile.examExempt && (r.profile.exam?.submittedAt || halls.centerOf(r.id)))
        .map((r) => {
          const role = roleKeyOf(r.profile.positions[0] ?? r.position);
          const sat = r.profile.exam?.submittedAt;
          // Papers from before the halls carry no sitting
          const satAt = r.profile.exam?.hall?.split("@")[0];
          const exam = sat ? (satAt ? halls.examById(satAt) : undefined) : halls.sittingOf(r.id, role)?.exam;
          return [r.name, maskNationalId(r.id), roleLabelOf(role), halls.centerOf(r.id)?.name, exam?.name, exam ? `${exam.date} ${exam.time}` : "", sat ? "حضر وسلّم" : desk.standings.get(r.id) === "absent" ? "غائب" : "لم يُمتحَن بعد"];
        }),
    ]);

  return (
    <div className="space-y-4 pb-24">
      <Panel
        icon={<UsersRound />}
        title="المتقدمون للامتحان الكتابي"
        action={
          <span className="flex items-center gap-2">
            <Chip tone="gold">{desk.applicants.length}</Chip>
            <Button size="sm" variant="glass" onClick={attendance}>
              <Download className="size-4" /> الحضور والمراكز
            </Button>
          </span>
        }
        bodyClass="space-y-3"
      >
        <p className="text-sm leading-7 text-white/70">
          كل من دفع رسم التسجيل ولم يؤدِّ الكتابي بعد. يُسند تلقائياً إلى مركز محافظة قيده؛ لنقل واحد غيّر مركزه من أمام اسمه، ولنقل مجموعة حدّدها ثم اختر المركز من الشريط في الأسفل.
        </p>
        {desk.noCenter.length > 0 && center !== "none" && (
          <button type="button" onClick={() => setCenter("none")} className="flex w-full items-center gap-2 rounded-2xl bg-maroon/25 p-3 text-right text-sm font-bold text-white ring-1 ring-maroon/50 hover:bg-maroon/35">
            <AlertTriangle className="size-4 shrink-0 text-gold" /> {desk.noCenter.length} متقدمين بلا مركز امتحاني — اعرضهم لإسنادهم
          </button>
        )}
        <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
          <SearchBox value={q} onChange={setQ} label="بحث في المتقدمين" placeholder="اسم، آخر أرقام الرقم الوطني، محافظة..." />
          <FilterSelect
            label="المركز"
            all="كل المراكز"
            value={center}
            onChange={setCenter}
            options={[{ value: "none", label: `بلا مركز (${desk.noCenter.length})` }, ...halls.live.map((c) => ({ value: c.id, label: `${c.name} (${inCenter(c.id)})` }))]}
          />
          <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={APPLIED_ROLES.map((r) => ({ value: r.key, label: r.label }))} />
        </div>
      </Panel>

      <Panel bodyClass="space-y-2">
        {list.length === 0 ? (
          <Empty icon={<UsersRound />} title={desk.applicants.length ? "لا أحد يطابق هذا البحث" : "لا متقدمين ينتظرون الكتابي"} text={desk.applicants.length ? "امسح البحث أو اختر مركزاً آخر." : "كل من دفع رسم التسجيل أدّاه أو أُعفي منه."} />
        ) : (
          <>
            <label className="flex items-center gap-2 px-1 pb-1 text-xs font-bold text-white/70">
              <input type="checkbox" checked={allPicked} onChange={() => setPicked(allPicked ? picked.filter((id) => !shownIds.includes(id)) : [...new Set([...picked, ...shownIds])])} className="size-4 accent-[#D9C89E]" />
              تحديد الظاهرين ({list.length})
            </label>
            {list.map((a) => (
              <Row key={a.row.id} a={a} on={picked.includes(a.row.id)} onPick={() => setPicked(picked.includes(a.row.id) ? picked.filter((x) => x !== a.row.id) : [...picked, a.row.id])} onMove={(c) => move([a], c)} />
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
              <select value={to} onChange={(e) => setTo(e.target.value)} className={selectClass} aria-label="المركز الذي يُنقلون إليه">
                <option value="">— اختر المركز —</option>
                {halls.live.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </span>
            <Button size="sm" variant="gold" disabled={!to} onClick={() => move(pickedRows, to)}>
              <ArrowLeftRight className="size-4" /> نقل إليه
            </Button>
            <Button size="sm" variant="glass" onClick={() => move(pickedRows, undefined)}>
              <RotateCcw className="size-4" /> إعادتهم إلى مراكز محافظاتهم
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

function Row({ a, on, onPick, onMove }: { a: Applicant; on: boolean; onPick: () => void; onMove: (center: string | undefined) => void }) {
  const halls = useHalls();
  const auto = halls.autoCenterOf(a.row.id);
  const s = a.sitting;
  return (
    <div className={cn("flex flex-wrap items-center gap-3 rounded-2xl p-3 ring-1 transition", on ? "bg-gold/15 ring-gold/50" : a.center ? "bg-white/[.06] ring-white/10" : "bg-maroon/15 ring-maroon/40")}>
      <input type="checkbox" checked={on} onChange={onPick} className="size-4 shrink-0 accent-[#D9C89E]" aria-label={`تحديد ${a.row.name}`} />
      <div className="min-w-0 flex-1 basis-56">
        <p className="font-bold text-white">{a.row.name}</p>
        <p className="text-xs text-white/65">
          {roleLabelOf(a.role)} · <span dir="ltr">{maskNationalId(a.row.id)}</span> · {getPerson(a.row.id)?.governorate ?? "محافظة غير معروفة"}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-1.5">
        {!a.center ? (
          <Chip tone="maroon">بلا مركز</Chip>
        ) : !s ? (
          <Chip tone="maroon">لا امتحان له في {a.center.name}</Chip>
        ) : s.stage === "closed" ? (
          <Chip tone="maroon">غاب عن {s.exam.name}</Chip>
        ) : (
          <Chip tone={s.stage === "idle" ? "muted" : "gold"}>
            {s.exam.kind === "makeup" ? `${s.exam.name} — ` : ""}
            {STAGE_LABEL[s.stage]}
          </Chip>
        )}
        {a.moved && <Chip tone="gold">منقول</Chip>}
      </div>
      <span className="w-60 max-w-full shrink-0">
        <select value={a.moved ? a.center!.id : ""} onChange={(e) => onMove(e.target.value || undefined)} className={selectClass} aria-label={`مركز ${a.row.name}`}>
          <option value="">{auto ? `تلقائي — ${auto.name}` : "— بلا مركز —"}</option>
          {halls.live.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </span>
    </div>
  );
}
