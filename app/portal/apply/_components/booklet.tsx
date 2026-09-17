"use client";

import { AnimatePresence, motion } from "motion/react";
import { AlertTriangle, ArrowLeft, ArrowRight, BookUser, Camera, Check, Loader2, ScanLine, UserPlus } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge, Modal } from "@/components/ui/widgets";
import { ageOf, birthYear, fullName, lookupFamilyBook, registryRelation, relationLabel, type Person } from "@/lib/registry";
import type { Member } from "@/lib/rules";
import { SEASON } from "@/lib/season";
import { cn } from "@/lib/utils";
import { DigitsDisplay, NumberPad, PersonChip, Question } from "./ui";

export type Book = NonNullable<Awaited<ReturnType<typeof lookupFamilyBook>>>;

/** Fake camera + OCR over a stylised Syrian family booklet */
function ScanModal({ open, onClose, onResult, sample }: { open: boolean; onClose: () => void; onResult: (no: string) => void; sample: string }) {
  const [phase, setPhase] = useState<"aim" | "scan" | "read">("aim");
  const callbacks = useRef({ onClose, onResult });
  useEffect(() => {
    callbacks.current = { onClose, onResult };
  });
  useEffect(() => {
    if (!open) return;
    const t0 = setTimeout(() => setPhase("aim"), 0);
    const a = setTimeout(() => setPhase("scan"), 900);
    const b = setTimeout(() => setPhase("read"), 3000);
    const c = setTimeout(() => {
      callbacks.current.onResult(sample);
      callbacks.current.onClose();
    }, 4300);
    return () => [t0, a, b, c].forEach(clearTimeout);
  }, [open, sample]);

  return (
    <Modal open={open} onClose={onClose} className="max-w-md bg-ink p-4 text-white">
      <p className="mb-3 flex items-center gap-2 font-bold">
        <Camera className="size-5 text-gold" /> صوّر الصفحة الأولى من دفتر العائلة
      </p>
      <div className="relative aspect-[3/4] overflow-hidden rounded-2xl bg-gradient-to-br from-neutral-800 to-neutral-950">
        {/* Booklet */}
        <motion.div
          initial={{ rotate: -8, scale: 0.85, opacity: 0 }}
          animate={{ rotate: phase === "aim" ? -4 : 0, scale: phase === "aim" ? 0.9 : 1, opacity: 1 }}
          transition={{ duration: 0.8 }}
          className="absolute inset-8 rounded-xl bg-[#e9dfc7] p-4 text-ink shadow-2xl"
        >
          <div className="flex items-center justify-between border-b border-ink/20 pb-2">
            <span className="font-display text-sm font-bold">الجمهورية العربية السورية</span>
            <span className="text-[10px]">دفتر العائلة</span>
          </div>
          <div className="mt-3 space-y-2 text-[11px]">
            {["رقم الدفتر", "المحافظة", "مكان القيد", "رب الأسرة", "الزوجة", "الأولاد"].map((l, i) => (
              <div key={l} className="flex items-center gap-2">
                <span className="w-16 shrink-0 font-bold">{l}:</span>
                <motion.span
                  className="h-2.5 rounded bg-ink/15"
                  initial={{ width: "40%" }}
                  animate={{ width: phase === "read" ? `${50 + ((i * 17) % 40)}%` : "40%", backgroundColor: phase === "read" ? "rgba(40,158,146,.45)" : "rgba(2,21,38,.15)" }}
                  transition={{ delay: i * 0.12 }}
                />
              </div>
            ))}
          </div>
          <div className="absolute bottom-4 left-4 size-14 rounded-full border-2 border-dashed border-maroon/40" />
        </motion.div>
        {/* Viewfinder */}
        <div className="absolute inset-5 rounded-2xl">
          {["top-0 right-0 border-t-4 border-r-4", "top-0 left-0 border-t-4 border-l-4", "bottom-0 right-0 border-b-4 border-r-4", "bottom-0 left-0 border-b-4 border-l-4"].map((c) => (
            <span key={c} className={cn("absolute size-8 rounded-sm border-gold", c)} />
          ))}
        </div>
        {phase === "scan" && (
          <motion.div
            className="absolute inset-x-6 h-1 rounded-full bg-green-light shadow-[0_0_24px_6px_rgba(40,158,146,.7)]"
            initial={{ top: "8%" }}
            animate={{ top: ["8%", "90%", "8%"] }}
            transition={{ duration: 2, ease: "easeInOut" }}
          />
        )}
      </div>
      <p className="mt-4 flex items-center justify-center gap-2 text-sm text-white/80">
        {phase === "aim" && "ثبّت الهاتف فوق الدفتر..."}
        {phase === "scan" && (
          <>
            <ScanLine className="size-4 animate-pulse text-green-light" /> قراءة ضوئية للنص...
          </>
        )}
        {phase === "read" && (
          <>
            <Check className="size-4 text-green-light" /> تم استخراج رقم الدفتر والأفراد
          </>
        )}
      </p>
    </Modal>
  );
}

export function BookletPicker({
  applicant,
  sample,
  members,
  onToggle,
  onAddOutside,
  onBack,
  onDone,
  book,
  setBook,
}: {
  book: Book | null;
  setBook: (b: Book | null) => void;
  applicant: Person;
  sample: string;
  members: Member[];
  onToggle: (m: Member, selected: boolean) => void;
  onAddOutside: () => void;
  onBack: () => void;
  onDone: () => void;
}) {
  const [no, setNo] = useState("");
  const [scan, setScan] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const search = async (value = no) => {
    setError("");
    setLoading(true);
    const b = await lookupFamilyBook(value);
    setLoading(false);
    if (!b) return setError("لم نجد دفتر عائلة بهذا الرقم في سجلات الشؤون المدنية");
    setBook(b);
  };

  const r = SEASON.rules;
  const others = book?.members.filter((p) => p.id !== applicant.id) ?? [];
  const selectedIds = members.map((m) => m.person.id);
  const outside = members.filter((m) => m.relation !== "self" && !book?.members.some((p) => p.id === m.person.id));

  if (!book) {
    return (
      <Question
        title="ما رقم دفتر العائلة؟"
        hint="سنجلب أفراد أسرتك من الشؤون المدنية، ثم تختار من سيسافر معك. يمكنك تصوير الدفتر بدلاً من كتابة الرقم."
        speak="ما رقم دفتر العائلة؟ يمكنك تصوير الدفتر بدلاً من كتابة الرقم."
      >
        {loading ? (
          <div className="grid min-h-72 place-items-center text-center">
            <div>
              <motion.div animate={{ rotateY: [0, 180, 360] }} transition={{ repeat: Infinity, duration: 2 }} className="mx-auto grid size-24 place-items-center rounded-3xl bg-green-dark text-gold">
                <BookUser className="size-12" />
              </motion.div>
              <p className="mt-6 font-display text-2xl font-bold text-green-dark">نجلب أفراد الأسرة من الشؤون المدنية...</p>
              <Loader2 className="mx-auto mt-3 size-6 animate-spin text-gold-dark" />
            </div>
          </div>
        ) : (
          <>
            <button
              type="button"
              onClick={() => setScan(true)}
              className="group relative mb-8 flex w-full items-center gap-5 overflow-hidden rounded-3xl bg-green-dark p-6 text-right text-white shadow-xl"
            >
              <div className="bg-pattern absolute inset-0 opacity-15" />
              <span className="relative grid size-16 shrink-0 place-items-center rounded-2xl bg-gold text-ink transition group-hover:scale-110">
                <Camera className="size-8" />
              </span>
              <span className="relative">
                <span className="block font-display text-2xl font-bold">صوّر دفتر العائلة</span>
                <span className="text-white/75">الأسهل — نقرأ الرقم والأفراد تلقائياً</span>
              </span>
              <ArrowLeft className="relative mr-auto size-6 text-gold transition group-hover:-translate-x-2" />
            </button>
            <p className="mb-4 text-center font-bold text-hint">أو اكتب الرقم</p>
            <input dir="ltr" inputMode="numeric" maxLength={8} value={no} onChange={(e) => setNo(e.target.value.replace(/\D/g, ""))} className="sr-only" aria-label="رقم دفتر العائلة" />
            <DigitsDisplay value={no} length={8} groups={[4, 4]} />
            <div className="mt-6">
              <NumberPad value={no} onChange={setNo} maxLength={8} />
            </div>
            {sample && (
              <p className="mt-4 text-center text-sm">
                <button type="button" onClick={() => setNo(sample)} className="rounded-full border border-dashed border-gold-dark bg-gold/15 px-3 py-1.5 font-semibold text-maroon">
                  رقم تجريبي: {sample}
                </button>
              </p>
            )}
            {error && <p className="mt-5 rounded-2xl bg-maroon/8 p-4 text-center font-bold text-maroon">{error}</p>}
            <div className="mt-8 flex flex-wrap justify-between gap-3">
              <Button variant="ghost" size="lg" onClick={onBack}>
                <ArrowRight className="size-5" /> رجوع
              </Button>
              <Button size="lg" onClick={() => search()} disabled={no.length !== 8}>
                <BookUser className="size-5" /> اجلب أفراد الأسرة
              </Button>
            </div>
            <ScanModal
              open={scan}
              sample={sample || "45112233"}
              onClose={() => setScan(false)}
              onResult={(v) => {
                setNo(v);
                search(v);
              }}
            />
          </>
        )}
      </Question>
    );
  }

  const inBook = book.members.some((p) => p.id === applicant.id);

  return (
    <Question
      title="من سيسافر معك؟"
      hint={`دفتر العائلة ${book.no} — ${book.governorate}، ${book.registry}. اضغط على كل شخص سيرافقك.`}
      speak="من سيسافر معك؟ اضغط على كل شخص سيرافقك."
    >
      {!inBook && (
        <p className="mb-4 flex items-start gap-2 rounded-2xl bg-gold/25 p-4 text-sm font-semibold text-maroon">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" /> صاحب الطلب غير مدرج في هذا الدفتر. سنعتمد صلات القرابة المسجّلة في السجلات حيثما وُجدت.
        </p>
      )}
      <div className="grid gap-3 md:grid-cols-2">
        {others.map((p, i) => {
          const selected = selectedIds.includes(p.id);
          const rel = registryRelation(applicant, p) ?? "other";
          const by = birthYear(p);
          const tooYoung = by > r.companionMaxBirthYear;
          const needsMahram = p.gender === "F" && by >= r.womanNeedsMahramMinBirthYear;
          const elderly = by <= r.elderlyNeedsCompanionMaxBirthYear;
          return (
            <motion.button
              key={p.id}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.07 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onToggle({ person: p, relation: rel, relationVerified: rel !== "other", needs: [] }, !selected)}
              className={cn(
                "relative rounded-3xl border-2 p-5 text-right transition",
                selected ? "border-green-dark bg-green-dark/5 shadow-lg" : "border-gold/50 bg-white hover:border-gold-dark",
              )}
            >
              <PersonChip
                name={fullName(p)}
                gender={p.gender}
                sub={
                  <span>
                    {relationLabel(rel, p.gender)} — {ageOf(p)} عاماً
                  </span>
                }
              >
                <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl border-2 transition", selected ? "border-green-dark bg-green-dark text-white" : "border-gold")}>
                  {selected && <Check className="size-5" />}
                </span>
              </PersonChip>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tooYoung && <Badge tone="maroon">دون 17 عاماً — لا يمكن أن يكون مرافقاً</Badge>}
                {needsMahram && <Badge tone="gold">تحتاج محرماً في الطلب</Badge>}
                {elderly && <Badge tone="gold">يحتاج مرافقاً</Badge>}
                {!tooYoung && !needsMahram && !elderly && <Badge>مستوفٍ مبدئياً</Badge>}
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence>
        {outside.map((m) => (
          <motion.div key={m.person.id} initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="rounded-3xl border-2 border-green-dark bg-green-dark/5 p-5">
              <PersonChip name={fullName(m.person)} gender={m.person.gender} sub={`${relationLabel(m.relation, m.person.gender)} — أُضيف بالرقم الوطني — ${ageOf(m.person)} عاماً`}>
                <button type="button" onClick={() => onToggle(m, false)} className="rounded-xl px-3 py-1.5 text-sm font-bold text-maroon hover:bg-maroon/10">
                  إزالة
                </button>
              </PersonChip>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={onAddOutside}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-3xl border-2 border-dashed border-gold-dark p-5 font-bold text-green-dark transition hover:bg-gold/10"
      >
        <UserPlus className="size-5" /> إضافة شخص ليس في هذا الدفتر (مثل الوالدة أو الأخ) بالرقم الوطني
      </button>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="lg" onClick={() => setBook(null)}>
          <ArrowRight className="size-5" /> دفتر آخر
        </Button>
        <Button size="lg" onClick={onDone} disabled={members.length < 2}>
          التالي ({members.length - 1} {members.length - 1 === 1 ? "مرافق" : "مرافقين"}) <ArrowLeft className="size-5" />
        </Button>
      </div>
    </Question>
  );
}
