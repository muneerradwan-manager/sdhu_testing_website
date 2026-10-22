"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, ChevronDown, Lock, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import type { PostStepDef } from "@/lib/registration/types";
import { POST_LABEL } from "@/lib/registration/validate";
import { cn } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";
import { Switch, selectClass } from "../../exam/_components/ui";
import { Box, IssuesFor, Kind, ListTable, RowActions, RowLink, Title, move, newId, useRegEditor } from "./editor";
import { QuestionList } from "./questions";

const KIND: Record<PostStepDef["kind"], string> = { system: "أساسية", acknowledge: "إقرار", form: "أسئلة", installment: "دفعة" };

/** What completes each of the platform's steps */
const DONE_BY: Record<string, string> = {
  confirm: "تكتمل حين يوقّع الحاج التعليمات، ومعها الدفعة الأولى لمن قُبل بالقرعة.",
  documents: "تكتمل حين تُعتمد الصورة الشخصية لكل فرد.",
  group: "تكتمل حين يعتمد المكتب عقد المجموعة.",
  payment: "تكتمل حين يُسدَّد ما يستحق فيها.",
  passport: "تكتمل حين يُعتمد جواز كل فرد.",
  medical: "تكتمل حين يكتمل الملف الطبي ويعتمده الفريق الطبي.",
  visa: "تكتمل حين تصدر التأشيرة، ثم ينتقل الحاج إلى ملف الرحلة.",
};

const NEW: { kind: Exclude<PostStepDef["kind"], "system">; label: string; hint: string; emoji: string }[] = [
  { kind: "acknowledge", label: "إقرار", hint: "نص يقرأه الحاج ويوافق عليه", emoji: "📝" },
  { kind: "form", label: "أسئلة", hint: "أسئلة يجيب عنها الحاج", emoji: "🗒️" },
  { kind: "installment", label: "دفعة", hint: "موعد لدفعة من تكلفة الحج", emoji: "💳" },
];

export function StepsList() {
  const ed = useRegEditor();
  const [adding, setAdding] = useState(false);
  const steps = ed.config.postSteps;
  return (
    <div className="space-y-5">
      <Title
        action={
          ed.may("post-steps", "POST") && (
            <span className="relative">
              <button type="button" onClick={() => setAdding(!adding)} aria-expanded={adding} className="inline-flex items-center gap-1.5 rounded-xl border border-gold/60 px-3 py-1.5 text-sm font-bold text-gold hover:bg-gold hover:text-ink">
                <Plus className="size-4" /> إضافة خطوة <ChevronDown className="size-4" />
              </button>
              {adding && (
                <span className="absolute z-10 mt-2 block w-64 overflow-hidden rounded-2xl bg-[#00352f] ring-1 ring-gold/40">
                  {NEW.map((n) => (
                    <Link key={n.kind} href={`/staff/hajj/manage/steps/edit?new=${n.kind}`} className="flex items-start gap-3 p-3 hover:bg-white/10">
                      <span className="text-xl">{n.emoji}</span>
                      <span>
                        <span className="block font-bold text-white">{n.label}</span>
                        <span className="text-xs text-white/60">{n.hint}</span>
                      </span>
                    </Link>
                  ))}
                </span>
              )}
            </span>
          )
        }
      />
      <p className="text-sm text-white/65">يمر بها الحاج بعد قبوله بالترتيب، ولا تُفتح خطوة قبل أن تكتمل التي قبلها.</p>
      <ListTable head={["", "الخطوة", "النوع", "الحالة", "الترتيب"]}>
        {steps.map((s, i) => (
          <tr key={s.id} className={cn("align-top", !s.enabled && "opacity-60")}>
            <td className="w-12 p-3 text-xl">{s.emoji}</td>
            <td className="p-3">
              <Link href={`/staff/hajj/manage/steps/edit?id=${s.id}`} className="font-bold text-white hover:text-gold">
                {i + 1}. {s.title}
              </Link>
              <p className="text-xs text-white/55">{s.short}</p>
              <RowActions>
                <RowLink href={`/staff/hajj/manage/steps/edit?id=${s.id}`}>{ed.may("post-steps", "PUT") ? "تعديل" : "عرض"}</RowLink>
                {ed.may("post-steps", "PUT") && s.kind !== "system" && (
                  <RowLink onClick={() => ed.edit((c) => ({ ...c, postSteps: c.postSteps.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) }), { action: s.enabled ? "إخفاء خطوة" : "إظهار خطوة", area: "steps", detail: s.title, ref: s.id })}>
                    {s.enabled ? "إخفاء" : "إظهار"}
                  </RowLink>
                )}
                {ed.may("post-steps", "DELETE") && s.kind !== "system" && (
                  <RowLink danger onClick={() => ed.edit((c) => ({ ...c, postSteps: c.postSteps.filter((x) => x.id !== s.id) }), { action: "حذف خطوة", area: "steps", detail: s.title, ref: s.id })}>
                    حذف
                  </RowLink>
                )}
              </RowActions>
              <IssuesFor refs={[s.id]} where={s.kind === "system" && s.system ? POST_LABEL[s.system] : undefined} />
            </td>
            <td className="p-3">
              <Kind tone={s.kind === "system" ? "gold" : "muted"}>
                {s.kind === "system" && <Lock className="me-1 size-3" />}
                {KIND[s.kind]}
              </Kind>
            </td>
            <td className="p-3">{s.enabled ? <Kind tone="green">ظاهرة</Kind> : <Kind tone="maroon">مخفية</Kind>}</td>
            <td className="p-3">
              {ed.may("post-steps", "PUT") && (
                <span className="flex">
                  <button type="button" aria-label={`نقل ${s.title} إلى الأعلى`} disabled={i === 0} onClick={() => ed.edit((c) => ({ ...c, postSteps: move(c.postSteps, i, -1) }), { action: "ترتيب الخطوات", area: "steps", detail: `${s.title} ↑`, ref: s.id })} className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-25">
                    <ArrowUp className="size-4" />
                  </button>
                  <button type="button" aria-label={`نقل ${s.title} إلى الأسفل`} disabled={i === steps.length - 1} onClick={() => ed.edit((c) => ({ ...c, postSteps: move(c.postSteps, i, 1) }), { action: "ترتيب الخطوات", area: "steps", detail: `${s.title} ↓`, ref: s.id })} className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-25">
                    <ArrowDown className="size-4" />
                  </button>
                </span>
              )}
            </td>
          </tr>
        ))}
      </ListTable>
      <p className="text-xs leading-6 text-white/55">
        <Lock className="me-1 inline size-3" /> الخطوات <b>الأساسية</b> يعمل فيها نظام المنصة: تُعدَّل كلماتها، ولا تُحذف، ولا يتقدّم بعضها على ما يحتاجه (الجواز بعد الدفعة، والملف الطبي بعد المجموعة).
      </p>
    </div>
  );
}

export function StepEditor() {
  const params = useSearchParams();
  const ed = useRegEditor();
  const id = params.get("id");
  const kind = params.get("new") as PostStepDef["kind"] | null;
  const existing = ed.config.postSteps.find((s) => s.id === id);
  const n = NEW.find((x) => x.kind === kind) ?? NEW[0];
  const blank: PostStepDef = { id: newId("step"), kind: n.kind, title: "", short: "", emoji: n.emoji, question: "كيف تقيّم وضوح هذه الخطوة؟", enabled: true, fields: [], ackText: n.kind === "acknowledge" ? "" : undefined };
  return <Editor key={`${ed.season}-${id ?? kind}-${existing ? "found" : "new"}`} initial={existing ?? blank} />;
}

function Editor({ initial }: { initial: PostStepDef }) {
  const ed = useRegEditor();
  const toast = useToast();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const set = (p: Partial<PostStepDef>) => setS((x) => ({ ...x, ...p }));
  const at = ed.config.postSteps.findIndex((x) => x.id === s.id);
  const isNew = at < 0;
  const others = ed.config.postSteps.filter((x) => x.id !== s.id);
  const visaAt = others.findIndex((x) => x.system === "visa");
  // The first step stays first («__first»); a new one goes before the visa
  const [after, setAfter] = useState(at === 0 ? "__first" : at > 0 ? ed.config.postSteps[at - 1].id : (others[Math.max(0, visaAt - 1)]?.id ?? others[0]?.id));
  const stored = ed.config.postSteps[at];
  const dirty = !stored || JSON.stringify(s) !== JSON.stringify(stored) || after !== (at === 0 ? "__first" : ed.config.postSteps[at - 1]?.id);
  const system = s.kind === "system";
  // A new step needs adding, a stored one changing
  const ro = !ed.may("post-steps", isNew ? "POST" : "PUT");

  const save = () => {
    if (!s.title.trim()) return toast({ title: "اكتب عنوان الخطوة أولاً", icon: "✏️", tone: "gold" });
    const ok = ed.edit(
      (c) => {
        const rest = c.postSteps.filter((x) => x.id !== s.id);
        const to = after === "__first" ? 0 : rest.findIndex((x) => x.id === after) + 1;
        return { ...c, postSteps: [...rest.slice(0, to), s, ...rest.slice(to)] };
      },
      { action: isNew ? "إضافة خطوة بعد القبول" : "تعديل خطوة بعد القبول", area: "steps", detail: s.title, ref: s.id },
    );
    if (!ok) return;
    toast({ title: isNew ? "أُضيفت الخطوة" : "حُفظت الخطوة", body: "لا يراها الحجاج حتى «نشر التغييرات» في الأعلى.", icon: "💾", tone: "success" });
    if (isNew) router.replace(`/staff/hajj/manage/steps/edit?id=${s.id}`);
  };

  return (
    <div>
      <div className="mb-5">
        <Link href="/staff/hajj/manage/steps" className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          <ArrowRight className="size-4" /> كل الخطوات
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{isNew ? `إضافة خطوة: ${KIND[s.kind]}` : `تعديل «${s.title}»`}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <fieldset disabled={ro} className="min-w-0 space-y-5">
          {system && s.system && (
            <p className="flex items-start gap-2 rounded-2xl bg-gold/10 p-4 text-sm leading-7 text-white/85 ring-1 ring-gold/30">
              <ShieldCheck className="mt-1 size-4 shrink-0 text-gold" /> خطوة أساسية: {DONE_BY[s.system]} تُعدَّل هنا كلماتها فقط.
            </p>
          )}
          <div className="flex gap-3">
            <input value={s.emoji} onChange={(e) => set({ emoji: e.target.value })} aria-label="الرمز" className="h-16 w-20 rounded-2xl border-2 border-white/15 bg-white/10 text-center text-3xl outline-none focus:border-gold" />
            <input value={s.title} onChange={(e) => set({ title: e.target.value })} placeholder="عنوان الخطوة" aria-label="العنوان" className="h-16 min-w-0 flex-1 rounded-2xl border-2 border-white/15 bg-white/10 px-5 font-display text-2xl font-bold text-white outline-none placeholder:text-white/35 focus:border-gold" />
          </div>
          <input value={s.short} onChange={(e) => set({ short: e.target.value })} placeholder="سطر قصير يظهر تحت العنوان في شريط الخطوات" aria-label="السطر القصير" className={smallInputClass} />
          <textarea rows={3} value={s.instructions ?? ""} onChange={(e) => set({ instructions: e.target.value || undefined })} placeholder="تعليمات تظهر للحاج في هذه الخطوة (اختياري)" aria-label="التعليمات" className={textareaClass} />

          {s.kind === "acknowledge" && (
            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <h2 className="mb-2 font-bold text-white">النص الذي يوافق عليه الحاج</h2>
              <textarea rows={6} value={s.ackText ?? ""} onChange={(e) => set({ ackText: e.target.value })} className={textareaClass} aria-label="نص الإقرار" placeholder="مثال: أقرّ بأنني قرأت تعليمات السكن وألتزم بها." />
            </section>
          )}
          {s.kind === "form" && (
            <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
              <h2 className="mb-3 font-bold text-white">الأسئلة</h2>
              <QuestionList fields={s.fields} onChange={(fields) => set({ fields })} before={[]} />
            </section>
          )}
          {s.kind === "installment" && (
            <p className="rounded-2xl bg-white/[.06] p-4 text-sm leading-7 text-white/80 ring-1 ring-white/10">
              بعد حفظ الخطوة، اختر من «
              <Link href="/staff/hajj/manage/payments" className="font-bold text-gold underline">
                الدفعات والمسارات
              </Link>
              » أيّ دفعة تُدفع فيها.
            </p>
          )}
          <label className="block text-sm text-white/70">
            سؤال التقييم بعد اكتمال الخطوة
            <input value={s.question} onChange={(e) => set({ question: e.target.value })} className={cn(smallInputClass, "mt-1")} />
          </label>
          <IssuesFor refs={[s.id]} />
        </fieldset>
        <aside className="space-y-4">
          {!ro && (
            <Box title="الحفظ">
              {!system && (
                <span className="flex items-center gap-2 font-bold text-white">
                  <Switch on={s.enabled} onChange={(v) => set({ enabled: v })} label="ظاهرة للحجاج" /> {s.enabled ? "ظاهرة للحجاج" : "مخفية"}
                </span>
              )}
              <Button variant="gold" className="w-full" onClick={save} disabled={!dirty}>
                <Save className="size-4" /> {isNew ? "إضافة الخطوة" : "حفظ"}
              </Button>
              <p className="text-xs leading-5 text-white/55">{dirty ? "لديك تعديلات لم تُحفظ." : "محفوظة."} تظهر للحجاج بعد «نشر التغييرات».</p>
              {!isNew && !system && ed.may("post-steps", "DELETE") && (
                <button
                  type="button"
                  onClick={() => {
                    ed.edit((c) => ({ ...c, postSteps: c.postSteps.filter((x) => x.id !== s.id) }), { action: "حذف خطوة", area: "steps", detail: s.title, ref: s.id });
                    router.push("/staff/hajj/manage/steps");
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#ffb4c8] hover:underline"
                >
                  <Trash2 className="size-3.5" /> حذف الخطوة
                </button>
              )}
            </Box>
          )}
          <Box title="مكانها">
            <label className="block">
              تأتي بعد
              <select value={after} onChange={(e) => setAfter(e.target.value)} className={cn(selectClass, "mt-1")} disabled={ro}>
                <option value="__first">— في البداية —</option>
                {others.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.title}
                  </option>
                ))}
              </select>
            </label>
          </Box>
        </aside>
      </div>
    </div>
  );
}
