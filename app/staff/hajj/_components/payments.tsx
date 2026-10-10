"use client";

import { Save } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { resolveSchedule } from "@/lib/registration/engine";
import type { InstallmentDef, PaymentsConfig, TrackDef } from "@/lib/registration/types";
import { useSeason } from "@/lib/season-live";
import { cn, formatUSD } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";
import { OperationsPanel } from "../../_components/operations";
import { selectClass } from "../../exam/_components/ui";
import { IssuesFor, useRegEditor } from "./editor";

const ORD = ["الأولى", "الثانية", "الثالثة", "الرابعة"];

export function PaymentsPage() {
  const ed = useRegEditor();
  // The form starts again when the draft it copies changes (another season, changes dropped or restored)
  return (
    <div className="space-y-6">
      <SettingsForm key={`${ed.season}-${JSON.stringify([ed.config.payments, ed.config.tracks, ed.config.postSteps.map((x) => [x.id, x.title, x.enabled])])}`} />
      <OperationsPanel keys={["hajj-direct", "hajj-lottery"]} system="registration" area="payments" title="مواعيد التسجيل" />
    </div>
  );
}

/** One line of a settings form: what it is on one side, the field on the other */
function Row({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid gap-2 border-b border-white/10 py-4 last:border-0 md:grid-cols-[13rem_minmax(0,1fr)]">
      <div>
        <p className="font-bold text-white">{label}</p>
        {hint && <p className="mt-0.5 text-xs leading-5 text-white/55">{hint}</p>}
      </div>
      <div className="min-w-0">{children}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white/[.04] px-5 py-2 ring-1 ring-white/10">
      <h2 className="border-b border-white/10 py-3 font-display text-lg font-bold text-gold">{title}</h2>
      {children}
    </section>
  );
}

/** The installments, the payment methods and the two tracks — one form, saved once */
function SettingsForm() {
  const ed = useRegEditor();
  const { fees } = useSeason();
  const [p, setP] = useState<PaymentsConfig>(ed.config.payments);
  const [tracks, setTracks] = useState<TrackDef[]>(ed.config.tracks);
  const dirty = JSON.stringify(p) !== JSON.stringify(ed.config.payments) || JSON.stringify(tracks) !== JSON.stringify(ed.config.tracks);
  const steps = ed.config.postSteps.filter((s) => s.enabled && (s.kind === "installment" || (s.kind === "system" && s.system === "payment")));
  const resolved = resolveSchedule(p.installments, fees.hajjCost);
  const setI = (i: number, patch: Partial<InstallmentDef>) => setP((x) => ({ ...x, installments: x.installments.map((it, j) => (j === i ? { ...it, ...patch } : it)) }));

  /** How many installments: rows kept, added or dropped at the end; the last one always takes the rest */
  const setCount = (n: number) =>
    setP((x) => {
      const cur = x.installments;
      const list: InstallmentDef[] = Array.from({ length: n }, (_, i) => cur[i] ?? { key: `i${i + 1}`, label: `الدفعة ${ORD[i]}`, amount: null, dueStep: steps[steps.length - 1]?.id, dueLabel: cur[cur.length - 1]?.dueLabel ?? "" });
      // A new count starts from the cost split evenly (rounded to 50 $), the last taking the rest: always a valid
      // schedule, which the staff then adjust
      const share = Math.floor(fees.hajjCost / n / 50) * 50;
      return {
        ...x,
        installments: list.map((it, i) => ({
          ...it,
          key: `i${i + 1}`,
          label: n === 1 && i === 0 ? "تكلفة الحج كاملة" : it.label === "تكلفة الحج كاملة" ? `الدفعة ${ORD[i]}` : it.label,
          amount: i === n - 1 ? null : share,
          dueStep: i === 0 ? undefined : (it.dueStep ?? steps[0]?.id),
        })),
      };
    });

  const save = () =>
    ed.edit((c) => ({ ...c, payments: p, tracks }), {
      action: "تعديل الدفعات والمسارات",
      area: "payments",
      detail: `${p.installments.length} دفعات: ${resolved.map((r) => `${r.label} ${r.perPerson} $`).join("، ")}`,
    });

  return (
    <fieldset disabled={ed.readOnly} className="space-y-6">
      <Section title="دفعات تكلفة الحج">
        <Row label="تكلفة الحج للفرد" hint="تُغيَّر من «إعدادات الموسم» عند مديرة الموسم.">
          <p className="pt-2 font-display text-xl font-bold text-white">{formatUSD(fees.hajjCost)}</p>
        </Row>
        <Row label="عدد الدفعات">
          <select value={p.installments.length} onChange={(e) => setCount(Number(e.target.value))} className={cn(selectClass, "w-48")} aria-label="عدد الدفعات">
            <option value={1}>دفعة واحدة كاملة</option>
            <option value={2}>دفعتان</option>
            <option value={3}>ثلاث دفعات</option>
            <option value={4}>أربع دفعات</option>
          </select>
        </Row>
        {p.installments.map((it, i) => {
          const last = i === p.installments.length - 1;
          return (
            <Row key={i} label={it.label || `الدفعة ${ORD[i]}`} hint={i === 0 ? "تُدفع مع التسجيل على القبول المباشر، أو عند تثبيت القبول بالقرعة." : undefined}>
              <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_9rem]">
                <input value={it.label} onChange={(e) => setI(i, { label: e.target.value })} className={smallInputClass} aria-label={`اسم الدفعة ${i + 1}`} />
                {last ? (
                  <span className="flex h-11 items-center rounded-xl bg-black/20 px-3 text-sm text-white/80" title="آخر دفعة هي الباقي، فيبقى المجموع مساوياً للتكلفة">
                    الباقي: {formatUSD(resolved[i].perPerson)}
                  </span>
                ) : (
                  <label className="relative">
                    <input type="number" min={0} step={50} value={it.amount ?? ""} onChange={(e) => setI(i, { amount: e.target.value === "" ? 0 : Number(e.target.value) })} className={cn(smallInputClass, "pl-8")} dir="ltr" aria-label={`مبلغ الدفعة ${i + 1} للفرد`} />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-white/60">$</span>
                  </label>
                )}
              </div>
              {i > 0 && (
                <div className="mt-2 grid gap-2 sm:grid-cols-2">
                  <label className="text-xs text-white/65">
                    يدفعها الحاج في خطوة
                    <select value={it.dueStep ?? ""} onChange={(e) => setI(i, { dueStep: e.target.value })} className={cn(selectClass, "mt-1")}>
                      {steps.map((s) => (
                        <option key={s.id} value={s.id}>
                          «{s.title}»
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="text-xs text-white/65">
                    موعدها كما يقرؤه الحاج
                    <input value={it.dueLabel} onChange={(e) => setI(i, { dueLabel: e.target.value })} className={cn(smallInputClass, "mt-1")} placeholder="مثال: عند الانضمام إلى مجموعة" />
                  </label>
                </div>
              )}
            </Row>
          );
        })}
        {p.installments.length > 1 && steps.length < 2 && (
          <p className="py-2 text-xs leading-5 text-white/55">لتُدفع دفعة في موعد آخر، أضف خطوة «دفعة» في «الخطوات بعد القبول» ثم اخترها هنا.</p>
        )}
        <Row label="مثال لعائلة من 4 أفراد">
          <p className="pt-1 text-sm text-white/85">
            {resolved.map((r) => `${r.label}: ${formatUSD(r.perPerson * 4)}`).join(" — ")}
          </p>
        </Row>
        <IssuesFor where="الدفعات" />
      </Section>

      <Section title="الدفع">
        <Row label="طرق الدفع" hint="الطرق المربوطة بالمنصة. طريقة أخرى تحتاج ربطاً تقنياً جديداً.">
          <label className="flex items-center gap-2 py-1 text-white">
            <input type="checkbox" checked={p.methods.shamcash} onChange={(e) => setP((x) => ({ ...x, methods: { ...x.methods, shamcash: e.target.checked } }))} className="size-4 accent-[#D9C89E]" /> شام كاش
          </label>
          <label className="flex items-center gap-2 py-1 text-white">
            <input type="checkbox" checked={p.methods.bank} onChange={(e) => setP((x) => ({ ...x, methods: { ...x.methods, bank: e.target.checked } }))} className="size-4 accent-[#D9C89E]" /> المصرف المعتمد (بإشعار دفع)
          </label>
        </Row>
        <Row label="الهدي والسكن الخاص" hint={`الهدي ${formatUSD(fees.hady)} للفرد، من «إعدادات الموسم».`}>
          <label className="text-xs text-white/65">
            يُدفعان في خطوة
            <select value={p.extrasStep} onChange={(e) => setP((x) => ({ ...x, extrasStep: e.target.value }))} className={cn(selectClass, "mt-1 w-full max-w-xs")}>
              {steps.map((s) => (
                <option key={s.id} value={s.id}>
                  «{s.title}»
                </option>
              ))}
            </select>
          </label>
        </Row>
      </Section>

      <Section title="مسارا التسجيل">
        {tracks.map((t) => (
          <Row key={t.key} label={t.key === "direct" ? "القبول المباشر" : "القرعة"} hint={t.key === "direct" ? `لمن بلغ صاحب طلبه عمر القبول المباشر.` : "طلب برسم التسجيل وحده، ثم القرعة."}>
            <label className="mb-2 flex items-center gap-2 text-white">
              <input type="checkbox" checked={t.enabled} onChange={(e) => setTracks((ts) => ts.map((x) => (x.key === t.key ? { ...x, enabled: e.target.checked } : x)))} className="size-4 accent-[#D9C89E]" /> متاح هذا الموسم
            </label>
            <div className="grid gap-2 sm:grid-cols-[4rem_minmax(0,1fr)]">
              <input value={t.icon} onChange={(e) => setTracks((ts) => ts.map((x) => (x.key === t.key ? { ...x, icon: e.target.value } : x)))} className={cn(smallInputClass, "text-center")} aria-label="الرمز" />
              <input value={t.label} onChange={(e) => setTracks((ts) => ts.map((x) => (x.key === t.key ? { ...x, label: e.target.value } : x)))} className={smallInputClass} aria-label={`اسم ${t.label}`} />
            </div>
            <textarea rows={2} value={t.description} onChange={(e) => setTracks((ts) => ts.map((x) => (x.key === t.key ? { ...x, description: e.target.value } : x)))} className={cn(textareaClass, "mt-2")} placeholder="الوصف تحت الخيار (فارغ = وصف المنصة بمواعيده ونسبته)" aria-label={`وصف ${t.label}`} />
          </Row>
        ))}
        <IssuesFor where="مسارات التسجيل" />
      </Section>

      {!ed.readOnly && (
        <div className="flex items-center gap-3">
          <Button variant="gold" onClick={save} disabled={!dirty}>
            <Save className="size-4" /> حفظ التغييرات
          </Button>
          {dirty && (
            <>
              <Button
                variant="glass"
                onClick={() => {
                  setP(ed.config.payments);
                  setTracks(ed.config.tracks);
                }}
              >
                تراجع
              </Button>
              <span className="text-xs text-white/60">لديك تعديلات لم تُحفظ.</span>
            </>
          )}
        </div>
      )}
    </fieldset>
  );
}
