"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, BadgeCheck, Loader2, SearchCheck, ShieldQuestion } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  RELATION_OPTIONS,
  ageOf,
  fullName,
  isValidNationalId,
  lookupPerson,
  registryRelation,
  relationLabel,
  type Person,
  type Relation,
} from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { maskNationalId } from "@/lib/utils";
import { Choice, DigitsDisplay, NumberPad, PersonChip, Question } from "./ui";

type Stage = "id" | "loading" | "confirm" | "relation" | "verify";

const GENDERED: Record<Relation, [string, string]> = {
  self: ["صاحب الطلب", "صاحبة الطلب"],
  spouse: ["زوجي", "زوجتي"],
  parent: ["والدي", "والدتي"],
  child: ["ابني", "ابنتي"],
  sibling: ["أخي", "أختي"],
  grandparent: ["جدي", "جدتي"],
  grandchild: ["حفيدي", "حفيدتي"],
  other: ["قريب أو صديق", "قريبة أو صديقة"],
};

export function relationWord(rel: Relation, gender: "M" | "F") {
  return GENDERED[rel][gender === "F" ? 1 : 0];
}

export function PersonAdder({
  applicant,
  existingIds,
  ordinal,
  onAdd,
  onCancel,
  suggestions = [],
  applicantIsMe = true,
}: {
  applicantIsMe?: boolean;
  applicant: Person;
  existingIds: string[];
  ordinal: string;
  onAdd: (m: Member) => void;
  onCancel: () => void;
  suggestions?: { id: string; label: string }[];
}) {
  const [stage, setStage] = useState<Stage>("id");
  const [id, setId] = useState("");
  const [error, setError] = useState("");
  const [person, setPerson] = useState<Person | null>(null);
  const [declared, setDeclared] = useState<Relation | null>(null);

  const search = async () => {
    setError("");
    if (!isValidNationalId(id)) return setError("الرقم الوطني يتكون من 11 رقماً");
    if (id === applicant.id) return setError("هذا هو رقم صاحب الطلب نفسه");
    if (existingIds.includes(id)) return setError("هذا الشخص مضاف إلى الطلب بالفعل");
    setStage("loading");
    const p = await lookupPerson(id);
    if (!p) {
      setStage("id");
      return setError("لم نجد هذا الرقم في سجلات الشؤون المدنية");
    }
    setPerson(p);
    setStage("confirm");
  };

  const actual = person ? registryRelation(applicant, person) : null;

  const finish = (relation: Relation, verified: boolean) => {
    if (!person) return;
    onAdd({ person, relation, relationVerified: verified, needs: [] });
  };

  return (
    <AnimatePresence mode="wait">
      <motion.div key={stage} initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }} transition={{ duration: 0.3 }}>
        {stage === "id" && (
          <Question
            step={ordinal}
            title="ما هو الرقم الوطني لهذا الشخص؟"
            hint="تجده على بطاقته الشخصية. يمكنك الكتابة أو الضغط على الأرقام الكبيرة."
            speak="ما هو الرقم الوطني لهذا الشخص؟ تجده على بطاقته الشخصية."
          >
            <input
              dir="ltr"
              inputMode="numeric"
              maxLength={11}
              value={id}
              onChange={(e) => setId(e.target.value.replace(/\D/g, ""))}
              onKeyDown={(e) => e.key === "Enter" && search()}
              className="sr-only"
              aria-label="الرقم الوطني"
              autoFocus
            />
            <button type="button" onClick={(e) => (e.currentTarget.previousElementSibling as HTMLInputElement)?.focus()} className="w-full">
              <DigitsDisplay value={id} length={11} groups={[3, 4, 4]} />
            </button>
            <div className="mt-6">
              <NumberPad value={id} onChange={setId} maxLength={11} />
            </div>
            {suggestions.length > 0 && (
              <div className="mt-6 flex flex-wrap justify-center gap-2">
                {suggestions.map((s) => (
                  <button key={s.id} type="button" onClick={() => setId(s.id)} className="rounded-full border border-dashed border-gold-dark bg-gold/15 px-3 py-1.5 text-sm font-semibold text-maroon hover:bg-gold/30">
                    تجريبي: {s.label}
                  </button>
                ))}
              </div>
            )}
            <AnimatePresence>
              {error && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5 rounded-2xl bg-maroon/8 p-4 text-center font-bold text-maroon">
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <Button variant="ghost" size="lg" onClick={onCancel}>
                <ArrowRight className="size-5" /> رجوع
              </Button>
              <Button size="lg" onClick={search} disabled={id.length !== 11}>
                <SearchCheck className="size-5" /> ابحث في الشؤون المدنية
              </Button>
            </div>
          </Question>
        )}

        {stage === "loading" && (
          <div className="grid min-h-80 place-items-center text-center">
            <div>
              <div className="relative mx-auto size-28">
                <span className="absolute inset-0 animate-ping rounded-full bg-green-light/20" />
                <span className="absolute inset-3 animate-ping rounded-full bg-green-light/25 [animation-delay:.3s]" />
                <span className="relative grid size-28 place-items-center rounded-full bg-green-dark text-gold">
                  <Loader2 className="size-12 animate-spin" />
                </span>
              </div>
              <p className="mt-6 font-display text-2xl font-bold text-green-dark">نستعلم من الشؤون المدنية...</p>
              <p className="mt-1 font-mono text-hint" dir="ltr">{maskNationalId(id)}</p>
            </div>
          </div>
        )}

        {stage === "confirm" && person && (
          <Question step={ordinal} title="وجدنا هذا الشخص. هل هو الشخص الصحيح؟" speak={`وجدنا ${fullName(person)}، مواليد ${person.birthDate.slice(0, 4)}. هل هو الشخص الصحيح؟`}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="relative overflow-hidden rounded-3xl border-2 border-green-dark/15 bg-gradient-to-br from-white to-sand p-6">
              <div className="bg-pattern-dark absolute inset-0" />
              <div className="relative">
                <PersonChip
                  name={fullName(person)}
                  gender={person.gender}
                  sub={
                    <span className="flex flex-wrap gap-x-4">
                      <span>مواليد {person.birthDate.slice(0, 4)} ({ageOf(person)} عاماً)</span>
                      <span>{person.gender === "M" ? "ذكر" : "أنثى"}</span>
                      <span>{person.governorate}</span>
                    </span>
                  }
                />
                <p className="mt-4 flex items-center gap-2 text-sm font-semibold text-green">
                  <BadgeCheck className="size-4" /> اسم الأم: {person.motherName} — القيد: {person.registry}
                </p>
              </div>
            </motion.div>
            <div className="mt-6 grid gap-3 md:grid-cols-2">
              <Choice index={0} icon="👍" label="نعم، هذا هو" tone="primary" onClick={() => setStage("relation")} />
              <Choice
                index={1}
                icon="↩️"
                label="لا، أدخل رقماً آخر"
                onClick={() => {
                  setId("");
                  setPerson(null);
                  setStage("id");
                }}
              />
            </div>
          </Question>
        )}

        {stage === "relation" && person && (
          <Question
            step={ordinal}
            title={applicantIsMe ? `ما صلة قرابة ${person.firstName} بك؟` : `ما صلة قرابة ${person.firstName} بصاحب الطلب ${applicant.firstName}؟`}
            hint={`${person.firstName} بالنسبة إلى ${applicant.firstName} هو/هي:`}
            speak={`ما صلة قرابة ${person.firstName} بصاحب الطلب ${applicant.firstName}؟`}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {RELATION_OPTIONS.map((o, i) => (
                <Choice
                  key={o.value}
                  index={i}
                  icon={o.emoji}
                  label={relationWord(o.value, person.gender)}
                  selected={declared === o.value}
                  onClick={() => {
                    setDeclared(o.value);
                    setTimeout(() => setStage("verify"), 250);
                  }}
                />
              ))}
            </div>
            <Button variant="ghost" size="lg" className="mt-6" onClick={() => setStage("confirm")}>
              <ArrowRight className="size-5" /> رجوع
            </Button>
          </Question>
        )}

        {stage === "verify" && person && declared && (
          <div>
            {actual === declared ? (
              <Question
                step={ordinal}
                title={
                  <span className="flex items-center gap-3">
                    <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: "spring" }} className="grid size-11 place-items-center rounded-full bg-green-light text-white">
                      <BadgeCheck className="size-6" />
                    </motion.span>
                    تحققنا من صلة القرابة
                  </span>
                }
                hint={`سجلات الشؤون المدنية تؤكد أن ${person.firstName} ${relationLabel(declared, person.gender)} ${applicant.firstName}.`}
              >
                <Button size="xl" onClick={() => finish(declared, true)}>
                  إضافة {person.firstName} إلى الطلب <ArrowLeft className="size-6" />
                </Button>
              </Question>
            ) : actual && actual !== "self" ? (
              <Question
                step={ordinal}
                title={
                  <span className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-gold text-ink">
                      <AlertTriangle className="size-6" />
                    </span>
                    السجلات تقول شيئاً مختلفاً
                  </span>
                }
                hint={`اخترت «${relationWord(declared, person.gender)}»، لكن سجلات الشؤون المدنية تشير إلى أن ${person.firstName} ${relationLabel(actual, person.gender)} ${applicant.firstName}. هل نعتمد ما في السجلات؟`}
                speak={`السجلات تشير إلى أن ${person.firstName} ${relationLabel(actual, person.gender)} ${applicant.firstName}. هل نعتمد ما في السجلات؟`}
              >
                <div className="grid gap-3 md:grid-cols-2">
                  <Choice index={0} icon="✅" tone="primary" label={`نعم، ${relationWord(actual, person.gender)}`} description="تُعتمد صلة القرابة من السجلات" onClick={() => finish(actual, true)} />
                  <Choice index={1} icon="📝" label="لا، الصلة التي اخترتها صحيحة" description="تُسجّل كما هي ويراجعها موظف التسجيل" onClick={() => finish(declared, false)} />
                </div>
              </Question>
            ) : (
              <Question
                step={ordinal}
                title={
                  <span className="flex items-center gap-3">
                    <span className="grid size-11 place-items-center rounded-full bg-sand text-green-dark">
                      <ShieldQuestion className="size-6" />
                    </span>
                    لم نستطع تأكيد الصلة آلياً
                  </span>
                }
                hint={`لا يوجد رابط مباشر في السجلات بين ${person.firstName} و${applicant.firstName}. سنسجّل الصلة كما صرّحت بها («${relationWord(declared, person.gender)}»)، ويراجعها موظف التسجيل قبل اعتماد الطلب — لن يؤخر ذلك طلبك.`}
              >
                <Button size="xl" onClick={() => finish(declared, false)}>
                  متابعة وإضافة {person.firstName} <ArrowLeft className="size-6" />
                </Button>
              </Question>
            )}
            <Button variant="ghost" className="mt-6" onClick={() => setStage("relation")}>
              <ArrowRight className="size-4" /> تغيير صلة القرابة
            </Button>
          </div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
