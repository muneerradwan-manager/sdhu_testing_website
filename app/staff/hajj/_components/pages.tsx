"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowDown, ArrowRight, ArrowUp, Lock, Plus, Save, ShieldCheck, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { ConfiguredStage } from "@/components/registration/stage-view";
import { allFields } from "@/lib/registration/engine";
import type { Gate, StageDef } from "@/lib/registration/types";
import { BLOCK_LABEL, REQUIRED_BLOCKS } from "@/lib/registration/validate";
import { getPerson } from "@/lib/registry";
import { cn } from "@/lib/utils";
import { smallInputClass, textareaClass } from "../../_components/kit";
import { Segments, Switch, selectClass } from "../../exam/_components/ui";
import { ConditionEditor, ContentEditor } from "./builders";
import { Box, IssuesFor, Kind, ListTable, RowActions, RowLink, Title, move, newId, useRegEditor } from "./editor";
import { AUDIENCES, PresetPicker, QuestionList, presetLabel } from "./questions";

/** What the platform does on each essential page, in a line */
const ESSENTIAL: Record<string, string> = {
  track: "يختار الحاج القبول المباشر أو القرعة.",
  applicant: "الطلب له أو لشخص آخر بموافقته برمز على هاتفه.",
  residence: "داخل سوريا أو خارجها، ومنها يُعرف المكتب.",
  members: "إضافة المرافقين من دفتر العائلة أو بالرقم الوطني.",
  eligibility: "فحص الشروط لكل فرد، مع الحلول المقترحة.",
  consents: "موافقة كل بالغ في الطلب من هاتفه.",
  summary: "الملخص والمبلغ المطلوب.",
  payment: "الدفع بشام كاش أو المصرف، ثم تقديم الطلب.",
};

const kindOf = (s: StageDef) => (s.kind === "system" ? "أساسية" : s.fields.length ? `أسئلة (${s.fields.length})` : "تعليمات");

/** Moves a page; one the administration added takes the progress-bar part of the page it now follows */
function moveStage(stages: StageDef[], i: number, by: -1 | 1): StageDef[] {
  const next = move(stages, i, by);
  const st = next[i + by];
  if (!st || st.kind === "system") return next;
  const neighbour = next[i + by - 1] ?? next[i + by + 1];
  return neighbour && neighbour.phase !== st.phase ? next.map((x, j) => (j === i + by ? { ...x, phase: neighbour.phase } : x)) : next;
}

// ───────────────────────── All pages ─────────────────────────

export function PagesList() {
  const ed = useRegEditor();

  const [filter, setFilter] = useState<"all" | "on" | "off">("all");
  const [removing, setRemoving] = useState<StageDef | null>(null);
  const stages = ed.config.stages;
  const shown = stages.map((s, i) => ({ s, i })).filter(({ s }) => filter === "all" || (filter === "on" ? s.enabled : !s.enabled));
  const toggle = (s: StageDef) => ed.edit((c) => ({ ...c, stages: c.stages.map((x) => (x.id === s.id ? { ...x, enabled: !x.enabled } : x)) }), { action: s.enabled ? "إخفاء صفحة" : "إظهار صفحة", area: "stages", detail: s.name || s.title, ref: s.id });

  return (
    <div className="space-y-5">
      <Title
        action={
          ed.may("pages", "POST") && (
            <Link href="/staff/hajj/manage/edit" className="inline-flex items-center gap-1.5 rounded-xl border border-gold/60 px-3 py-1.5 text-sm font-bold text-gold hover:bg-gold hover:text-ink">
              <Plus className="size-4" /> إضافة صفحة جديدة
            </Link>
          )
        }
      />
      <Segments
        value={filter}
        onChange={setFilter}
        label="تصفية"
        items={[
          { value: "all", label: "الكل", count: stages.length },
          { value: "on", label: "ظاهرة", count: stages.filter((s) => s.enabled).length },
          { value: "off", label: "مخفية", count: stages.filter((s) => !s.enabled).length },
        ]}
      />
      <ListTable head={["", "الصفحة", "النوع", "تظهر لـ", "الحالة", "الترتيب"]}>
        {shown.map(({ s, i }) => {
          const required = s.kind === "system" && REQUIRED_BLOCKS.includes(s.system!);
          return (
            <tr key={s.id} className={cn("align-top", !s.enabled && "opacity-60")}>
              <td className="w-10 p-3 font-display font-bold text-gold">{i + 1}</td>
              <td className="p-3">
                <Link href={`/staff/hajj/manage/edit?id=${s.id}`} className="font-bold text-white hover:text-gold">
                  {s.name || s.title}
                </Link>
                {s.kind === "system" && <p className="text-xs text-white/55">{ESSENTIAL[s.system!]}</p>}
                <RowActions>
                  <RowLink href={`/staff/hajj/manage/edit?id=${s.id}`}>{ed.may("pages", "PUT") ? "تعديل" : "عرض"}</RowLink>
                  <RowLink href="/staff/hajj/manage/preview">معاينة</RowLink>
                  {ed.may("pages", "PUT") && !required && <RowLink onClick={() => toggle(s)}>{s.enabled ? "إخفاء" : "إظهار"}</RowLink>}
                  {ed.may("pages", "DELETE") && s.kind !== "system" && (
                    <RowLink danger onClick={() => setRemoving(s)}>
                      حذف
                    </RowLink>
                  )}
                </RowActions>
                <IssuesFor refs={[s.id]} where={s.kind === "system" ? BLOCK_LABEL[s.system!] : undefined} />
              </td>
              <td className="p-3">
                <Kind tone={s.kind === "system" ? "gold" : "muted"}>
                  {s.kind === "system" && <Lock className="me-1 size-3" />}
                  {kindOf(s)}
                </Kind>
              </td>
              <td className="p-3 text-white/80">{presetLabel(AUDIENCES, s.showIf)}</td>
              <td className="p-3">
                {!s.enabled ? <Kind tone="maroon">مخفية</Kind> : s.window ? <Kind tone="green">بمواعيد</Kind> : <Kind tone="green">ظاهرة</Kind>}
              </td>
              <td className="p-3">
                {ed.may("pages", "PUT") && filter === "all" && (
                  <span className="flex">
                    <button type="button" aria-label={`نقل ${s.name} إلى الأعلى`} disabled={i === 0} onClick={() => ed.edit((c) => ({ ...c, stages: moveStage(c.stages, i, -1) }), { action: "ترتيب الصفحات", area: "stages", detail: `${s.name} ↑`, ref: s.id })} className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25">
                      <ArrowUp className="size-4" />
                    </button>
                    <button type="button" aria-label={`نقل ${s.name} إلى الأسفل`} disabled={i === stages.length - 1} onClick={() => ed.edit((c) => ({ ...c, stages: moveStage(c.stages, i, 1) }), { action: "ترتيب الصفحات", area: "stages", detail: `${s.name} ↓`, ref: s.id })} className="grid size-8 place-items-center rounded-lg text-white/60 hover:bg-white/10 hover:text-white disabled:opacity-25">
                      <ArrowDown className="size-4" />
                    </button>
                  </span>
                )}
              </td>
            </tr>
          );
        })}
      </ListTable>
      <p className="text-xs leading-6 text-white/55">
        <Lock className="me-1 inline size-3" /> الصفحات <b>الأساسية</b> يعمل فيها نظام المنصة (الأهلية والموافقات والدفع…): تُعدَّل كلماتها وترتيبها، ولا تُحذف. صفحة إنشاء الحساب ليست هنا وتبقى كما هي.
      </p>

      <Messages key={`${ed.season}-${JSON.stringify(ed.config.messages)}`} />

      <Modal open={!!removing} onClose={() => setRemoving(null)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {removing && (
          <div>
            <p className="font-display text-xl font-bold">حذف صفحة «{removing.name || removing.title}»؟</p>
            <p className="mt-2 text-sm leading-7 text-white/75">لا يُفقد شيء: من أجاب عن أسئلتها تبقى إجاباته محفوظة في طلبه.</p>
            <div className="mt-4 flex gap-2">
              <Button
                variant="maroon"
                onClick={() => {
                  ed.edit((c) => ({ ...c, stages: c.stages.filter((x) => x.id !== removing.id) }), { action: "حذف صفحة", area: "stages", detail: removing.name, ref: removing.id });
                  setRemoving(null);
                }}
              >
                <Trash2 className="size-4" /> حذف
              </Button>
              <Button variant="glass" onClick={() => setRemoving(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

/** The few sentences around the form */
function Messages() {
  const ed = useRegEditor();

  const [m, setM] = useState(ed.config.messages);
  const changed = JSON.stringify(m) !== JSON.stringify(ed.config.messages);
  return (
    <Box title="نصوص عامة" open={false}>
      <label className="block">
        رقم المساعدة (بجانب الطلب)
        <textarea rows={2} value={m.helpLine} onChange={(e) => setM({ ...m, helpLine: e.target.value })} className={cn(textareaClass, "mt-1")} disabled={!ed.may("general-texts", "PUT")} />
      </label>
      <label className="block">
        حين يحفظ الحاج طلبه ليكمله لاحقاً
        <textarea rows={2} value={m.savedLater} onChange={(e) => setM({ ...m, savedLater: e.target.value })} className={cn(textareaClass, "mt-1")} disabled={!ed.may("general-texts", "PUT")} />
      </label>
      <label className="block">
        فوق الخطوات بعد القبول
        <textarea rows={2} value={m.postHeader} onChange={(e) => setM({ ...m, postHeader: e.target.value })} className={cn(textareaClass, "mt-1")} disabled={!ed.may("general-texts", "PUT")} />
      </label>
      {changed && ed.may("general-texts", "PUT") && (
        <Button size="sm" variant="gold" onClick={() => ed.edit((c) => ({ ...c, messages: m }), { action: "تعديل النصوص العامة", area: "stages", perm: "registration.general-texts.PUT" })}>
          <Save className="size-4" /> حفظ
        </Button>
      )}
    </Box>
  );
}

// ───────────────────────── Edit one page ─────────────────────────

const blankPage = (phase: string): StageDef => ({ id: newId("stage"), kind: "form", name: "", title: "", hint: "", phase, blocks: [], fields: [], enabled: true, gates: [] });

/**
 * One page, as a site's page editor: its words, its text and its questions in the middle, and on the side
 * whether it shows, where it stands, who sees it and when — with the pilgrim's view of it underneath.
 */
export function PageEditor() {
  const params = useSearchParams();
  const ed = useRegEditor();
  const id = params.get("id");
  const existing = ed.config.stages.find((s) => s.id === id);
  // A new page goes before the summary, in the part of the bar the page before it is in
  const summaryAt = ed.config.stages.findIndex((s) => s.system === "summary");
  return <Editor key={`${ed.season}-${id ?? "new"}-${existing ? "found" : "new"}`} initial={existing ?? blankPage(ed.config.stages[Math.max(0, summaryAt - 1)]?.phase ?? "")} isNew={!existing} defaultAfter={existing ? undefined : ed.config.stages[Math.max(0, summaryAt - 1)]?.id} />;
}

function Editor({ initial, isNew: opened, defaultAfter }: { initial: StageDef; isNew: boolean; defaultAfter?: string }) {
  const ed = useRegEditor();

  const toast = useToast();
  const router = useRouter();
  const [s, setS] = useState(initial);
  const others = ed.config.stages.filter((x) => x.id !== s.id);
  const at = ed.config.stages.findIndex((x) => x.id === s.id);
  const isNew = opened && at < 0;
  // A new page needs adding, a stored one changing
  const ro = !ed.may("pages", isNew ? "POST" : "PUT");
  const [after, setAfter] = useState<string>(defaultAfter ?? (at > 0 ? ed.config.stages[at - 1].id : "__first"));
  const [removing, setRemoving] = useState(false);
  const set = (p: Partial<StageDef>) => setS((x) => ({ ...x, ...p }));
  const system = s.kind === "system";
  const required = system && REQUIRED_BLOCKS.includes(s.system!);
  const position = after === "__first" ? 0 : others.findIndex((x) => x.id === after) + 1;
  const before = useMemo(() => others.slice(0, position).flatMap((x) => x.fields), [others, position]);
  const published = useMemo(() => new Set(ed.versions.list.flatMap((v) => allFields(v.config).map((f) => f.key))), [ed.versions.list]);
  const phases = [...new Set(ed.config.stages.map((x) => x.phase))];
  // Against what is stored now (after a save the page and its place are the stored ones)
  const stored = ed.config.stages[at];
  const dirty = !stored || JSON.stringify(s) !== JSON.stringify(stored) || after !== (at > 0 ? ed.config.stages[at - 1].id : "__first");
  const me = getPerson("01012345412")!;

  const save = () => {
    if (!system && !s.title.trim()) return toast({ title: "اكتب عنوان الصفحة أولاً", icon: "✏️", tone: "gold" });
    if (s.fields.some((f) => !f.label.trim())) return toast({ title: "في الصفحة سؤال بلا نص", body: "اكتب نصه أو احذفه.", icon: "✏️", tone: "gold" });
    const page: StageDef = system ? s : { ...s, kind: s.fields.length ? "form" : "content", name: s.name.trim() || s.title };
    const ok = ed.edit(
      (c) => {
        const rest = c.stages.filter((x) => x.id !== page.id);
        const to = after === "__first" ? 0 : rest.findIndex((x) => x.id === after) + 1;
        return { ...c, stages: [...rest.slice(0, to), page, ...rest.slice(to)] };
      },
      { action: isNew ? "إضافة صفحة" : "تعديل صفحة", area: "stages", detail: page.name, ref: page.id },
    );
    if (!ok) return;
    setS(page);
    toast({ title: isNew ? "أُضيفت الصفحة" : "حُفظت الصفحة", body: "لا يراها الحجاج حتى «نشر التغييرات» في الأعلى.", icon: "💾", tone: "success" });
    if (isNew) router.replace(`/staff/hajj/manage/edit?id=${page.id}`);
  };

  return (
    <div>
      <div className="mb-5">
        <Link href="/staff/hajj/manage" className="inline-flex items-center gap-1 text-sm font-bold text-gold hover:underline">
          <ArrowRight className="size-4" /> كل الصفحات
        </Link>
        <h1 className="mt-2 font-display text-3xl font-bold text-white">{isNew ? "إضافة صفحة جديدة" : system ? `تعديل «${s.name}»` : "تعديل الصفحة"}</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_19rem]">
        <fieldset disabled={ro} className="min-w-0 space-y-5">
          {system && (
            <p className="flex items-start gap-2 rounded-2xl bg-gold/10 p-4 text-sm leading-7 text-white/85 ring-1 ring-gold/30">
              <ShieldCheck className="mt-1 size-4 shrink-0 text-gold" /> صفحة أساسية: {ESSENTIAL[s.system!]} يعمل فيها نظام المنصة، فتُعدَّل هنا كلماتها ومكانها فقط. اترك العنوان فارغاً لتبقى صياغة المنصة التي تتبع حال الحاج.
            </p>
          )}
          <input value={s.title} onChange={(e) => set({ title: e.target.value })} placeholder={system ? "العنوان (فارغ = صياغة المنصة)" : "أضف العنوان"} aria-label="العنوان" className="h-16 w-full rounded-2xl border-2 border-white/15 bg-white/10 px-5 font-display text-2xl font-bold text-white outline-none placeholder:text-white/35 focus:border-gold" />
          <textarea rows={2} value={s.hint ?? ""} onChange={(e) => set({ hint: e.target.value })} placeholder="سطر أو سطران تحت العنوان (اختياري)" aria-label="النص تحت العنوان" className={textareaClass} />

          {!system && (
            <>
              <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
                <h2 className="mb-3 font-bold text-white">نص وتعليمات</h2>
                <ContentEditor blocks={s.blocks} onChange={(blocks) => set({ blocks })} />
              </section>
              <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
                <h2 className="mb-3 font-bold text-white">الأسئلة</h2>
                <QuestionList fields={s.fields} onChange={(fields) => set({ fields })} before={before} published={published} />
              </section>
              <section className="rounded-3xl bg-white p-5 text-ink md:p-8">
                <p className="mb-4 text-xs font-bold text-gold-dark">هكذا يراها الحاج (بيانات تجريبية: {me.firstName})</p>
                <ConfiguredStage
                  stage={{ ...s, title: s.title || "العنوان", nextLabel: s.nextLabel }}
                  tokens={{ firstName: me.firstName, applicantName: me.firstName, fee: 25, directAge: 68, maxCompanions: 3, maxCompanionsFamily: 5, members: 1 }}
                  ctx={{ members: [{ person: me, relation: "self", relationVerified: true, needs: [] }], answers: {}, memberAnswers: {}, elderlyMaxBirthYear: 1957 }}
                  errors={[]}
                  onAnswer={() => {}}
                  onMemberAnswer={() => {}}
                  onNext={() => {}}
                />
              </section>
            </>
          )}
          <IssuesFor refs={[s.id]} />
        </fieldset>

        <aside className="space-y-4">
          {!ro && (
            <Box title="الحفظ">
              {!required && (
                <span className="flex items-center gap-2 font-bold text-white">
                  <Switch on={s.enabled} onChange={(v) => set({ enabled: v })} label="ظاهرة للحجاج" /> {s.enabled ? "ظاهرة للحجاج" : "مخفية"}
                </span>
              )}
              <Button variant="gold" className="w-full" onClick={save} disabled={!dirty}>
                <Save className="size-4" /> {isNew ? "إضافة الصفحة" : "حفظ"}
              </Button>
              <p className="text-xs leading-5 text-white/55">{dirty ? "لديك تعديلات لم تُحفظ." : "محفوظة."} بعد الحفظ تظهر للحجاج حين تضغط «نشر التغييرات».</p>
              {!isNew && !system && ed.may("pages", "DELETE") && (
                <button type="button" onClick={() => setRemoving(true)} className="text-xs font-bold text-[#ffb4c8] hover:underline">
                  حذف الصفحة
                </button>
              )}
            </Box>
          )}

          <Box title="مكانها">
            <label className="block">
              تأتي بعد
              <select
                value={after}
                onChange={(e) => {
                  setAfter(e.target.value);
                  // A page joins the part of the progress bar of the page it now follows
                  if (!system) set({ phase: (e.target.value === "__first" ? others[0] : others.find((x) => x.id === e.target.value))?.phase ?? s.phase });
                }}
                className={cn(selectClass, "mt-1")}
                disabled={ro}
              >
                <option value="__first">— في البداية —</option>
                {others.map((x) => (
                  <option key={x.id} value={x.id}>
                    {x.name || x.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="block">
              في شريط التقدم تحت
              <input list="reg-phases" value={s.phase} onChange={(e) => set({ phase: e.target.value })} className={cn(smallInputClass, "mt-1")} disabled={ro} />
              <datalist id="reg-phases">
                {phases.map((p) => (
                  <option key={p} value={p} />
                ))}
              </datalist>
            </label>
          </Box>

          {!required && (
            <Box title="لمن تظهر">
              <PresetPicker list={AUDIENCES} value={s.showIf} onChange={(c) => set({ showIf: c })} fields={before} />
            </Box>
          )}

          {!required && (
            <Box title="مواعيد الظهور" open={!!s.window}>
              <p className="text-xs text-white/55">اتركهما فارغين لتظهر طوال التسجيل.</p>
              <label className="block">
                من يوم
                <input type="date" value={s.window?.from ?? ""} onChange={(e) => set({ window: e.target.value || s.window?.to ? { ...s.window, from: e.target.value || undefined } : undefined })} className={cn(smallInputClass, "mt-1")} dir="ltr" />
              </label>
              <label className="block">
                حتى يوم
                <input type="date" value={s.window?.to ?? ""} onChange={(e) => set({ window: e.target.value || s.window?.from ? { ...s.window, to: e.target.value || undefined } : undefined })} className={cn(smallInputClass, "mt-1")} dir="ltr" />
              </label>
            </Box>
          )}

          <Box title="شرط قبل المتابعة (متقدم)" open={s.gates.length > 0}>
            <p className="text-xs leading-5 text-white/55">ما يجب أن يتحقق ليتابع الحاج بعد هذه الصفحة، ورسالته إن لم يتحقق. مثال: أن يجيب «نعم» عن سؤال إقرار.</p>
            {s.gates.map((g) => (
              <div key={g.id} className="space-y-2 rounded-xl bg-black/15 p-2">
                <ConditionEditor value={g.when} onChange={(c) => set({ gates: s.gates.map((x) => (x.id === g.id ? { ...x, when: c ?? { all: [] } } : x)) })} fields={[...before, ...s.fields]} empty="لم يُحدَّد بعد" />
                <input value={g.message} placeholder="الرسالة إن لم يتحقق" onChange={(e) => set({ gates: s.gates.map((x) => (x.id === g.id ? { ...x, message: e.target.value } : x)) })} className={cn(smallInputClass, "h-10")} />
                <button type="button" onClick={() => set({ gates: s.gates.filter((x) => x.id !== g.id) })} className="text-xs font-bold text-[#ffb4c8] hover:underline">
                  حذف الشرط
                </button>
              </div>
            ))}
            <button type="button" onClick={() => set({ gates: [...s.gates, { id: newId("g"), when: { all: [] }, message: "" } as Gate] })} className="text-sm font-bold text-gold hover:underline">
              + إضافة شرط
            </button>
          </Box>
        </aside>
      </div>

      <Modal open={removing} onClose={() => setRemoving(false)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="font-display text-xl font-bold">حذف هذه الصفحة؟</p>
        <p className="mt-2 text-sm leading-7 text-white/75">لا يُفقد شيء: من أجاب عن أسئلتها تبقى إجاباته محفوظة في طلبه.</p>
        <div className="mt-4 flex gap-2">
          <Button
            variant="maroon"
            onClick={() => {
              ed.edit((c) => ({ ...c, stages: c.stages.filter((x) => x.id !== s.id) }), { action: "حذف صفحة", area: "stages", detail: s.name, ref: s.id });
              router.push("/staff/hajj/manage");
            }}
          >
            <Trash2 className="size-4" /> حذف
          </Button>
          <Button variant="glass" onClick={() => setRemoving(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}
