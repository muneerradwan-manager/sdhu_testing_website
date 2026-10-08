"use client";

import { useSearchParams } from "next/navigation";
import { motion } from "motion/react";
import { CheckCircle2, ClipboardList, Download, Eye, Gavel, ShieldAlert, UserCheck, CircleX } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { cn } from "@/lib/utils";
import { ATTEMPT_LABEL, STAGE_LABEL, hallActions, roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import { Empty, Panel, Tabs, fmtDateTime, logAs, textareaClass, useStaffUser } from "../../_components/kit";
import { useExamDesk, type AttemptRow } from "./desk";
import { Records } from "./records";
import { AnswersDrawer, logAnswers } from "./results";
import { examOfAttempt, seatOf, useSittingRows, type SittingRow } from "./sittings";
import { ATTEMPT_TONE, Chip, SectionChips, alertParts, downloadCsv, pct } from "./ui";

type Tab = "review" | "attendance" | "suspicious";
const TABS: Tab[] = ["review", "attendance", "suspicious"];

/**
 * The administration's review of the sittings: the attempts it has to decide (not confirmed by the supervisor, or
 * sent in a sitting that ended without its confirmation), who came to each sitting and who did not, and the
 * attempts the devices raised signals on. Opens on one of its tabs by `?t=`.
 */
export function Review() {
  const params = useSearchParams();
  const start = params.get("t");
  // A new `?t=` (a link from the summary) opens its tab even when the page is already open
  return <ReviewTabs key={start ?? ""} start={TABS.includes(start as Tab) ? (start as Tab) : "review"} />;
}

function ReviewTabs({ start }: { start: Tab }) {
  const desk = useExamDesk();
  const sittings = useSittingRows(desk);
  const [tab, setTab] = useState<Tab>(start);
  const held = sittings.filter((s) => s.stage !== "idle");

  return (
    <div className="space-y-4">
      <Tabs
        id="exam-review"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "review", label: "المراجعة", count: desk.decisions.length },
          { value: "attendance", label: "الحضور والغياب", count: held.length },
          { value: "suspicious", label: "الحالات المشتبه بها", count: desk.suspicious.length },
        ]}
      />
      {tab === "review" ? <Decisions rows={desk.decisions} /> : tab === "attendance" ? <Attendance sittings={held} /> : <Suspicious rows={desk.suspicious} />}
      <Records area="review" />
    </div>
  );
}

/** The test and hall of an attempt, as read */
function useWhere() {
  const halls = useHalls();
  return (a: AttemptRow) => ({ exam: halls.examById(examOfAttempt(a))?.name ?? `الاختبار المؤتمت لصفة ${roleLabelOf(a.role)}`, hall: halls.centerById(a.centerId)?.name ?? "—" });
}

// ───────────────────────── المراجعة ─────────────────────────

function Decisions({ rows }: { rows: AttemptRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const where = useWhere();
  const [viewing, setViewing] = useState<AttemptRow | null>(null);
  const [deciding, setDeciding] = useState<{ a: AttemptRow; kind: "approve" | "void" } | null>(null);
  const [note, setNote] = useState("");

  const decide = () => {
    if (!deciding || note.trim().length < 3) return;
    const { a, kind } = deciding;
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
    <Panel icon={<Gavel />} title="محاولات تحتاج قراراً">
      <p className="text-sm leading-7 text-white/70">
        ما لم يؤكده مشرف القاعة («لا أؤكد»)، وما سُلّم في جلسة انتهت دون تأكيده. راجع إجاباته وتنبيهاته، ثم اعتمده فيصير مؤكَّداً ويدخل النتائج، أو ألغه. لكل قرار ملاحظته، ويُسجَّل باسمك ويصل إلى مديرة الموسم.
      </p>
      {rows.length === 0 ? (
        <div className="mt-4">
          <Empty icon={<CheckCircle2 />} title="لا محاولات تحتاج قراراً." text="كل محاولة سُلّمت أكّدها مشرف قاعتها، أو قررت فيها الإدارة." />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {rows.map((a, i) => {
            const w = where(a);
            const parts = alertParts(a.attempt);
            return (
              <motion.li key={`${a.row.id}-${a.role}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }} className="rounded-2xl bg-maroon/15 p-3 ring-1 ring-maroon/40">
                <div className="flex flex-wrap items-start gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                      {a.row.name} <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
                    </p>
                    <p className="text-xs text-white/65">
                      <span dir="ltr">{a.row.id}</span> · {w.exam} · {w.hall}
                      {a.attempt.submittedAt ? ` · سلّم ${fmtDateTime(a.attempt.submittedAt)}` : ""}
                    </p>
                    <p className="mt-1 text-sm font-bold text-gold">{a.attempt.unconfirmedReason ? `لم يؤكده المشرف: ${a.attempt.unconfirmedReason}` : "انتهت الجلسة دون تأكيد"}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs">
                      <span className="font-bold text-white">{pct(a.attempt.score)}</span>
                      <SectionChips sections={a.sections} />
                    </div>
                    <p className="mt-1 flex flex-wrap gap-1">
                      {parts.length ? (
                        parts.map((p) => (
                          <Chip key={p} tone="gold">
                            {p}
                          </Chip>
                        ))
                      ) : (
                        <span className="text-xs text-white/55">بلا تنبيهات من الجهاز</span>
                      )}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => {
                        setViewing(a);
                        logAnswers(user, a, "review", w.exam);
                      }}
                    >
                      <Eye className="size-4" /> مراجعة الإجابات
                    </Button>
                    <Button size="sm" variant="gold" onClick={() => setDeciding({ a, kind: "approve" })}>
                      <CheckCircle2 className="size-4" /> اعتماد إداري
                    </Button>
                    <Button size="sm" variant="maroon" onClick={() => setDeciding({ a, kind: "void" })}>
                      <CircleX className="size-4" /> إلغاء إداري
                    </Button>
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

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
    </Panel>
  );
}

// ───────────────────────── الحضور والغياب ─────────────────────────

function Attendance({ sittings }: { sittings: SittingRow[] }) {
  const user = useStaffUser()!;
  const download = () => {
    downloadCsv("الحضور-والغياب-1448.csv", [
      ["الاختبار", "القاعة", "حالة الجلسة", "الاسم", "الرقم الوطني", "الحال"],
      ...sittings.flatMap((s) => s.listed.map((r) => [s.exam.name, s.center.name, STAGE_LABEL[s.stage], r.name, r.id, seatOf(s, r.id).label])),
    ]);
    logAs(user, { action: "تصدير الحضور والغياب", target: `${sittings.length} جلسات`, system: "exams", area: "review" });
  };
  return (
    <Panel
      icon={<UserCheck />}
      title="الحضور والغياب"
      action={
        sittings.length > 0 && (
          <Button size="sm" variant="glass" onClick={download}>
            <Download className="size-4" /> تصدير Excel
          </Button>
        )
      }
    >
      <p className="text-sm leading-7 text-white/70">لكل جلسة فُتحت قاعتها: من أُدرج فيها، ومن حضر، ومن غاب. الغائب عن جلسة انتهت يُحسب راسباً فيها حين تختار «اعتبار الغائبين راسبين» في النتائج والإحصائيات.</p>
      {sittings.length === 0 ? (
        <div className="mt-4">
          <Empty icon={<ClipboardList />} title="لم تُفتح أي قاعة بعد" text="يظهر هنا حضور كل جلسة منذ يفتح المشرف قاعتها." />
        </div>
      ) : (
        <ul className="mt-4 space-y-3">
          {sittings.map((s) => {
            const seats = s.listed.map((r) => ({ r, seat: seatOf(s, r.id) }));
            const present = seats.filter((x) => x.seat.present);
            const away = seats.filter((x) => !x.seat.present);
            const closed = s.stage === "closed";
            return (
              <li key={s.key} className="rounded-2xl bg-white/[.05] p-3 ring-1 ring-white/10">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-bold text-white">
                    {s.exam.name} — {s.center.name}
                  </p>
                  <Chip tone={closed ? "muted" : "green"}>{STAGE_LABEL[s.stage]}</Chip>
                </div>
                <dl className="mt-2 grid grid-cols-3 gap-2 text-center">
                  {(
                    [
                      ["المدرجون", s.listed.length],
                      ["الحاضرون", present.length],
                      [closed ? "الغائبون" : "لم يحضروا بعد", away.length],
                    ] as const
                  ).map(([k, v]) => (
                    <div key={k} className="rounded-xl bg-black/15 p-2">
                      <dt className="text-[11px] text-white/60">{k}</dt>
                      <dd className={cn("font-display text-xl font-bold tabular-nums", k === "الغائبون" && v ? "text-gold" : "text-white")}>{v}</dd>
                    </div>
                  ))}
                </dl>
                {present.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-white/60">حضروا:</span>
                    {present.map(({ r }) => (
                      <Chip key={r.id} tone="green">
                        {r.name}
                      </Chip>
                    ))}
                  </p>
                )}
                {away.length > 0 && (
                  <p className="mt-2 flex flex-wrap items-center gap-1 text-xs">
                    <span className="text-white/60">{closed ? "غابوا:" : "لم يحضروا بعد:"}</span>
                    {away.map(({ r }) => (
                      <Chip key={r.id} tone={closed ? "maroon" : "muted"}>
                        {r.name}
                      </Chip>
                    ))}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
  );
}

// ───────────────────────── الحالات المشتبه بها ─────────────────────────

function Suspicious({ rows }: { rows: AttemptRow[] }) {
  const user = useStaffUser()!;
  const where = useWhere();
  const [viewing, setViewing] = useState<AttemptRow | null>(null);
  const download = () => {
    downloadCsv("الحالات-المشتبه-بها-1448.csv", [
      ["الاسم", "الرقم الوطني", "الاختبار", "القاعة", "الحالة", "النسبة", "التنبيهات", "عددها"],
      ...rows.map((a) => {
        const w = where(a);
        return [a.row.name, a.row.id, w.exam, w.hall, ATTEMPT_LABEL[a.status], a.attempt.score ?? "", alertParts(a.attempt).join("، "), a.alerts];
      }),
    ]);
    logAs(user, { action: "تصدير الحالات المشتبه بها", target: `${rows.length} محاولات`, system: "exams", area: "review" });
  };
  return (
    <Panel
      icon={<ShieldAlert />}
      title={`الحالات المشتبه بها (${rows.length})`}
      action={
        rows.length > 0 && (
          <Button size="sm" variant="glass" onClick={download}>
            <Download className="size-4" /> تصدير Excel
          </Button>
        )
      }
    >
      <p className="rounded-2xl bg-gold/10 p-3 text-sm leading-7 text-gold ring-1 ring-gold/40">إشارات آلية تدعم القرار وليست إثباتاً: قد تظهر بسبب انقطاع شبكة أو تبديل تطبيق.</p>
      {rows.length === 0 ? (
        <div className="mt-4">
          <Empty icon={<ShieldAlert />} title="لا محاولات بتنبيهات" text="لم يرفع أي جهاز إشارة أثناء الاختبار." />
        </div>
      ) : (
        <ul className="mt-4 space-y-2">
          {[...rows]
            .sort((x, y) => y.alerts - x.alerts)
            .map((a) => {
              const w = where(a);
              return (
                <li key={`${a.row.id}-${a.role}`} className="flex flex-wrap items-start gap-3 rounded-2xl bg-white/[.05] p-3 ring-1 ring-white/10">
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                      {a.row.name} <Chip tone={ATTEMPT_TONE[a.status]}>{ATTEMPT_LABEL[a.status]}</Chip>
                    </p>
                    <p className="text-xs text-white/65">
                      <span dir="ltr">{a.row.id}</span> · {w.exam} · {w.hall}
                      {a.attempt.submittedAt ? ` · ${pct(a.attempt.score)}` : ""}
                    </p>
                    <p className="mt-1.5 flex flex-wrap gap-1">
                      {alertParts(a.attempt).map((p) => (
                        <Chip key={p} tone="gold">
                          {p}
                        </Chip>
                      ))}
                    </p>
                  </div>
                  {a.attempt.paper && (
                    <Button
                      size="sm"
                      variant="glass"
                      onClick={() => {
                        setViewing(a);
                        logAnswers(user, a, "review", w.exam);
                      }}
                    >
                      <Eye className="size-4" /> مراجعة الإجابات
                    </Button>
                  )}
                </li>
              );
            })}
        </ul>
      )}
      <AnswersDrawer a={viewing} onClose={() => setViewing(null)} />
    </Panel>
  );
}
