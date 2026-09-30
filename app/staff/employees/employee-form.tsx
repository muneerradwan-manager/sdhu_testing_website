"use client";

import { Save } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CURRENT_SEASON, GOVERNORATES, JOB_TITLES, MISSIONS, fold, type Employee, type Mission } from "@/lib/ops";
import { cn, digitsOnly } from "@/lib/utils";
import { textareaClass } from "../_components/kit";
import { Field, fieldClass, selectClass } from "../_components/ops-ui";

const LANGUAGES = ["العربية", "الإنكليزية", "التركية", "الفرنسية", "الأوردو", "الإندونيسية", "الفارسية"];
const ORGS = ["وزارة الأوقاف", "وزارة الصحة", "الهلال الأحمر العربي السوري", "وزارة الإعلام", "وزارة الداخلية — إدارة الهجرة والجوازات", "وزارة النقل"];

export type Draft = Omit<Employee, "id"> & { id?: string };

export const emptyDraft = (): Draft => ({
  firstName: "",
  fatherName: "",
  surname: "",
  gender: "male",
  birthYear: 1985,
  nationalId: "",
  city: "دمشق",
  jobTitle: "مساعد إداري",
  mission: "البعثة الإدارية",
  kind: "permanent",
  phoneSy: "",
  languages: ["العربية"],
  seasons: [CURRENT_SEASON],
});

/**
 * Add or edit one employee. The fields are the operations app's profile: three-part name, gender,
 * birth year, national number, governorate, job title, mission, permanent or delegated (and by whom),
 * the Syrian and Saudi numbers, and languages. Registration for this season is a switch here too.
 */
export function EmployeeForm({ initial, all, onSave, onCancel }: { initial: Draft; all: Employee[]; onSave: (d: Draft) => void; onCancel: () => void }) {
  const [d, setD] = useState<Draft>(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((x) => ({ ...x, [k]: v }));

  const idTaken = d.nationalId && all.some((e) => e.nationalId === d.nationalId && e.id !== d.id);
  const nameTaken = all.some((e) => e.id !== d.id && fold(`${e.firstName} ${e.fatherName} ${e.surname}`) === fold(`${d.firstName} ${d.fatherName} ${d.surname}`));
  const errors: Partial<Record<keyof Draft, string>> = {};
  if (!d.firstName.trim()) errors.firstName = "مطلوب";
  if (!d.fatherName.trim()) errors.fatherName = "مطلوب";
  if (!d.surname.trim()) errors.surname = "مطلوب";
  if (!/^\d{11}$/.test(d.nationalId)) errors.nationalId = "11 رقماً";
  else if (idTaken) errors.nationalId = "هذا الرقم مسجّل لموظف آخر";
  if (digitsOnly(d.phoneSy).length < 10) errors.phoneSy = "رقم سوري كامل";
  if (d.kind === "external" && !d.organization?.trim()) errors.organization = "اذكر الجهة التي انتدبته";
  const valid = Object.keys(errors).length === 0;

  const participates = d.seasons.includes(CURRENT_SEASON);
  const err = (k: keyof Draft) => tried && errors[k] && <span className="mt-1 block text-[11px] font-bold text-[#ffb4c8]">{errors[k]}</span>;
  const ring = (k: keyof Draft) => tried && errors[k] && "border-maroon/80";

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid) onSave({ ...d, firstName: d.firstName.trim(), fatherName: d.fatherName.trim(), surname: d.surname.trim(), organization: d.kind === "external" ? d.organization?.trim() : undefined });
      }}
      className="space-y-5"
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="الاسم الأول">
          <input value={d.firstName} onChange={(e) => set("firstName", e.target.value)} className={cn(fieldClass, ring("firstName"))} autoFocus />
          {err("firstName")}
        </Field>
        <Field label="اسم الأب">
          <input value={d.fatherName} onChange={(e) => set("fatherName", e.target.value)} className={cn(fieldClass, ring("fatherName"))} />
          {err("fatherName")}
        </Field>
        <Field label="الكنية">
          <input value={d.surname} onChange={(e) => set("surname", e.target.value)} className={cn(fieldClass, ring("surname"))} />
          {err("surname")}
        </Field>
      </div>
      {nameTaken && <p className="-mt-2 rounded-xl bg-gold/10 px-3 py-2 text-xs text-gold ring-1 ring-gold/30">يوجد موظف آخر بالاسم نفسه. تأكد من أنه ليس الشخص ذاته قبل الحفظ.</p>}

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="الجنس">
          <select value={d.gender} onChange={(e) => set("gender", e.target.value as Draft["gender"])} className={selectClass}>
            <option value="male">ذكر</option>
            <option value="female">أنثى</option>
          </select>
        </Field>
        <Field label="سنة الميلاد">
          <input type="number" min={1950} max={2005} value={d.birthYear} onChange={(e) => set("birthYear", Number(e.target.value))} className={fieldClass} dir="ltr" />
        </Field>
        <Field label="الرقم الوطني">
          <input inputMode="numeric" maxLength={11} value={d.nationalId} onChange={(e) => set("nationalId", digitsOnly(e.target.value))} className={cn(fieldClass, "tabular-nums", ring("nationalId"))} dir="ltr" />
          {err("nationalId")}
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="المحافظة">
          <select value={d.city} onChange={(e) => set("city", e.target.value)} className={selectClass}>
            {GOVERNORATES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="المسمى الوظيفي">
          <select value={d.jobTitle} onChange={(e) => set("jobTitle", e.target.value)} className={selectClass}>
            {JOB_TITLES.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
        <Field label="البعثة">
          <select value={d.mission} onChange={(e) => set("mission", e.target.value as Mission)} className={selectClass}>
            {MISSIONS.map((g) => (
              <option key={g}>{g}</option>
            ))}
          </select>
        </Field>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_2fr]">
        <Field label="نوع الموظف">
          <select value={d.kind} onChange={(e) => set("kind", e.target.value as Draft["kind"])} className={selectClass}>
            <option value="permanent">موظف دائم في الإدارة</option>
            <option value="external">منتدب من جهة أخرى</option>
          </select>
        </Field>
        {d.kind === "external" && (
          <Field label="الجهة المنتدِبة" hint="المنتدب يشارك في موسم بعينه، ويبقى موظفاً في جهته الأصلية.">
            <input list="orgs" value={d.organization ?? ""} onChange={(e) => set("organization", e.target.value)} className={cn(fieldClass, ring("organization"))} />
            <datalist id="orgs">
              {ORGS.map((o) => (
                <option key={o} value={o} />
              ))}
            </datalist>
            {err("organization")}
          </Field>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="هاتف سوريا">
          <input value={d.phoneSy} onChange={(e) => set("phoneSy", e.target.value)} placeholder="09xx xxx xxx" className={cn(fieldClass, "tabular-nums", ring("phoneSy"))} dir="ltr" />
          {err("phoneSy")}
        </Field>
        <Field label="هاتف السعودية" hint="يُضاف بعد استلام الشريحة هناك">
          <input value={d.phoneSa ?? ""} onChange={(e) => set("phoneSa", e.target.value || undefined)} placeholder="+966 5x xxx xxxx" className={cn(fieldClass, "tabular-nums")} dir="ltr" />
        </Field>
        <Field label="البريد الإلكتروني">
          <input type="email" value={d.email ?? ""} onChange={(e) => set("email", e.target.value || undefined)} className={fieldClass} dir="ltr" />
        </Field>
      </div>

      <Field label="اللغات">
        <div className="flex flex-wrap gap-2">
          {LANGUAGES.map((l) => {
            const on = d.languages.includes(l);
            return (
              <button
                key={l}
                type="button"
                aria-pressed={on}
                onClick={() => set("languages", on ? d.languages.filter((x) => x !== l) : [...d.languages, l])}
                className={cn("rounded-full px-3 py-1.5 text-sm font-bold ring-1 transition", on ? "bg-gold text-ink ring-gold" : "bg-white/5 text-white/80 ring-white/20 hover:ring-gold/50")}
              >
                {l}
              </button>
            );
          })}
        </div>
      </Field>

      <label className={cn("flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 transition", participates ? "bg-green-light/15 ring-green-light/40" : "bg-white/5 ring-white/15")}>
        <input
          type="checkbox"
          checked={participates}
          onChange={(e) => set("seasons", e.target.checked ? [...d.seasons, CURRENT_SEASON].sort() : d.seasons.filter((y) => y !== CURRENT_SEASON))}
          className="mt-1 size-4 accent-[#D9C89E]"
        />
        <span>
          <span className="block font-bold text-white">مشارك في موسم {CURRENT_SEASON}</span>
          <span className="block text-xs leading-5 text-white/65">لا يظهر في قوائم الإسناد في الملفات التشغيلية إلا المشاركون في الموسم.</span>
        </span>
      </label>

      <Field label="ملاحظات">
        <textarea rows={2} value={d.notes ?? ""} onChange={(e) => set("notes", e.target.value || undefined)} className={textareaClass} />
      </Field>

      <div className="flex flex-wrap justify-end gap-2 border-t border-white/10 pt-4">
        <Button type="button" variant="glass" onClick={onCancel}>
          إلغاء
        </Button>
        <Button type="submit" variant="gold">
          <Save className="size-4" /> {d.id ? "حفظ التعديلات" : "إضافة الموظف"}
        </Button>
      </div>
      {tried && !valid && <p className="text-left text-xs font-bold text-[#ffb4c8]">راجع الحقول المعلّمة بالأحمر.</p>}
    </form>
  );
}
