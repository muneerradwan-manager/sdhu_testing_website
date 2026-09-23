"use client";

import { motion } from "motion/react";
import { Check, FileCheck2, FileText, FolderLock, Pencil, Plus, RefreshCw, ShieldCheck, Trash2, Upload, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { SEASON } from "@/lib/season";
import { useSeason } from "@/lib/season-live";
import { actions, type AdminRecord, type VaultDoc } from "@/lib/store";
import { cn } from "@/lib/utils";
import { DOCUMENTS, LANGUAGES, SKILLS, docState, documentType, logAdmin, nowMs, recordOf, seasonHistory, useAdmin } from "../../_lib/admin";

/** Documents the administration will not accept an application without */
export const REQUIRED_DOCS = ["degree", "record"];

/**
 * The administrator's account is permanent, so his documents, languages and skills stay on the
 * platform between seasons. A new season's application starts from that file instead of an empty
 * form: he keeps what is still valid, updates what expired under the administration's validity rule,
 * adds what is new, and deletes what no longer applies. Every change is written to the file and to
 * the audit trail — the season's application only records which documents it was submitted with.
 */
export function useRecord() {
  const admin = useAdmin()!;
  const rec = recordOf(admin.profile, admin.id);
  const save = (patch: Partial<AdminRecord>, action: string, detail?: string) => {
    actions.upsertAdmin(admin.id, { record: { ...rec, ...patch, updatedAt: nowMs() } });
    logAdmin(admin.id, action, undefined, detail);
  };
  const returning = seasonHistory(admin.id).some((h) => h.roleKey);
  return { rec, save, admin, returning };
}

/** The documents of the file that this season's application is submitted with */
export function attachedDocs(rec: AdminRecord) {
  return rec.documents.filter((d) => docState(d).ok);
}

export function DocumentsStep() {
  const { rec, save, returning } = useRecord();
  const toast = useToast();
  const season = SEASON.hijriYear;
  // The administration sets how long each type stays valid
  const validity = useSeason().documents;
  const [progress, setProgress] = useState<Record<string, number>>({});
  const [confirm, setConfirm] = useState<VaultDoc | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [label, setLabel] = useState("");
  const [adding, setAdding] = useState(false);
  const timers = useRef<number[]>([]);
  useEffect(() => {
    const list = timers.current;
    return () => list.forEach((t) => window.clearInterval(t));
  }, []);

  const simulate = (id: string, done: () => void) => {
    let v = 0;
    setProgress((p) => ({ ...p, [id]: 0 }));
    const t = window.setInterval(() => {
      v = Math.min(100, v + 9 + Math.round(Math.random() * 16));
      setProgress((p) => ({ ...p, [id]: v }));
      if (v >= 100) {
        window.clearInterval(t);
        done();
      }
    }, 130);
    timers.current.push(t);
  };

  /** A copy issued this season: a document the file does not have, or a new copy of an expired one */
  const put = (key: string, text: string, file: string) => {
    const id = `${key}-${season}`;
    if (progress[id] !== undefined) return;
    simulate(id, () => {
      const old = rec.documents.find((d) => d.key === key);
      const doc: VaultDoc = { id, key, label: text, file, issuedSeason: season, addedAt: nowMs(), updatedAt: old ? nowMs() : undefined };
      save(
        { documents: [...rec.documents.filter((d) => d.id !== id && d.id !== old?.id), doc] },
        `${old ? "تحديث" : "إضافة"} وثيقة في ملفه الدائم: ${text}`,
        `نسخة موسم ${season}`,
      );
      toast({ title: old ? "حُدّثت الوثيقة" : "أُضيفت إلى ملفك", body: `${text} — نسخة موسم ${season}`, icon: "📄", tone: "success" });
    });
  };

  const remove = (d: VaultDoc) => {
    save({ documents: rec.documents.filter((x) => x.id !== d.id) }, `حذف وثيقة من ملفه الدائم: ${d.label}`, "بطلب الإداري نفسه");
    setConfirm(null);
    toast({ title: "حُذفت من ملفك", body: `${d.label} — يمكنك رفعها من جديد متى شئت.`, icon: "🗑️", tone: "info" });
  };

  const rename = (d: VaultDoc) => {
    const text = label.trim();
    if (!text) return;
    save({ documents: rec.documents.map((x) => (x.id === d.id ? { ...x, label: text, updatedAt: nowMs() } : x)) }, `تعديل اسم وثيقة في ملفه الدائم: ${text}`);
    setEditing(null);
    toast({ title: "عُدّل الاسم", icon: "✏️", tone: "success" });
  };

  const missing = DOCUMENTS.filter((d) => !rec.documents.some((x) => x.key === d.key));
  const expired = rec.documents.filter((d) => !docState(d, season, validity).ok);

  return (
    <div>
      <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">وثائقك وشهاداتك</h2>
      <p className="mt-2 leading-8 text-ink-soft">
        {returning
          ? "حسابك دائم، فملفك من المواسم السابقة يظهر هنا كما تركته. ما تزال صلاحيته سارية يُرفق بطلب هذا الموسم تلقائياً، وما انتهت صلاحيته تحدّثه بنسخة جديدة. ولك أن تضيف شهادات أخرى، أو تعدّل، أو تحذف."
          : "هذا أول موسم لك، فملفك يبدأ فارغاً. ما ترفعه الآن يبقى في ملفك الدائم ويظهر لك جاهزاً في المواسم القادمة."}
      </p>

      {expired.length > 0 && (
        <p className="mt-5 flex items-start gap-2 rounded-2xl bg-gold/20 p-4 text-sm font-semibold leading-6 text-maroon">
          <RefreshCw className="mt-0.5 size-4 shrink-0" />
          {expired.length} وثيقة انتهت صلاحيتها بحسب المدة التي تحددها الإدارة لكل نوع. حدّثها بنسخة من موسم {season}، ولا تعيد رفع البقية.
        </p>
      )}

      {rec.documents.length > 0 && (
        <>
          <p className="mt-6 flex items-center gap-2 text-sm font-bold text-ink">
            <FolderLock className="size-4 text-gold-dark" /> ملفك الدائم — {rec.documents.length} وثيقة
          </p>
          <ul className="mt-3 space-y-3">
            {rec.documents.map((d) => {
              const st = docState(d, season, validity);
              const type = documentType(d.key);
              const required = REQUIRED_DOCS.includes(d.key);
              const v = progress[`${d.key}-${season}`];
              const busy = v !== undefined && v < 100;
              return (
                <li key={d.id} className={cn("rounded-2xl border-2 p-4 transition", st.ok ? "border-green-light/50 bg-green-light/5" : "border-maroon/40 bg-maroon/5")}>
                  <div className="flex flex-wrap items-center gap-4">
                    <span className={cn("grid size-12 shrink-0 place-items-center rounded-xl", st.ok ? "bg-green-light text-white" : "bg-maroon/15 text-maroon")}>
                      {st.ok ? <FileCheck2 className="size-6" /> : <RefreshCw className="size-6" />}
                    </span>
                    <div className="min-w-0 flex-1">
                      {editing === d.id ? (
                        <div className="flex flex-wrap items-center gap-2">
                          <input value={label} onChange={(e) => setLabel(e.target.value)} className="h-11 min-w-0 flex-1 rounded-xl border-2 border-gold/50 px-3 outline-none focus:border-green-light" aria-label="اسم الشهادة" />
                          <Button size="sm" onClick={() => rename(d)}>حفظ</Button>
                          <Button size="sm" variant="ghost" onClick={() => setEditing(null)}>إلغاء</Button>
                        </div>
                      ) : (
                        <>
                          <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                            {d.label}
                            {required && <Badge tone="maroon">إلزامية</Badge>}
                            {d.key === "custom" && <Badge tone="ink">أضفتها بنفسك</Badge>}
                          </p>
                          <p className="text-xs text-hint">
                            <span dir="ltr" className="font-mono">{d.file}</span> — نسخة موسم {d.issuedSeason}
                            {type && (validity[d.key] ?? type.validSeasons) > 0 && ` — صلاحيتها ${validity[d.key] ?? type.validSeasons} ${(validity[d.key] ?? type.validSeasons) === 1 ? "موسم" : "مواسم"}`}
                          </p>
                          <p className={cn("mt-0.5 text-xs font-bold", st.ok ? "text-green" : "text-maroon")}>{st.ok ? `تُرفق بطلب موسم ${season} — ${st.text}` : st.text}</p>
                        </>
                      )}
                    </div>
                    {editing !== d.id && (
                      <div className="flex flex-wrap items-center gap-2">
                        {busy ? (
                          <span className="font-mono text-sm font-bold text-maroon tabular-nums">{v}%</span>
                        ) : (
                          <Button size="sm" variant={st.ok ? "ghost" : "primary"} onClick={() => put(d.key, d.label, d.file)}>
                            <RefreshCw className="size-4" /> {st.ok ? "تحديث" : "حدّثها الآن"}
                          </Button>
                        )}
                        {d.key === "custom" && (
                          <Button size="sm" variant="ghost" aria-label={`تعديل اسم ${d.label}`} onClick={() => { setEditing(d.id); setLabel(d.label); }}>
                            <Pencil className="size-4" />
                          </Button>
                        )}
                        <Button size="sm" variant="ghost" aria-label={`حذف ${d.label}`} onClick={() => setConfirm(d)}>
                          <Trash2 className="size-4 text-maroon" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {busy && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
                      <motion.div className="h-full bg-gradient-to-l from-maroon to-gold-dark" animate={{ width: `${v}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {missing.length > 0 && (
        <>
          <p className="mt-7 text-sm font-bold text-ink">{rec.documents.length ? "وثائق تطلبها الإدارة وليست في ملفك" : "الوثائق التي تطلبها الإدارة"}</p>
          <ul className="mt-3 space-y-3">
            {missing.map((d) => {
              const v = progress[`${d.key}-${season}`];
              return (
                <li key={d.key} className="rounded-2xl border-2 border-gold/40 bg-white p-4">
                  <div className="flex flex-wrap items-center gap-4">
                    <span className="grid size-12 shrink-0 place-items-center rounded-xl bg-sand text-gold-dark">
                      <FileText className="size-6" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-2 font-bold text-ink">
                        {d.label}
                        {REQUIRED_DOCS.includes(d.key) ? <Badge tone="maroon">إلزامية</Badge> : <Badge tone="ink">تُقوّي الطلب</Badge>}
                      </p>
                      <p className="text-xs text-hint">{d.hint}</p>
                    </div>
                    {v === undefined ? (
                      <Button size="sm" variant="outline" onClick={() => put(d.key, d.label, d.file)}>
                        <Upload className="size-4" /> رفع
                      </Button>
                    ) : (
                      <span className="font-mono text-sm font-bold text-maroon tabular-nums">{v}%</span>
                    )}
                  </div>
                  {v !== undefined && v < 100 && (
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-sand">
                      <motion.div className="h-full bg-gradient-to-l from-maroon to-gold-dark" animate={{ width: `${v}%` }} />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </>
      )}

      {adding ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-green-dark/40 bg-sand p-4">
          <p className="font-bold text-green-dark">إضافة شهادة أخرى إلى ملفك</p>
          <p className="mt-1 text-xs text-hint">مثل: دورة تدريبية، شهادة لغة، رخصة قيادة حافلة، شهادة من أكاديمية الحج.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="اسم الشهادة" className="h-12 min-w-0 flex-1 rounded-2xl border-2 border-gold/50 bg-white px-4 outline-none focus:border-green-light" aria-label="اسم الشهادة" />
            <Button
              disabled={!label.trim()}
              onClick={() => {
                const text = label.trim();
                const id = `custom-${nowMs()}`;
                setAdding(false);
                setLabel("");
                simulate(id, () => {
                  save({ documents: [...rec.documents, { id, key: "custom", label: text, file: "certificate.pdf", issuedSeason: season, addedAt: nowMs() }] }, `إضافة شهادة إلى ملفه الدائم: ${text}`);
                  toast({ title: "أُضيفت الشهادة", body: `${text} — تبقى في ملفك للمواسم القادمة.`, icon: "🏅", tone: "gold" });
                });
              }}
            >
              <Upload className="size-4" /> رفع وإضافة
            </Button>
            <Button variant="ghost" onClick={() => { setAdding(false); setLabel(""); }}>إلغاء</Button>
          </div>
        </div>
      ) : (
        <button type="button" onClick={() => { setAdding(true); setLabel(""); }} className="mt-6 flex items-center gap-2 text-sm font-semibold text-maroon underline">
          <Plus className="size-4" /> إضافة شهادة أخرى إلى ملفي
        </button>
      )}

      <Modal open={!!confirm} onClose={() => setConfirm(null)}>
        {confirm && (
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">حذف «{confirm.label}» من ملفك؟</h3>
            <p className="mt-2 leading-7 text-ink-soft">
              تُحذف من ملفك الدائم فلا تُرفق بطلب هذا الموسم. الطلبات السابقة التي رُفقت بها تبقى كما هي في سجل المنصة، ويمكنك رفعها من جديد في أي وقت.
            </p>
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setConfirm(null)}>تراجع</Button>
              <Button variant="maroon" onClick={() => remove(confirm)}>
                <Trash2 className="size-4" /> احذفها
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

export function SkillsStep() {
  const { rec, save, admin, returning } = useRecord();
  const toast = useToast();
  const history = seasonHistory(admin.id);
  const [text, setText] = useState("");
  const [lang, setLang] = useState("");
  const custom = rec.skills.filter((k) => !SKILLS.some((s) => s.key === k));
  const extraLanguages = rec.languages.filter((l) => !LANGUAGES.some((x) => x === l));

  const setSkill = (key: string, on: boolean) => {
    const label = SKILLS.find((s) => s.key === key)?.label ?? key;
    save({ skills: on ? [...rec.skills, key] : rec.skills.filter((k) => k !== key) }, `${on ? "إضافة" : "حذف"} مهارة في ملفه الدائم: ${label}`);
  };
  const toggleLang = (l: string) => {
    const on = rec.languages.includes(l);
    save({ languages: on ? rec.languages.filter((x) => x !== l) : [...rec.languages, l] }, `${on ? "حذف" : "إضافة"} لغة في ملفه الدائم: ${l}`);
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="font-display text-2xl font-bold text-green-dark md:text-3xl">لغاتك ومهاراتك</h2>
        <p className="mt-2 leading-8 text-ink-soft">
          {returning
            ? "تظهر كما سجّلتها في ملفك الدائم. عدّل ما تغيّر، وأضف ما استجدّ، واحذف ما لم يعد ينطبق."
            : "ما تختاره هنا يُحفظ في ملفك الدائم، ويظهر لك في المواسم القادمة."}
        </p>
      </div>
      <div className="rounded-2xl bg-sand p-5">
        <p className="flex items-center gap-2 text-sm font-bold text-green-dark">
          <ShieldCheck className="size-4" /> الخبرة السابقة (من سجل المنصة — لا تُعدَّل)
        </p>
        <ul className="mt-3 space-y-1.5">
          {history.map((h) => (
            <li key={h.season} className="flex items-center justify-between gap-2 text-sm">
              <span>
                <span className="font-bold">{h.season}</span> — {h.role}
                {h.group && ` — ${h.group}`}
              </span>
              {h.rating && <Badge tone="gold">★ {h.rating}</Badge>}
            </li>
          ))}
        </ul>
      </div>
      <fieldset>
        <legend className="font-bold text-ink">اللغات التي تتحدثها</legend>
        <div className="mt-3 flex flex-wrap gap-2">
          {[...LANGUAGES, ...extraLanguages].map((l) => {
            const on = rec.languages.includes(l);
            return (
              <motion.button whileTap={{ scale: 0.94 }} key={l} type="button" aria-pressed={on} onClick={() => toggleLang(l)} className={cn("flex items-center gap-1.5 rounded-full border-2 px-4 py-2 text-sm font-bold transition", on ? "border-green-dark bg-green-dark text-white" : "border-gold/50 bg-white text-ink-soft hover:border-green-dark/40")}>
                {on && <Check className="size-4" />} {l}
              </motion.button>
            );
          })}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={lang} onChange={(e) => setLang(e.target.value)} placeholder="لغة أخرى" className="h-11 w-44 rounded-2xl border-2 border-gold/50 bg-white px-4 text-sm outline-none focus:border-green-light" aria-label="لغة أخرى" />
          <Button
            size="sm"
            variant="outline"
            disabled={!lang.trim() || rec.languages.includes(lang.trim())}
            onClick={() => {
              const l = lang.trim();
              setLang("");
              save({ languages: [...rec.languages, l] }, `إضافة لغة في ملفه الدائم: ${l}`);
              toast({ title: "أُضيفت اللغة", body: l, icon: "🗣️", tone: "success" });
            }}
          >
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </fieldset>
      <fieldset>
        <legend className="font-bold text-ink">المهارات</legend>
        <ul className="mt-3 space-y-2">
          {SKILLS.map((s) => {
            const on = rec.skills.includes(s.key);
            return (
              <li key={s.key} className="flex items-center justify-between gap-3 rounded-2xl border border-gold/30 bg-white p-3">
                <span className="flex items-center gap-3 font-semibold">
                  <span className="text-2xl">{s.emoji}</span> {s.label}؟
                </span>
                <div className="flex rounded-xl bg-sand p-1" role="radiogroup" aria-label={s.label}>
                  {[true, false].map((val) => (
                    <button key={String(val)} type="button" role="radio" aria-checked={on === val} onClick={() => setSkill(s.key, val)} className={cn("relative rounded-lg px-4 py-1.5 text-sm font-bold", on === val ? (val ? "text-white" : "text-ink") : "text-hint")}>
                      {on === val && <motion.span layoutId={`skill-${s.key}`} className={cn("absolute inset-0 rounded-lg", val ? "bg-green-dark" : "bg-white shadow")} />}
                      <span className="relative">{val ? "نعم" : "لا"}</span>
                    </button>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        {custom.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {custom.map((k) => (
              <span key={k} className="flex items-center gap-2 rounded-full border-2 border-green-dark bg-green-dark px-4 py-2 text-sm font-bold text-white">
                {k}
                <button type="button" aria-label={`حذف ${k}`} onClick={() => setSkill(k, false)} className="grid size-5 place-items-center rounded-full bg-white/20">
                  <X className="size-3" />
                </button>
              </span>
            ))}
          </div>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <input value={text} onChange={(e) => setText(e.target.value)} placeholder="مهارة أخرى" className="h-11 w-56 rounded-2xl border-2 border-gold/50 bg-white px-4 text-sm outline-none focus:border-green-light" aria-label="مهارة أخرى" />
          <Button
            size="sm"
            variant="outline"
            disabled={!text.trim() || rec.skills.includes(text.trim())}
            onClick={() => {
              const k = text.trim();
              setText("");
              save({ skills: [...rec.skills, k] }, `إضافة مهارة في ملفه الدائم: ${k}`);
              toast({ title: "أُضيفت المهارة", body: k, icon: "✨", tone: "success" });
            }}
          >
            <Plus className="size-4" /> إضافة
          </Button>
        </div>
      </fieldset>
    </div>
  );
}
