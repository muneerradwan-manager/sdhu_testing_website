"use client";

import { ArrowLeft, ArrowRight, FileUp, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { Field, inputClass } from "@/components/portal/bits";
import { Button } from "@/components/ui/button";
import { useT } from "@/lib/i18n";
import type { Person } from "@/lib/registry";
import type { CivilClaim } from "@/lib/store";
import { cn } from "@/lib/utils";

/** What the pilgrim may say the registry got wrong (the national number and first name were just matched) */
const FIELDS: { key: keyof Person; label: string; en: string; date?: boolean }[] = [
  { key: "fatherName", label: "اسم الأب", en: "Father's name" },
  { key: "motherName", label: "اسم الأم", en: "Mother's name" },
  { key: "lastName", label: "الكنية", en: "Family name" },
  { key: "birthDate", label: "تاريخ الميلاد", en: "Date of birth", date: true },
  { key: "birthPlace", label: "مكان الولادة", en: "Place of birth" },
  { key: "maritalStatus", label: "الحالة المدنية", en: "Marital status" },
];

const DOCS = [
  { value: "بيان قيد مدني", en: "Civil record extract" },
  { value: "صورة البطاقة الشخصية", en: "Copy of the ID card" },
  { value: "دفتر العائلة", en: "Family book" },
];

export type CivilDraft = Pick<CivilClaim, "fields" | "doc" | "note">;

/**
 * «البيانات غير صحيحة»: the pilgrim writes the right value of each wrong field himself and uploads a document
 * that proves it. The account is still created; these details stay «غير مؤكدة» until a registration officer
 * decides on them in «مراجعة الطلبات».
 */
export function CivilCorrection({ person, onCancel, onSubmit }: { person: Person; onCancel: () => void; onSubmit: (d: CivilDraft) => void }) {
  const t = useT();
  const [values, setValues] = useState<Record<string, string>>({});
  const [doc, setDoc] = useState(DOCS[0].value);
  const [file, setFile] = useState("");
  const [note, setNote] = useState("");
  const [tried, setTried] = useState(false);

  const changed = FIELDS.filter((f) => key(f) in values && values[key(f)].trim() && values[key(f)].trim() !== String(person[f.key]));
  const errors = {
    fields: !changed.length && t("اختر حقلاً واحداً على الأقل واكتب قيمته الصحيحة", "Choose at least one field and type its correct value"),
    file: !file && t("ارفع وثيقة تثبت البيانات الصحيحة", "Upload a document that proves the correct details"),
  };

  const submit = () => {
    setTried(true);
    if (errors.fields || errors.file) return;
    onSubmit({
      fields: changed.map((f) => ({ key: key(f), label: f.label, registry: String(person[f.key]), claimed: values[key(f)].trim() })),
      doc: { kind: doc, name: file },
      note: note.trim() || undefined,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-2xl bg-gold/15 p-4 text-sm leading-7 text-ink">
        <ShieldQuestion className="mt-1 size-5 shrink-0 text-gold-dark" />
        <p>
          {t(
            "اختر كل حقل فيه خطأ واكتب قيمته الصحيحة، ثم ارفع وثيقة تثبتها. يُنشأ حسابك الآن، وتبقى هذه البيانات «غير مؤكدة» حتى يراجعها موظف التسجيل ويعتمدها أو يرفضها مع السبب.",
            "Choose each field with a mistake and type its correct value, then upload a document that proves it. Your account is created now, and these details stay “unconfirmed” until a registration officer reviews them and approves or rejects them with a reason.",
          )}
        </p>
      </div>

      <ul className="space-y-3">
        {FIELDS.map((f) => {
          const k = key(f);
          const on = k in values;
          return (
            <li key={k} className={cn("rounded-2xl border p-4 transition", on ? "border-gold-dark bg-white" : "border-gold/40 bg-sand/50")}>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() =>
                    setValues((v) => {
                      const next = { ...v };
                      if (on) delete next[k];
                      else next[k] = String(person[f.key]);
                      return next;
                    })
                  }
                  className="size-5 accent-green-dark"
                />
                <span className="flex-1 font-bold text-ink">{t(f.label, f.en)}</span>
                <span className="text-sm text-ink-soft" dir={f.date ? "ltr" : undefined}>
                  {t("في السجل:", "On record:")} {String(person[f.key])}
                </span>
              </label>
              {on && (
                <input
                  type={f.date ? "date" : "text"}
                  aria-label={t(`${f.label} الصحيح`, `Correct ${f.en.toLowerCase()}`)}
                  value={values[k]}
                  onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))}
                  className={cn(inputClass, "mt-3")}
                  dir={f.date ? "ltr" : undefined}
                />
              )}
            </li>
          );
        })}
      </ul>
      {tried && errors.fields && <p className="text-sm font-bold text-maroon">{errors.fields}</p>}

      <div className="grid gap-5 md:grid-cols-2">
        <Field label={t("نوع الوثيقة", "Document type")}>
          <select value={doc} onChange={(e) => setDoc(e.target.value)} className={inputClass}>
            {DOCS.map((d) => (
              <option key={d.value} value={d.value}>
                {t(d.value, d.en)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("الوثيقة", "Document")} hint={t("صورة واضحة أو ملف PDF", "A clear photo or a PDF")} error={tried && errors.file}>
          {/* Field is the label: a click anywhere on it opens the file picker */}
          <span className={cn(inputClass, "flex cursor-pointer items-center gap-2 overflow-hidden")}>
            <FileUp className="size-5 shrink-0 text-gold-dark" />
            <span className={cn("truncate", file ? "text-ink" : "text-hint")}>{file || t("اختر ملفاً من جهازك", "Choose a file from your device")}</span>
            <input type="file" accept="image/*,application/pdf" className="sr-only" onChange={(e) => setFile(e.target.files?.[0]?.name ?? "")} />
          </span>
        </Field>
      </div>

      <Field label={t("ملاحظة للموظف", "A note for the officer")} optional>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={cn(inputClass, "h-auto py-3")} placeholder={t("مثال: اسم والدتي في البطاقة «آمنة» لا «أمينة»", "e.g. my mother's name on the card is «آمنة», not «أمينة»")} />
      </Field>

      <div className="flex flex-wrap justify-between gap-3">
        <Button variant="ghost" onClick={onCancel}>
          <ArrowRight className="size-4" /> {t("رجوع: بياناتي صحيحة", "Back: my details are correct")}
        </Button>
        <Button size="lg" onClick={submit}>
          {t("إرسال للمراجعة ومتابعة", "Send for review and continue")} <ArrowLeft className="size-5" />
        </Button>
      </div>
    </div>
  );
}

const key = (f: (typeof FIELDS)[number]) => f.key as string;
