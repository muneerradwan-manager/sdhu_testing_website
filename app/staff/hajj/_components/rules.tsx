"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, FlaskConical, Lock, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { describe } from "@/lib/registration/conditions";
import { allFields, configuredChecks } from "@/lib/registration/engine";
import type { EligibilityRule } from "@/lib/registration/types";
import { getPerson, type Relation } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { useSeason } from "@/lib/season-live";
import { cn } from "@/lib/utils";
import { textareaClass } from "../../_components/kit";
import { Switch, selectClass } from "../../exam/_components/ui";
import { ConditionEditor } from "./builders";
import { Box, IssuesFor, Kind, ListTable, RowActions, RowLink, Title, newId, useRegEditor } from "./editor";

const FIX_LABEL: Record<EligibilityRule["fix"], string> = { none: "لا شيء", remove: "إزالة الفرد من الطلب", addPerson: "إضافة شخص إلى الطلب", lottery: "التسجيل على القرعة بدلاً من ذلك" };

/** Demo families to try a rule on: the operating document's cases */
const FAMILIES: { key: string; label: string; members: [string, Relation][] }[] = [
  { key: "khatib", label: "آل الخطيب (محمد وزوجته ووالدته)", members: [["01012340078", "self"], ["01012345412", "child"], ["01012345413", "other"]] },
  { key: "mohammad", label: "محمد وحده (58)", members: [["01012345412", "self"]] },
  { key: "reem", label: "ريم وأخوها مازن", members: [["02033300552", "self"], ["02033300553", "sibling"]] },
  { key: "hassan", label: "حسان ووالدته نجاح", members: [["06055500701", "self"], ["06055500711", "child"]] },
];

/** The platform's own conditions, always applied — shown, not edited (their numbers are the season settings') */
function useFixedRules() {
  const season = useSeason();
  const r = season.rules;
  const ref = 2026;
  return [
    "مسلم، ويحمل الجنسية السورية",
    "لم يؤدِّ الحج سابقاً، إلا محرماً لأمه أو زوجته",
    "طلب واحد لكل شخص في الموسم",
    `صاحب الطلب ${ref - r.applicantMaxBirthYear} عاماً فأكثر، والمرافق ${ref - r.companionMaxBirthYear} عاماً فأكثر`,
    `المرأة دون ${ref - r.womanNeedsMahramMinBirthYear} عاماً معها محرم`,
    `من بلغ ${ref - r.elderlyNeedsCompanionMaxBirthYear} عاماً معه مرافق مسمّى`,
    `صاحب الطلب و${r.maxCompanions} مرافقين (و${r.maxCompanionsFamily} لرجل مع زوجته وأولاده)`,
    `القبول المباشر لمن بلغ ${season.acceptedDirectAge} عاماً`,
  ];
}

export function RulesList() {
  const ed = useRegEditor();
  const fixed = useFixedRules();
  const rules = ed.config.eligibility;
  const fields = allFields(ed.config);
  return (
    <div className="space-y-5">
      <Title
        action={
          !ed.readOnly && (
            <Link href="/staff/hajj/manage/rules/edit" className="inline-flex items-center gap-1.5 rounded-xl border border-gold/60 px-3 py-1.5 text-sm font-bold text-gold hover:bg-gold hover:text-ink">
              <Plus className="size-4" /> إضافة شرط
            </Link>
          )
        }
      />
      <p className="text-sm text-white/65">شروط تضيفها الإدارة لهذا الموسم فوق شروط المنصة. تُفحص في صفحة «فحص الأهلية»، ومرة أخرى عند تقديم الطلب.</p>
      {rules.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/20 p-6 text-center text-white/65">لا شروط مضافة هذا الموسم: تكفي شروط المنصة أدناه.</p>
      ) : (
        <ListTable head={["الشرط", "على من", "إن لم يتحقق", "الحالة"]}>
          {rules.map((x) => (
            <tr key={x.id} className={cn("align-top", !x.enabled && "opacity-60")}>
              <td className="p-3">
                <Link href={`/staff/hajj/manage/rules/edit?id=${x.id}`} className="font-bold text-white hover:text-gold">
                  {x.label}
                </Link>
                <p className="text-xs text-white/55">يجب أن: {describe(x.require, fields)}</p>
                <RowActions>
                  <RowLink href={`/staff/hajj/manage/rules/edit?id=${x.id}`}>{ed.readOnly ? "عرض" : "تعديل"}</RowLink>
                  {!ed.readOnly && (
                    <RowLink onClick={() => ed.edit((c) => ({ ...c, eligibility: c.eligibility.map((y) => (y.id === x.id ? { ...y, enabled: !y.enabled } : y)) }), { action: x.enabled ? "إيقاف شرط أهلية" : "تشغيل شرط أهلية", area: "rules", detail: x.label, ref: x.id })}>
                      {x.enabled ? "إيقاف" : "تشغيل"}
                    </RowLink>
                  )}
                  {!ed.readOnly && (
                    <RowLink danger onClick={() => ed.edit((c) => ({ ...c, eligibility: c.eligibility.filter((y) => y.id !== x.id) }), { action: "حذف شرط أهلية", area: "rules", detail: x.label, ref: x.id })}>
                      حذف
                    </RowLink>
                  )}
                </RowActions>
                <IssuesFor refs={[x.id]} />
              </td>
              <td className="p-3 text-white/80">
                {x.scope === "member" ? "كل فرد" : "الطلب كله"}
                {x.when && <span className="block text-xs text-white/55">حين {describe(x.when, fields)}</span>}
              </td>
              <td className="p-3">
                <Kind tone={x.severity === "fail" ? "maroon" : "gold"}>{x.severity === "fail" ? "يمنع التقديم" : "تنبيه"}</Kind>
              </td>
              <td className="p-3">{x.enabled ? <Kind tone="green">يعمل</Kind> : <Kind>موقوف</Kind>}</td>
            </tr>
          ))}
        </ListTable>
      )}
      <IssuesFor where="القاعدتان" />
      <Box title="شروط المنصة الثابتة (للاطلاع)" open={false}>
        <p className="text-xs leading-5 text-white/55">تُطبَّق دائماً. أرقامها من «إعدادات الموسم» عند مديرة الموسم.</p>
        <ul className="space-y-1.5">
          {fixed.map((t) => (
            <li key={t} className="flex items-start gap-2">
              <Lock className="mt-0.5 size-3.5 shrink-0 text-gold" /> {t}
            </li>
          ))}
        </ul>
      </Box>
    </div>
  );
}

export function RuleEditor() {
  const params = useSearchParams();
  const ed = useRegEditor();
  const id = params.get("id");
  const existing = ed.config.eligibility.find((r) => r.id === id);
  const blank: EligibilityRule = { id: newId("rule"), label: "", scope: "member", require: { all: [] }, severity: "fail", message: "", fix: "remove", enabled: true };
  return <Editor key={`${ed.season}-${id ?? "new"}-${existing ? "found" : "new"}`} initial={existing ?? blank} />;
}

function Editor({ initial }: { initial: EligibilityRule }) {
  const ed = useRegEditor();
  const toast = useToast();
  const router = useRouter();
  const season = useSeason();
  const [x, setX] = useState(initial);
  const [family, setFamily] = useState(FAMILIES[0].key);
  const set = (p: Partial<EligibilityRule>) => setX((r) => ({ ...r, ...p }));
  const fields = allFields(ed.config);
  const stored = ed.config.eligibility.find((r) => r.id === x.id);
  const isNew = !stored;
  const dirty = !stored || JSON.stringify(x) !== JSON.stringify(stored);
  const fam = FAMILIES.find((f) => f.key === family)!;
  const tried = useMemo(() => {
    const members: Member[] = fam.members.map(([id, relation]) => ({ person: getPerson(id)!, relation, relationVerified: true, needs: [] }));
    const r = configuredChecks([{ ...x, enabled: true }], { members, answers: {}, memberAnswers: {}, elderlyMaxBirthYear: season.rules.elderlyNeedsCompanionMaxBirthYear, track: "lottery", residence: "سوريا" });
    return { members, r };
  }, [fam, x, season.rules.elderlyNeedsCompanionMaxBirthYear]);

  const save = () => {
    if (!x.label.trim() || !x.message.trim()) return toast({ title: "اكتب اسم الشرط ورسالته", icon: "✏️", tone: "gold" });
    const ok = ed.edit((c) => ({ ...c, eligibility: stored ? c.eligibility.map((y) => (y.id === x.id ? x : y)) : [...c.eligibility, x] }), { action: isNew ? "إضافة شرط أهلية" : "تعديل شرط أهلية", area: "rules", detail: x.label, ref: x.id });
    if (!ok) return;
    toast({ title: isNew ? "أُضيف الشرط" : "حُفظ الشرط", body: "يُطبَّق على الحجاج بعد «نشر التغييرات».", icon: "💾", tone: "success" });
    if (isNew) router.replace(`/staff/hajj/manage/rules/edit?id=${x.id}`);
  };

  return (
    <div>
      <div className="mb-5">
        <Link href="/staff/hajj/manage/rules" className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          <ArrowRight className="size-4" /> كل الشروط
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{isNew ? "إضافة شرط أهلية" : "تعديل الشرط"}</h1>
      </div>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <fieldset disabled={ed.readOnly} className="min-w-0 space-y-5">
          <input value={x.label} onChange={(e) => set({ label: e.target.value })} placeholder="اسم الشرط، مثل: لا يتجاوز عمر المرافق 75 عاماً" aria-label="اسم الشرط" className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/10 px-5 font-display text-xl font-bold text-white outline-none placeholder:text-white/35 focus:border-gold" />
          <section className="space-y-3 rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
            <p className="font-bold text-white">١. يُفحص على</p>
            <div className="flex flex-wrap gap-4 text-sm text-white">
              {(["member", "application"] as const).map((sc) => (
                <label key={sc} className="flex items-center gap-2">
                  <input type="radio" checked={x.scope === sc} onChange={() => set({ scope: sc, when: undefined, require: { all: [] } })} className="accent-[#D9C89E]" /> {sc === "member" ? "كل فرد في الطلب" : "الطلب كله"}
                </label>
              ))}
            </div>
            <p className="pt-2 font-bold text-white">٢. ينطبق على {x.scope === "member" ? "من" : "الطلبات التي"}</p>
            <ConditionEditor value={x.when} onChange={(c) => set({ when: c })} fields={fields} member={x.scope === "member"} empty={x.scope === "member" ? "كل الأفراد" : "كل الطلبات"} />
            <p className="pt-2 font-bold text-white">٣. ويجب أن</p>
            <ConditionEditor value={x.require} onChange={(c) => set({ require: c ?? { all: [] } })} fields={fields} member={x.scope === "member"} empty="أضف الشرط" />
            <p className="pt-2 font-bold text-white">٤. وإن لم يتحقق، يقرأ الحاج</p>
            <textarea rows={2} value={x.message} onChange={(e) => set({ message: e.target.value })} className={textareaClass} aria-label="الرسالة" placeholder="مثال: المرافق هذا الموسم دون 75 عاماً" />
          </section>
          <IssuesFor refs={[x.id]} />
        </fieldset>
        <aside className="space-y-4">
          {!ed.readOnly && (
            <Box title="الحفظ">
              <span className="flex items-center gap-2 font-bold text-white">
                <Switch on={x.enabled} onChange={(v) => set({ enabled: v })} label="يعمل" /> {x.enabled ? "يعمل" : "موقوف"}
              </span>
              <Button variant="gold" className="w-full" onClick={save} disabled={!dirty}>
                <Save className="size-4" /> {isNew ? "إضافة الشرط" : "حفظ"}
              </Button>
              <p className="text-xs text-white/55">{dirty ? "لديك تعديلات لم تُحفظ." : "محفوظ."}</p>
              {!isNew && (
                <button
                  type="button"
                  onClick={() => {
                    ed.edit((c) => ({ ...c, eligibility: c.eligibility.filter((y) => y.id !== x.id) }), { action: "حذف شرط أهلية", area: "rules", detail: x.label, ref: x.id });
                    router.push("/staff/hajj/manage/rules");
                  }}
                  className="flex items-center gap-1 text-xs font-bold text-[#ffb4c8] hover:underline"
                >
                  <Trash2 className="size-3.5" /> حذف الشرط
                </button>
              )}
            </Box>
          )}
          <Box title="إن لم يتحقق">
            {(["fail", "warn"] as const).map((v) => (
              <label key={v} className="flex items-center gap-2">
                <input type="radio" checked={x.severity === v} onChange={() => set({ severity: v })} className="accent-[#D9C89E]" disabled={ed.readOnly} /> {v === "fail" ? "يمنع تقديم الطلب" : "تنبيه فقط"}
              </label>
            ))}
            <label className="block pt-1">
              الحل الذي يُقترح على الحاج
              <select value={x.fix} onChange={(e) => set({ fix: e.target.value as EligibilityRule["fix"] })} className={cn(selectClass, "mt-1")} disabled={ed.readOnly}>
                {(Object.keys(FIX_LABEL) as EligibilityRule["fix"][]).map((k) => (
                  <option key={k} value={k}>
                    {FIX_LABEL[k]}
                  </option>
                ))}
              </select>
            </label>
          </Box>
          <Box title="جرّبه على عائلة" open={false}>
            <select value={family} onChange={(e) => setFamily(e.target.value)} className={selectClass} aria-label="العائلة">
              {FAMILIES.map((f) => (
                <option key={f.key} value={f.key}>
                  {f.label}
                </option>
              ))}
            </select>
            <ul className="space-y-1">
              {x.scope === "member"
                ? tried.members.map((m) => {
                    const c = tried.r.members[m.person.id]?.[0];
                    return (
                      <li key={m.person.id} className={c ? (c.status === "pass" ? "text-green-light" : "text-[#ffb4c8]") : "text-white/50"}>
                        {c ? (c.status === "pass" ? "✓" : "✗") : "—"} {m.person.firstName} {!c && "(لا ينطبق عليه)"}
                      </li>
                    );
                  })
                : tried.r.general.map((c) => (
                    <li key={c.key} className={c.status === "pass" ? "text-green-light" : "text-[#ffb4c8]"}>
                      {c.status === "pass" ? "✓ يستوفيه الطلب" : "✗ لا يستوفيه الطلب"}
                    </li>
                  ))}
            </ul>
            <p className="flex items-center gap-1 text-xs text-white/45">
              <FlaskConical className="size-3" /> بيانات تجريبية
            </p>
          </Box>
          <p className="flex items-start gap-1.5 text-xs leading-5 text-white/50">
            <ShieldCheck className="mt-0.5 size-3.5 shrink-0" /> يُفحص الشرط عند تقديم الطلب أيضاً، فلا يتجاوزه أحد بتغيير شيء في صفحته.
          </p>
        </aside>
      </div>
    </div>
  );
}
