"use client";

import { useSearchParams } from "next/navigation";
import { CheckCircle2, CircleX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { ATTEMPT_LABEL, STAGE_LABEL, hallActions, roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import { Drawer, fmtDateTime, logAs, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { EmptyRow, ListTable, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { useExamDesk, type AttemptRow } from "./desk";
import { Records } from "./records";
import { AnswersDrawer, logAnswers } from "./results";
import { examOfAttempt, seatOf, useSittingRows, type SittingRow } from "./sittings";
import { ATTEMPT_TONE, Chip, SectionChips, Segments, alertParts, downloadCsv, pct } from "./ui";

type View = "review" | "attendance" | "suspicious";
const VIEWS: View[] = ["review", "attendance", "suspicious"];

/**
 * The administration's review of the sittings, three lists on one page: the attempts it has to decide, who came to
 * each sitting and who did not, and the attempts the devices raised signals on. Opens on one of them by `?t=`.
 */
export function Review() {
  const params = useSearchParams();
  const start = params.get("t");
  // A new `?t=` (a link from the summary) opens its list even when the page is already open
  return <ReviewViews key={start ?? ""} start={VIEWS.includes(start as View) ? (start as View) : "review"} />;
}

function ReviewViews({ start }: { start: View }) {
  const desk = useExamDesk();
  const sittings = useSittingRows(desk);
  const [view, setView] = useState<View>(start);
  const held = sittings.filter((s) => s.stage !== "idle");

  return (
    <div className="space-y-5">
      <Segments
        value={view}
        onChange={setView}
        label="القائمة"
        tabs
        items={[
          { value: "review", label: "تحتاج قراراً", count: desk.decisions.length, tone: "maroon" },
          { value: "attendance", label: "الحضور والغياب", count: held.length },
          { value: "suspicious", label: "الحالات المشتبه بها", count: desk.suspicious.length },
        ]}
      />
      {view === "review" ? <Decisions rows={desk.decisions} /> : view === "attendance" ? <Attendance sittings={held} /> : <Suspicious rows={desk.suspicious} />}
      <Records area="review" />
    </div>
  );
}

/** The test and hall of an attempt, as read */
function useWhere() {
  const halls = useHalls();
  return (a: AttemptRow) => ({ exam: halls.examById(examOfAttempt(a))?.name ?? `الاختبار المؤتمت لصفة ${roleLabelOf(a.role)}`, hall: halls.centerById(a.centerId)?.name ?? "—" });
}

function Signals({ a }: { a: AttemptRow }) {
  const parts = alertParts(a.attempt);
  if (!parts.length) return <span className="text-xs text-white/50">بلا تنبيهات</span>;
  return (
    <span className="flex flex-wrap gap-1">
      {parts.map((p) => (
        <Tag key={p} tone="gold">
          {p}
        </Tag>
      ))}
    </span>
  );
}

// ───────────────────────── تحتاج قراراً ─────────────────────────

function Decisions({ rows }: { rows: AttemptRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const where = useWhere();
  const [viewing, setViewing] = useState<AttemptRow | null>(null);
  const [deciding, setDeciding] = useState<{ a: AttemptRow; kind: "approve" | "void" } | null>(null);
  const [note, setNote] = useState("");
  const may = useCan();
  const seeAnswers = may("exams.attempt-answers.GET");
  const seePii = may("exams.applicants-pii.GET");
  const view = (a: AttemptRow) => {
    setViewing(a);
    logAnswers(user, a, "review", where(a).exam);
  };

  const decide = () => {
    if (!deciding || note.trim().length < 3) return;
    const { a, kind } = deciding;
    if (!may(`exams.attempts.${kind}`)) return;
    const w = where(a);
    hallActions.decide(a.row.id, a.role, kind, user.name, note.trim());
    logAs(user, {
      action: kind === "approve" ? "اعتماد إداري" : "إلغاء إداري",
      target: a.row.name,
      before: ATTEMPT_LABEL[a.status],
      after: kind === "approve" ? `مؤكَّد — ${a.passed ? "ناجح" : "راسب"} (${pct(a.attempt.score)})` : "ملغى",
      detail: `${w.exam} — ${w.hall}: ${note.trim()}`,
      system: "exams",
      area: "review",
      ref: a.row.id,
      important: true,
    });
    toast({
      title: kind === "approve" ? `اعتُمدت محاولة ${a.row.name.split(" ")[0]}` : `أُلغيت محاولة ${a.row.name.split(" ")[0]}`,
      body: kind === "approve" ? "صارت مؤكَّدة، وتدخل النتائج والإحصائيات." : "لا تدخل النتائج. يحتاج إلى جلسة أخرى ليختبر.",
      tone: kind === "approve" ? "success" : "info",
      icon: kind === "approve" ? "✅" : "🚫",
    });
    setDeciding(null);
    setNote("");
  };

  return (
    <>
      <p className="text-sm text-white/70">ما لم يؤكده مشرف القاعة، وما سُلّم في جلسة انتهت دون تأكيده: راجع إجاباته، ثم اعتمده أو ألغه بملاحظة. يصل كل قرار إلى مدير الموسم.</p>
      <ListTable head={["المتقدم", "الاختبار والقاعة", "لماذا", "النسبة والأقسام", "التنبيهات"]} minWidth="60rem">
        {rows.length === 0 && <EmptyRow cols={5}>لا محاولات تحتاج قراراً: كل محاولة سُلّمت أكّدها مشرف قاعتها، أو قررت فيها الإدارة.</EmptyRow>}
        {rows.map((a) => {
          const w = where(a);
          return (
            <tr key={`${a.row.id}-${a.role}`} className="align-top">
              <td className="p-3">
                {seeAnswers ? (
                  <button type="button" onClick={() => view(a)} className="text-right font-bold text-white hover:text-gold">
                    {a.row.name}
                  </button>
                ) : (
                  <p className="font-bold text-white">{a.row.name}</p>
                )}
                {seePii && (
                  <p className="text-xs text-white/55" dir="ltr">
                    {a.row.id}
                  </p>
                )}
                <RowActions>
                  {seeAnswers && <RowLink onClick={() => view(a)}>مراجعة الإجابات</RowLink>}
                  {may("exams.attempts.approve") && <RowLink onClick={() => setDeciding({ a, kind: "approve" })}>اعتماد إداري</RowLink>}
                  {may("exams.attempts.void") && (
                    <RowLink danger onClick={() => setDeciding({ a, kind: "void" })}>
                      إلغاء إداري
                    </RowLink>
                  )}
                </RowActions>
              </td>
              <td className="p-3 text-white/80">
                {w.exam}
                <span className="block text-xs text-white/55">
                  {w.hall}
                  {a.attempt.submittedAt ? ` · سلّم ${fmtDateTime(a.attempt.submittedAt)}` : ""}
                </span>
              </td>
              <td className="p-3">
                <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
                <span className="mt-1 block text-xs font-bold text-gold">{a.attempt.unconfirmedReason ? `لم يؤكده المشرف: ${a.attempt.unconfirmedReason}` : "انتهت الجلسة دون تأكيد"}</span>
              </td>
              <td className="p-3">
                <span className="mb-1 block font-bold text-white">{pct(a.attempt.score)}</span>
                <SectionChips sections={a.sections} />
              </td>
              <td className="p-3">
                <Signals a={a} />
              </td>
            </tr>
          );
        })}
      </ListTable>

      <AnswersDrawer a={viewing} onClose={() => setViewing(null)} />
      <Modal
        open={!!deciding}
        onClose={() => {
          setDeciding(null);
          setNote("");
        }}
        className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white"
      >
        {deciding && (
          <>
            <p className="text-xs font-bold text-gold">{deciding.kind === "approve" ? "اعتماد إداري" : "إلغاء إداري"}</p>
            <h3 className="mt-1 font-display text-xl font-bold">{deciding.a.row.name}</h3>
            <p className="mt-1 text-sm leading-7 text-white/70">
              {deciding.kind === "approve"
                ? `تصير المحاولة مؤكَّدة بنسبتها ${pct(deciding.a.attempt.score)}، ${deciding.a.passed ? "ناجحاً في كل الأقسام" : "راسباً"}، وتدخل النتائج.`
                : "تُلغى المحاولة فلا تدخل النتائج، ويحتاج إلى جلسة أخرى ليختبر."}
            </p>
            <label className="mt-4 block">
              <span className="mb-1 block text-sm font-bold text-white">ملاحظة القرار</span>
              <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} placeholder={deciding.kind === "approve" ? "مثال: تحقق المشرف من هويته بعد الجلسة، والتنبيه من انقطاع شبكة القاعة." : "مثال: ثبت أن من أدّى الاختبار غير صاحب الرقم الوطني."} />
            </label>
            <div className="mt-4 flex gap-2">
              <Button variant={deciding.kind === "approve" ? "gold" : "maroon"} disabled={note.trim().length < 3} onClick={decide}>
                {deciding.kind === "approve" ? <CheckCircle2 className="size-4" /> : <CircleX className="size-4" />}
                {deciding.kind === "approve" ? "اعتماد" : "إلغاء المحاولة"}
              </Button>
              <Button
                variant="glass"
                onClick={() => {
                  setDeciding(null);
                  setNote("");
                }}
              >
                تراجع
              </Button>
            </div>
          </>
        )}
      </Modal>
    </>
  );
}

// ───────────────────────── الحضور والغياب ─────────────────────────

function Attendance({ sittings }: { sittings: SittingRow[] }) {
  const user = useStaffUser()!;
  const may = useCan();
  const seePii = may("exams.applicants-pii.GET");
  const [open, setOpen] = useState<string | null>(null);
  const current = sittings.find((s) => s.key === open);
  const download = () => {
    downloadCsv("الحضور-والغياب-1448.csv", [
      ["الاختبار", "القاعة", "حالة الجلسة", "الاسم", ...(seePii ? ["الرقم الوطني"] : []), "الحال"],
      ...sittings.flatMap((s) => s.listed.map((r) => [s.exam.name, s.center.name, STAGE_LABEL[s.stage], r.name, ...(seePii ? [r.id] : []), seatOf(s, r.id).label])),
    ]);
    logAs(user, { action: "تصدير الحضور والغياب", target: `${sittings.length} جلسات`, system: "exams", area: "review" });
  };
  return (
    <>
      <Title
        action={
          sittings.length > 0 &&
          may("exams.attempts.export") && (
            <span className="text-sm font-bold">
              <RowLink onClick={download}>تصدير Excel</RowLink>
            </span>
          )
        }
      />
      <p className="-mt-2 text-sm text-white/70">لكل جلسة فُتحت قاعتها: من أُدرج فيها، ومن حضر، ومن غاب. الغائب عن جلسة انتهت يُحسب راسباً حين تختار «اعتبار الغائبين راسبين» في النتائج والإحصائيات.</p>
      <ListTable head={["الجلسة", "الحالة", "المدرجون", "الحاضرون", "الغائبون"]} minWidth="44rem">
        {sittings.length === 0 && <EmptyRow cols={5}>لم تُفتح أي قاعة بعد: يظهر هنا حضور كل جلسة منذ يفتح المشرف قاعتها.</EmptyRow>}
        {sittings.map((s) => {
          const present = s.listed.filter((r) => seatOf(s, r.id).present).length;
          const away = s.listed.length - present;
          const closed = s.stage === "closed";
          return (
            <tr key={s.key} className="align-top">
              <td className="p-3">
                <button type="button" onClick={() => setOpen(s.key)} className="text-right font-bold text-white hover:text-gold">
                  {s.exam.name}
                </button>
                <p className="text-xs text-white/55">{s.center.name}</p>
                <RowActions>
                  <RowLink onClick={() => setOpen(s.key)}>الأسماء</RowLink>
                </RowActions>
              </td>
              <td className="p-3">
                <Tag tone={closed ? "muted" : "green"}>{STAGE_LABEL[s.stage]}</Tag>
              </td>
              <td className="p-3 tabular-nums">{s.listed.length}</td>
              <td className="p-3 tabular-nums">{present}</td>
              <td className="p-3 tabular-nums">
                <span className={closed && away ? "font-bold text-gold" : ""}>{away}</span>
                {!closed && <span className="block text-[11px] text-white/50">لم يحضروا بعد</span>}
              </td>
            </tr>
          );
        })}
      </ListTable>
      <Drawer open={!!current} onClose={() => setOpen(null)} title={current ? `${current.exam.name} — ${current.center.name}` : ""} width="max-w-xl">
        {current && <SittingNames s={current} />}
      </Drawer>
    </>
  );
}

/** Who came to a sitting and who did not, by name */
function SittingNames({ s }: { s: SittingRow }) {
  const seats = s.listed.map((r) => ({ r, seat: seatOf(s, r.id) }));
  const present = seats.filter((x) => x.seat.present);
  const away = seats.filter((x) => !x.seat.present);
  const closed = s.stage === "closed";
  const group = (title: string, list: typeof seats, tone: "green" | "maroon" | "muted") => (
    <section>
      <p className="mb-2 text-sm font-bold text-white">
        {title} ({list.length})
      </p>
      {list.length === 0 ? (
        <p className="text-xs text-white/55">لا أحد.</p>
      ) : (
        <ul className="space-y-1">
          {list.map(({ r }) => (
            <li key={r.id} className="flex items-center justify-between gap-2 rounded-xl bg-white/[.05] px-3 py-1.5 text-sm ring-1 ring-white/10">
              <span className="font-bold text-white">{r.name}</span>
              <Chip tone={tone}>{tone === "green" ? "حضر" : closed ? "غاب" : "لم يحضر بعد"}</Chip>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
  return (
    <div className="space-y-5">
      {group("حضروا", present, "green")}
      {group(closed ? "غابوا" : "لم يحضروا بعد", away, closed ? "maroon" : "muted")}
    </div>
  );
}

// ───────────────────────── الحالات المشتبه بها ─────────────────────────

function Suspicious({ rows }: { rows: AttemptRow[] }) {
  const user = useStaffUser()!;
  const where = useWhere();
  const may = useCan();
  const seeAnswers = may("exams.attempt-answers.GET");
  const seePii = may("exams.applicants-pii.GET");
  const [viewing, setViewing] = useState<AttemptRow | null>(null);
  const view = (a: AttemptRow) => {
    setViewing(a);
    logAnswers(user, a, "review", where(a).exam);
  };
  const download = () => {
    downloadCsv("الحالات-المشتبه-بها-1448.csv", [
      ["الاسم", ...(seePii ? ["الرقم الوطني"] : []), "الاختبار", "القاعة", "الحالة", "النسبة", "التنبيهات", "عددها"],
      ...rows.map((a) => {
        const w = where(a);
        return [a.row.name, ...(seePii ? [a.row.id] : []), w.exam, w.hall, ATTEMPT_LABEL[a.status], a.attempt.score ?? "", alertParts(a.attempt).join("، "), a.alerts];
      }),
    ]);
    logAs(user, { action: "تصدير الحالات المشتبه بها", target: `${rows.length} محاولات`, system: "exams", area: "review" });
  };
  return (
    <>
      <Title
        action={
          rows.length > 0 &&
          may("exams.attempts.export") && (
            <span className="text-sm font-bold">
              <RowLink onClick={download}>تصدير Excel</RowLink>
            </span>
          )
        }
      />
      <p className="-mt-2 text-sm text-gold">إشارات آلية تدعم القرار وليست إثباتاً: قد تظهر بسبب انقطاع شبكة أو تبديل تطبيق.</p>
      <ListTable head={["المتقدم", "الاختبار والقاعة", "الحالة", "التنبيهات"]} minWidth="48rem">
        {rows.length === 0 && <EmptyRow cols={4}>لا محاولات بتنبيهات: لم يرفع أي جهاز إشارة أثناء الاختبار.</EmptyRow>}
        {[...rows]
          .sort((x, y) => y.alerts - x.alerts)
          .map((a) => {
            const w = where(a);
            return (
              <tr key={`${a.row.id}-${a.role}`} className="align-top">
                <td className="p-3">
                  {a.attempt.paper && seeAnswers ? (
                    <button type="button" onClick={() => view(a)} className="text-right font-bold text-white hover:text-gold">
                      {a.row.name}
                    </button>
                  ) : (
                    <p className="font-bold text-white">{a.row.name}</p>
                  )}
                  {seePii && (
                    <p className="text-xs text-white/55" dir="ltr">
                      {a.row.id}
                    </p>
                  )}
                  {a.attempt.paper && seeAnswers && (
                    <RowActions>
                      <RowLink onClick={() => view(a)}>مراجعة الإجابات</RowLink>
                    </RowActions>
                  )}
                </td>
                <td className="p-3 text-white/80">
                  {w.exam}
                  <span className="block text-xs text-white/55">{w.hall}</span>
                </td>
                <td className="p-3">
                  <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
                  {a.attempt.submittedAt && <span className="mt-1 block text-xs text-white/70">{pct(a.attempt.score)}</span>}
                </td>
                <td className="p-3">
                  <Signals a={a} />
                </td>
              </tr>
            );
          })}
      </ListTable>
      <AnswersDrawer a={viewing} onClose={() => setViewing(null)} />
    </>
  );
}
