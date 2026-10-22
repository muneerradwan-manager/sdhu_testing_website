"use client";

import { Check, Mic } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { matches } from "@/lib/ops";
import { rangeLabel, useOperation } from "@/lib/operations";
import type { OralState } from "@/lib/store";
import { cn } from "@/lib/utils";
import { resultOf } from "@/app/administrator/_lib/admin";
import { EXAM_CENTERS, roleLabelOf, useHalls } from "@/app/administrator/_lib/halls";
import { ORAL_STATUS, ORAL_TOPICS, oralActions, oralRoleOf, oralSlots, slotLabel, slotOf } from "@/app/administrator/_lib/oral";
import { useAdminRows, type AdminRow } from "../../_components/data";
import { Drawer, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { Field, FilterSelect, SearchBox, fieldClass } from "../../_components/ops-ui";
import { Box, EmptyRow, ListTable, RowActions, RowLink, Title } from "../../_components/wp";
import { Chip, Segments, type ChipTone } from "./ui";

type Filter = "all" | "none" | OralState["status"];
const TONE: Record<OralState["status"], ChipTone> = { booked: "gold", passed: "green", failed: "maroon", absent: "maroon" };

/**
 * «الامتحان الشفهي»: everyone who passed the written test, where his oral exam stands — no time yet, his booked
 * time before his role's committee in his centre, or its result — and the committee's record of each one: passed or
 * failed with its mark and its word, or absent. Only one who passed both is qualified for the season.
 */
export function OralExams() {
  const user = useStaffUser()!;
  const rows = useAdminRows();
  const halls = useHalls();
  const op = useOperation("admin-orals");
  const [filter, setFilter] = useState<Filter>("all");
  const [role, setRole] = useState("");
  const [center, setCenter] = useState("");
  const [q, setQ] = useState("");
  const [recording, setRecording] = useState<AdminRow | null>(null);
  const may = useCan();
  const canRecord = may("exams.oral.PUT");
  const seePii = may("exams.applicants-pii.GET");

  const due = rows.filter((r) => {
    const res = resultOf(r.profile);
    return !res.exempt && res.written && !!res.published;
  });
  const stateOf = (r: AdminRow): Filter => r.profile.oral?.status ?? "none";
  const centerOf = (r: AdminRow) => slotOf(r.profile.oral?.slotId)?.centerId ?? halls.centerOf(r.id)?.id;
  const shown = due.filter((r) => (filter === "all" || stateOf(r) === filter) && (!role || oralRoleOf(r.profile) === role) && (!center || centerOf(r) === center) && matches(q, [r.name, seePii ? r.id : undefined]));
  const count = (f: Filter) => due.filter((r) => stateOf(r) === f).length;
  const roles = [...new Set(oralSlots().map((s) => s.role))];

  return (
    <div className="space-y-5">
      <Title />
      <p className="text-sm leading-7 text-white/70">
        مواعيد الامتحانات الشفهية {rangeLabel(op.start, op.end)} ({op.open ? "مفتوحة الآن" : op.status === "upcoming" ? "لم تُفتح بعد" : "أُغلقت"}). يحجز كل ناجح في الاختبار المؤتمت موعده أمام لجنة صفته في مركزه، وتسجّل اللجنة نتيجته هنا. لا يتأهل للموسم إلا من نجح فيهما معاً.
      </p>
      <div className="grid gap-2 md:grid-cols-[1.4fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} label="بحث في المتقدمين" placeholder="اسم أو رقم وطني..." />
        <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={roles.map((r) => ({ value: r, label: roleLabelOf(r) }))} />
        <FilterSelect label="المركز" all="كل المراكز" value={center} onChange={setCenter} options={EXAM_CENTERS.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <Segments<Filter>
        label="حال الامتحان الشفهي"
        value={filter}
        onChange={setFilter}
        items={[
          { value: "all", label: "الكل", count: due.length },
          { value: "none", label: "بلا موعد", count: count("none") },
          { value: "booked", label: "محجوز — بانتظار نتيجته", count: count("booked"), tone: "maroon" },
          { value: "passed", label: "ناجحون", count: count("passed") },
          { value: "failed", label: "راسبون", count: count("failed") },
          { value: "absent", label: "غائبون", count: count("absent") },
        ]}
      />
      <ListTable head={["المتقدم", "الصفة", "الموعد", "الحال", "النتيجة"]} minWidth="56rem">
        {shown.map((r) => {
          const o = r.profile.oral;
          const s = slotOf(o?.slotId);
          return (
            <tr key={r.id} className="align-top">
              <td className="p-3">
                <p className="font-bold text-white">{r.name}</p>
                {seePii && <p className="text-xs text-white/55" dir="ltr">{r.id}</p>}
                {o?.status === "booked" && canRecord && (
                  <RowActions>
                    <RowLink onClick={() => setRecording(r)}>تسجيل النتيجة</RowLink>
                  </RowActions>
                )}
              </td>
              <td className="p-3 text-white/85">{r.position}</td>
              <td className="p-3 text-white/80">{s ? <>{slotLabel(s)}<span className="block text-xs text-white/55">{EXAM_CENTERS.find((c) => c.id === s.centerId)?.name}</span></> : <span className="text-white/50">لم يحجز بعد</span>}</td>
              <td className="p-3">{o ? <Chip tone={TONE[o.status]}>{ORAL_STATUS[o.status]}</Chip> : <Chip tone="muted">بلا موعد</Chip>}</td>
              <td className="p-3 text-xs text-white/75">{o && o.status !== "booked" ? <>{o.score !== undefined ? `${o.score}% — ` : ""}{o.by}{o.note && <span className="block text-white/55">{o.note}</span>}</> : "—"}</td>
            </tr>
          );
        })}
        {shown.length === 0 && <EmptyRow cols={5}>{due.length ? "لا أحد يطابق هذا الاختيار." : "لا ناجحين في الاختبار المؤتمت بعد."}</EmptyRow>}
      </ListTable>

      <Box title="لجان الامتحان الشفهي ومواعيدها" open={false}>
        {roles.map((rk) => {
          const ss = oralSlots().filter((s) => s.role === rk && s.centerId === "damascus");
          return (
            <p key={rk}>
              <b>{roleLabelOf(rk)}:</b> {[...new Set(ss.map((s) => s.day))].join("، ")} — {[...new Set(ss.map((s) => s.time))].join("، ")} في كل مركز، {ss[0]?.seats} مقاعد لكل موعد. اللجنة: {ss[0]?.committee.join("، ")}. تسأل في: {ORAL_TOPICS[rk]}.
            </p>
          );
        })}
      </Box>

      {recording && <RecordSheet r={recording} by={user.name} onClose={() => setRecording(null)} />}
    </div>
  );
}

/** The committee's result for one applicant: passed or failed with a mark and a word, or absent */
function RecordSheet({ r, by, onClose }: { r: AdminRow; by: string; onClose: () => void }) {
  const toast = useToast();
  const may = useCan();
  const s = slotOf(r.profile.oral?.slotId);
  const [status, setStatus] = useState<"passed" | "failed" | "absent">("passed");
  const [score, setScore] = useState("85");
  const [note, setNote] = useState("");
  const save = () => {
    if (!may("exams.oral.PUT")) return;
    oralActions.record(r.id, status, `${by} — ${s?.committee[0] ?? "اللجنة"}`, status === "absent" ? undefined : Math.max(0, Math.min(100, Number(score) || 0)), note.trim() || undefined);
    toast({ title: "سُجّلت نتيجة الامتحان الشفهي", body: `${r.name}: ${ORAL_STATUS[status]}`, tone: "success", icon: "🎙️" });
    onClose();
  };
  return (
    <Drawer
      open
      onClose={onClose}
      title={`نتيجة الامتحان الشفهي — ${r.name}`}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="glass" onClick={onClose}>إلغاء</Button>
          <Button variant="gold" onClick={save}><Check className="size-4" /> حفظ النتيجة</Button>
        </div>
      }
    >
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm text-white/80"><Mic className="size-4 text-gold" /> {s ? `${slotLabel(s)} — ${EXAM_CENTERS.find((c) => c.id === s.centerId)?.name} — اللجنة: ${s.committee.join("، ")}` : "—"}</p>
        <div className="flex gap-1 rounded-2xl bg-white/10 p-1" role="radiogroup" aria-label="النتيجة">
          {(["passed", "failed", "absent"] as const).map((x) => (
            <button key={x} type="button" role="radio" aria-checked={status === x} onClick={() => setStatus(x)} className={cn("flex-1 rounded-xl px-3 py-2 text-sm font-bold", status === x ? "bg-gold text-ink" : "text-white/85")}>
              {ORAL_STATUS[x]}
            </button>
          ))}
        </div>
        {status !== "absent" && (
          <Field label="العلامة (%)">
            <input type="number" min={0} max={100} className={fieldClass} value={score} onChange={(e) => setScore(e.target.value)} />
          </Field>
        )}
        <Field label="ملاحظة اللجنة (يراها المتقدم)">
          <textarea rows={3} className={textareaClass} value={note} onChange={(e) => setNote(e.target.value)} placeholder="مثل: تلاوة متقنة، ويحتاج مراجعة أحكام الرمي" />
        </Field>
      </div>
    </Drawer>
  );
}
