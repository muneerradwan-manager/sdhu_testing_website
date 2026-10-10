"use client";

import { motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Info } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Question } from "@/app/portal/apply/_components/ui";
import { evalCondition, type FactContext } from "@/lib/registration/conditions";
import { fill, membersAsked, type AnswerError } from "@/lib/registration/engine";
import type { AnswerValue, Answers, ContentBlock, FieldDef, StageDef } from "@/lib/registration/types";
import { fullName } from "@/lib/registry";
import { cn } from "@/lib/utils";

type Tokens = Record<string, string | number | undefined>;

/**
 * A stage the administration wrote, as the pilgrim sees it: its text, its blocks and its questions, in the
 * same large, one-thing-at-a-time look as the platform's own stages. The staff's preview shows the very same.
 */
export function ContentBlocks({ blocks, tokens }: { blocks: ContentBlock[]; tokens: Tokens }) {
  return (
    <div className="space-y-4">
      {blocks.map((b, i) => {
        if (b.kind === "paragraph") return <p key={b.id} className="text-lg leading-8 text-ink-soft whitespace-pre-line">{fill(b.text, tokens)}</p>;
        if (b.kind === "notice")
          return (
            <p key={b.id} className={cn("flex items-start gap-3 rounded-2xl p-4 leading-7", b.tone === "warn" ? "bg-gold/25 font-semibold text-maroon" : "bg-green-light/10 text-green-dark")}>
              {b.tone === "warn" ? <AlertTriangle className="mt-1 size-5 shrink-0" /> : <Info className="mt-1 size-5 shrink-0" />}
              <span className="whitespace-pre-line">{fill(b.text, tokens)}</span>
            </p>
          );
        if (b.kind === "checklist")
          return (
            <ul key={b.id} className="space-y-2 rounded-3xl bg-sand p-5">
              {b.items.map((it) => (
                <li key={it.id} className="flex items-start gap-3 leading-7">
                  <span className="mt-1 grid size-5 shrink-0 place-items-center rounded-full bg-green-dark text-white">
                    <Check className="size-3.5" />
                  </span>
                  {fill(it.text, tokens)}
                </li>
              ))}
            </ul>
          );
        return (
          <div key={b.id} className="grid gap-3 md:grid-cols-3">
            {b.items.map((x, j) => (
              <motion.div key={x.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 + (i + j) * 0.08 }} className="rounded-3xl bg-sand p-5">
                <span className="text-3xl">{x.emoji}</span>
                <p className="mt-2 font-bold">{fill(x.title, tokens)}</p>
                <p className="text-sm text-ink-soft">{fill(x.text, tokens)}</p>
              </motion.div>
            ))}
          </div>
        );
      })}
    </div>
  );
}

const inputClass = "h-14 w-full rounded-2xl border-2 border-gold/50 bg-white px-4 text-lg outline-none transition focus:border-green-dark focus:ring-4 focus:ring-green-dark/10";

export function FieldInput({ field, value, onChange, error, idPrefix = "" }: { field: FieldDef; value: AnswerValue | undefined; onChange: (v: AnswerValue | undefined) => void; error?: string; idPrefix?: string }) {
  const id = `${idPrefix}f-${field.key}`;
  const opts = field.options ?? [];
  let control: ReactNode;
  switch (field.type) {
    case "textarea":
      control = <textarea id={id} rows={4} value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} className={cn(inputClass, "h-auto py-3")} />;
      break;
    case "number":
      control = <input id={id} type="number" inputMode="numeric" min={field.min} max={field.max} value={value === undefined ? "" : String(value)} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} className={inputClass} dir="ltr" />;
      break;
    case "date":
      control = <input id={id} type="date" value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={inputClass} dir="ltr" />;
      break;
    case "select":
      control = (
        <select id={id} value={String(value ?? "")} onChange={(e) => onChange(e.target.value || undefined)} className={inputClass}>
          <option value="">اختر…</option>
          {opts.map((o) => (
            <option key={o.id} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      );
      break;
    case "radio":
    case "yesno": {
      const list = field.type === "yesno" ? [{ id: "y", value: "yes", label: "نعم" }, { id: "n", value: "no", label: "لا" }] : opts;
      const cur = field.type === "yesno" ? (value === true ? "yes" : value === false ? "no" : undefined) : value;
      control = (
        <div role="radiogroup" aria-labelledby={`${id}-l`} className="grid gap-3 sm:grid-cols-2">
          {list.map((o) => (
            <button
              key={o.id}
              type="button"
              role="radio"
              aria-checked={cur === o.value}
              onClick={() => onChange(field.type === "yesno" ? o.value === "yes" : o.value)}
              className={cn("min-h-14 rounded-2xl border-2 px-4 py-3 text-right text-lg font-bold transition", cur === o.value ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white hover:border-gold-dark")}
            >
              {o.label}
            </button>
          ))}
        </div>
      );
      break;
    }
    case "checkboxes": {
      const vals = Array.isArray(value) ? value : [];
      control = (
        <div className="flex flex-wrap gap-2">
          {opts.map((o) => {
            const on = vals.includes(o.value);
            return (
              <button
                key={o.id}
                type="button"
                role="checkbox"
                aria-checked={on}
                onClick={() => onChange(on ? vals.filter((v) => v !== o.value) : [...vals, o.value])}
                className={cn("flex items-center gap-2 rounded-full border-2 px-4 py-2 font-bold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white hover:border-gold-dark")}
              >
                {on && <Check className="size-4" />} {o.label}
              </button>
            );
          })}
        </div>
      );
      break;
    }
    case "consent":
      control = (
        <label htmlFor={id} className={cn("flex cursor-pointer items-start gap-3 rounded-2xl border-2 p-4 text-lg leading-8", value ? "border-green-dark bg-green-light/10" : "border-gold/50 bg-white")}>
          <input id={id} type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} className="mt-2 size-5 accent-[#00594F]" />
          <span>{field.help || field.label}</span>
        </label>
      );
      break;
    default:
      control = <input id={id} type="text" value={String(value ?? "")} onChange={(e) => onChange(e.target.value)} maxLength={field.maxLength} className={inputClass} />;
  }
  return (
    <div>
      {field.type !== "consent" && (
        <label id={`${id}-l`} htmlFor={id} className="mb-2 block text-lg font-bold text-ink">
          {field.label} {field.required && <span className="text-maroon">*</span>}
        </label>
      )}
      {field.help && field.type !== "consent" && <p className="mb-2 text-sm leading-6 text-ink-soft">{field.help}</p>}
      {control}
      {error && (
        <p role="alert" className="mt-2 text-sm font-bold text-maroon">
          {error}
        </p>
      )}
    </div>
  );
}

/** A stage's (or a step's) questions: the application's, then each member's under his name */
export function StageFields({
  fields,
  ctx,
  onAnswer,
  onMemberAnswer,
  errors,
}: {
  fields: FieldDef[];
  ctx: FactContext;
  onAnswer: (key: string, v: AnswerValue | undefined) => void;
  onMemberAnswer: (memberId: string, key: string, v: AnswerValue | undefined) => void;
  errors: AnswerError[];
}) {
  const app = fields.filter((f) => f.scope === "application" && evalCondition(f.showIf, ctx));
  const per = fields.filter((f) => f.scope === "member");
  const errOf = (key: string, memberId?: string) => errors.find((e) => e.key === key && e.memberId === memberId)?.message;
  return (
    <div className="space-y-6">
      {app.map((f) => (
        <FieldInput key={f.id} field={f} value={ctx.answers[f.key]} onChange={(v) => onAnswer(f.key, v)} error={errOf(f.key)} />
      ))}
      {ctx.members
        .filter((m) => per.some((f) => membersAsked(f, ctx).includes(m)))
        .map((m) => (
          <fieldset key={m.person.id} className="rounded-3xl border-2 border-gold/40 p-4 md:p-5">
            <legend className="px-2 font-display text-lg font-bold text-green-dark">{fullName(m.person)}</legend>
            <div className="space-y-5">
              {per
                .filter((f) => membersAsked(f, ctx).includes(m))
                .map((f) => (
                  <FieldInput key={f.id} idPrefix={`${m.person.id}-`} field={f} value={ctx.memberAnswers[m.person.id]?.[f.key]} onChange={(v) => onMemberAnswer(m.person.id, f.key, v)} error={errOf(f.key, m.person.id)} />
                ))}
            </div>
          </fieldset>
        ))}
    </div>
  );
}

/** A content or form stage of the registration, rendered from its definition */
export function ConfiguredStage({
  stage,
  tokens,
  ctx,
  errors,
  gateMessage,
  onAnswer,
  onMemberAnswer,
  onNext,
  onBack,
}: {
  stage: StageDef;
  tokens: Tokens;
  ctx: FactContext;
  errors: AnswerError[];
  gateMessage?: string;
  onAnswer: (key: string, v: AnswerValue | undefined) => void;
  onMemberAnswer: (memberId: string, key: string, v: AnswerValue | undefined) => void;
  onNext: () => void;
  onBack?: () => void;
}) {
  return (
    <Question title={fill(stage.title, tokens)} hint={stage.hint ? fill(stage.hint, tokens) : undefined} speak={fill(stage.title, tokens)}>
      <div className="space-y-8">
        {stage.blocks.length > 0 && <ContentBlocks blocks={stage.blocks} tokens={tokens} />}
        {stage.fields.length > 0 && <StageFields fields={stage.fields} ctx={ctx} onAnswer={onAnswer} onMemberAnswer={onMemberAnswer} errors={errors} />}
      </div>
      {gateMessage && (
        <p role="alert" className="mt-6 flex items-start gap-3 rounded-2xl bg-maroon/8 p-4 font-bold leading-7 text-maroon">
          <AlertTriangle className="mt-1 size-5 shrink-0" /> {gateMessage}
        </p>
      )}
      <div className={cn("mt-8 flex flex-wrap gap-3", onBack ? "justify-between" : "")}>
        {onBack && (
          <Button variant="ghost" size="lg" onClick={onBack}>
            <ArrowRight className="size-5" /> رجوع
          </Button>
        )}
        <Button size="xl" onClick={onNext}>
          {stage.nextLabel || "متابعة"} <ArrowLeft className="size-6" />
        </Button>
      </div>
    </Question>
  );
}

/** Answers as the store keeps them: a cleared answer is removed, not kept empty */
export function setAnswer(a: Answers, key: string, v: AnswerValue | undefined): Answers {
  const next = { ...a };
  if (v === undefined || v === "" || (Array.isArray(v) && !v.length)) delete next[key];
  else next[key] = v;
  return next;
}
