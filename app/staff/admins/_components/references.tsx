"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { ArrowDown, ArrowUp, BadgeCheck, BookOpenText, ClipboardList, Eye, EyeOff, FileSignature, FileText, Pencil, Plus, RotateCcw, ScrollText, Trash2, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { actions, useStore, type AdminRefs, type OperationalPlan } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { RefText } from "@/app/administrator/_components/ref-text";
import { DEFAULT_CONTRACTS, DEFAULT_DECISIONS, DEFAULT_SYSTEM, useAdminRefs, type JobDescription, type SystemSection } from "@/app/administrator/_lib/references";
import { Drawer, Empty, Panel, Tabs, fmtDateTime, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { logAdmins } from "../desk";

type Tab = "jobs" | "system" | "decisions" | "contracts" | "plans";

/**
 * «المراجع الإدارية» — what the administration publishes to its cadre, as its platform keeps it: each role's job
 * description (rewritten, hidden or ordered), the administrative system in its sections, the books of decisions
 * and the contract forms — all on the public pages for the cadre — and the operational plans the cluster heads
 * file, each accepted or sent back with notes. Every change is in this page's record.
 */
export function ReferencesTab() {
  const params = useSearchParams();
  const router = useRouter();
  const refs = useAdminRefs();
  const plans = useStore((s) => s.plans);
  const tab = (["jobs", "system", "decisions", "contracts", "plans"] as const).find((t) => t === params.get("tab")) ?? "jobs";
  const setTab = (t: Tab) => router.replace(`/staff/admins/manage/references${t === "jobs" ? "" : `?tab=${t}`}`, { scroll: false });
  return (
    <div className="space-y-6">
      <Tabs
        id="admin-references"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "jobs", label: "التوصيف الوظيفي", count: refs.jobs.filter((j) => !j.hidden).length },
          { value: "system", label: "النظام الإداري", count: refs.system.length },
          { value: "decisions", label: "المقررات الإدارية", count: refs.decisions.length },
          { value: "contracts", label: "العقود", count: refs.contracts.length },
          { value: "plans", label: "الخطط التشغيلية", count: Object.keys(plans).length },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === "jobs" && <Jobs />}
          {tab === "system" && <System />}
          {tab === "decisions" && <Files kind="decisions" />}
          {tab === "contracts" && <Files kind="contracts" />}
          {tab === "plans" && <Plans />}
        </motion.div>
      </AnimatePresence>
      <SystemRecords system="admins" area="references" title="سجل المراجع الإدارية" />
    </div>
  );
}

const PublicLink = ({ href, label }: { href: string; label: string }) => (
  <Link href={href} target="_blank" className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/20 hover:bg-white/15">
    <Eye className="size-3.5" /> {label}
  </Link>
);

// ───────────────────────── Job descriptions ─────────────────────────

function Jobs() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { jobs, edited } = useAdminRefs();
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const save = (patch: AdminRefs, action: string, target: string) => {
    actions.setAdminRefs(patch);
    logAdmins(user, "references", { action, target, ref: "jobs" });
  };
  const move = (i: number, d: number) => {
    const order = jobs.map((j) => j.key);
    [order[i], order[i + d]] = [order[i + d], order[i]];
    save({ jobOrder: order }, "إعادة ترتيب التوصيف الوظيفي", jobs[i].name);
  };
  const toggle = (j: JobDescription) => save({ jobs: { ...edited.jobs, [j.key]: { ...edited.jobs?.[j.key], hidden: !j.hidden } } }, j.hidden ? "إظهار توصيف صفة" : "إخفاء توصيف صفة", j.name);
  return (
    <Panel
      icon={<BookOpenText />}
      title="التوصيف الوظيفي"
      action={
        <span className="flex flex-wrap gap-2">
          {(edited.jobs || edited.jobOrder) && (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => save({ jobs: undefined, jobOrder: undefined }, "إعادة التوصيف الوظيفي إلى الأصل", "كل الصفات")}>
              <RotateCcw className="size-4" /> إلى الأصل
            </Button>
          )}
          <PublicLink href="/administrator/job-descriptions" label="الصفحة العامة" />
        </span>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">بطاقة لكل صفة في «القوائم المرجعية» ولكل صفة ثانوية في التكتل: خلاصتها ومهامها. رتّبها، وأخفِ ما لا يُنشر، وعدّل نصها. تظهر في الصفحة العامة للتوصيف الوظيفي وتُطبع منها.</p>
      <ol className="space-y-2">
        {jobs.map((j, i) => (
          <li key={j.key} className={cn("rounded-2xl p-3 ring-1", j.hidden ? "bg-white/[.03] opacity-60 ring-white/10" : "bg-white/[.06] ring-white/10")}>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex flex-wrap items-center gap-2 font-bold text-white">
                  {j.name} <Chip>{j.level}</Chip> {j.secondary && <Chip tone="gold">صفة ثانوية</Chip>} {j.hidden && <Chip tone="maroon">مخفية</Chip>}
                </p>
                <p className="mt-1 text-xs leading-6 text-white/65">{j.summary}</p>
                <p className="text-[11px] text-white/45">{j.duties.length} مهام</p>
              </div>
              <div className="flex shrink-0 items-center">
                <IconBtn label="إلى الأعلى" disabled={i === 0} onClick={() => move(i, -1)}>
                  <ArrowUp className="size-4" />
                </IconBtn>
                <IconBtn label="إلى الأسفل" disabled={i === jobs.length - 1} onClick={() => move(i, 1)}>
                  <ArrowDown className="size-4" />
                </IconBtn>
                <IconBtn label={j.hidden ? `إظهار ${j.name}` : `إخفاء ${j.name}`} onClick={() => toggle(j)}>
                  {j.hidden ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
                </IconBtn>
                <IconBtn label={`تعديل ${j.name}`} onClick={() => setEditing(j)}>
                  <Pencil className="size-4" />
                </IconBtn>
              </div>
            </div>
          </li>
        ))}
      </ol>
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing ? `توصيف «${editing.name}»` : ""}>
        {editing && (
          <JobForm
            j={editing}
            onSave={(summary, duties) => {
              save({ jobs: { ...edited.jobs, [editing.key]: { ...edited.jobs?.[editing.key], summary, duties } } }, "تعديل توصيف صفة", editing.name);
              toast({ title: `حُفظ توصيف «${editing.name}»`, tone: "success", icon: "💾" });
              setEditing(null);
            }}
          />
        )}
      </Drawer>
    </Panel>
  );
}

function IconBtn({ onClick, label, children, disabled, danger }: { onClick: () => void; label: string; children: React.ReactNode; disabled?: boolean; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className={cn("grid size-9 shrink-0 place-items-center rounded-xl text-white/70 disabled:opacity-30", danger ? "hover:bg-maroon/40" : "hover:bg-white/10")}>
      {children}
    </button>
  );
}

function JobForm({ j, onSave }: { j: JobDescription; onSave: (summary: string, duties: string[]) => void }) {
  const [summary, setSummary] = useState(j.summary);
  const [duties, setDuties] = useState(j.duties.join("\n"));
  return (
    <div className="space-y-4 text-sm">
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">خلاصة الصفة</span>
        <textarea rows={3} value={summary} onChange={(e) => setSummary(e.target.value)} className={textareaClass} />
      </label>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">المهام — مهمة في كل سطر</span>
        <textarea rows={8} value={duties} onChange={(e) => setDuties(e.target.value)} className={textareaClass} />
      </label>
      <Button variant="gold" disabled={!summary.trim()} onClick={() => onSave(summary.trim(), duties.split("\n").map((d) => d.trim()).filter(Boolean))}>
        حفظ التوصيف
      </Button>
    </div>
  );
}

// ───────────────────────── The administrative system ─────────────────────────

function System() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { system, edited } = useAdminRefs();
  const [open, setOpen] = useState<SystemSection | "new" | null>(null);
  const save = (next: SystemSection[], action: string, target: string) => {
    actions.setAdminRefs({ system: next });
    logAdmins(user, "references", { action, target, ref: "system", important: true });
  };
  const move = (i: number, d: number) => {
    const next = [...system];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    save(next, "إعادة ترتيب أقسام النظام الإداري", next[i + d].title);
  };
  return (
    <Panel
      icon={<ScrollText />}
      title="النظام الإداري"
      action={
        <span className="flex flex-wrap gap-2">
          {edited.system && (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => { actions.setAdminRefs({ system: undefined }); logAdmins(user, "references", { action: "إعادة النظام الإداري إلى الأصل", target: `${DEFAULT_SYSTEM.length} أقسام`, ref: "system", important: true }); }}>
              <RotateCcw className="size-4" /> إلى الأصل
            </Button>
          )}
          <Button size="sm" variant="gold" onClick={() => setOpen("new")}>
            <Plus className="size-4" /> قسم جديد
          </Button>
          <PublicLink href="/administrator/system" label="الصفحة العامة" />
        </span>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">أقسام النظام بترتيبها. نص كل قسم فقرات وقوائم: سطر فارغ يفصل الفقرات، و«- » يبدأ بنداً، و«**كلمة**» بخط عريض.</p>
      <ol className="space-y-2">
        {system.map((sec, i) => (
          <li key={sec.id} className="flex items-start gap-3 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
            <button type="button" onClick={() => setOpen(sec)} className="min-w-0 flex-1 text-right">
              <span className="block font-bold text-white">{sec.title}</span>
              <span className="line-clamp-2 block text-xs leading-6 text-white/60">{sec.body}</span>
            </button>
            <IconBtn label="إلى الأعلى" disabled={i === 0} onClick={() => move(i, -1)}>
              <ArrowUp className="size-4" />
            </IconBtn>
            <IconBtn label="إلى الأسفل" disabled={i === system.length - 1} onClick={() => move(i, 1)}>
              <ArrowDown className="size-4" />
            </IconBtn>
            <IconBtn danger label={`حذف ${sec.title}`} onClick={() => { save(system.filter((x) => x.id !== sec.id), "حذف قسم من النظام الإداري", sec.title); toast({ title: "حُذف القسم", body: sec.title, tone: "info", icon: "🗑️" }); }}>
              <Trash2 className="size-4" />
            </IconBtn>
          </li>
        ))}
      </ol>
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open === "new" ? "قسم جديد" : open ? open.title : ""} width="max-w-3xl">
        {open && (
          <SectionForm
            sec={open === "new" ? { id: `s-${nowMs().toString(36)}`, title: "", body: "" } : open}
            onSave={(sec) => {
              const exists = system.some((x) => x.id === sec.id);
              save(exists ? system.map((x) => (x.id === sec.id ? sec : x)) : [...system, sec], exists ? "تعديل قسم من النظام الإداري" : "إضافة قسم إلى النظام الإداري", sec.title);
              toast({ title: "حُفظ القسم", body: sec.title, tone: "success", icon: "💾" });
              setOpen(null);
            }}
          />
        )}
      </Drawer>
    </Panel>
  );
}

function SectionForm({ sec, onSave }: { sec: SystemSection; onSave: (s: SystemSection) => void }) {
  const [title, setTitle] = useState(sec.title);
  const [body, setBody] = useState(sec.body);
  return (
    <div className="grid gap-4 text-sm lg:grid-cols-2">
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان القسم" aria-label="عنوان القسم" className={smallInputClass} />
        <textarea rows={16} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} aria-label="نص القسم" />
        <Button variant="gold" disabled={!title.trim() || !body.trim()} onClick={() => onSave({ ...sec, title: title.trim(), body: body.trim() })}>
          حفظ القسم
        </Button>
      </div>
      <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
        <p className="mb-2 text-xs font-bold text-gold">كما يظهر في الصفحة العامة</p>
        <p className="mb-2 font-bold text-white">{title || "—"}</p>
        <RefText body={body} dark className="text-sm" />
      </div>
    </div>
  );
}

// ───────────────────────── Decisions and contract forms ─────────────────────────

function Files({ kind }: { kind: "decisions" | "contracts" }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useAdminRefs();
  const list = kind === "decisions" ? refs.decisions : refs.contracts;
  const isDecisions = kind === "decisions";
  const [draft, setDraft] = useState<{ id?: string; title: string; second: string; desc: string; file: string } | null>(null);
  const write = (next: typeof list, action: string, target: string) => {
    actions.setAdminRefs(isDecisions ? { decisions: next as AdminRefs["decisions"] } : { contracts: next as AdminRefs["contracts"] });
    logAdmins(user, "references", { action, target, ref: kind, important: isDecisions });
  };
  const save = () => {
    if (!draft) return;
    const id = draft.id ?? `${kind[0]}-${nowMs().toString(36)}`;
    const item = isDecisions ? { id, title: draft.title.trim(), year: draft.second.trim(), desc: draft.desc.trim(), file: draft.file } : { id, title: draft.title.trim(), party: draft.second.trim(), desc: draft.desc.trim(), file: draft.file };
    const exists = list.some((x) => x.id === id);
    write((exists ? list.map((x) => (x.id === id ? item : x)) : [item, ...list]) as typeof list, exists ? (isDecisions ? "تعديل مقرر إداري" : "تعديل نموذج عقد") : isDecisions ? "نشر مقرر إداري" : "إضافة نموذج عقد", item.title);
    toast({ title: exists ? "حُفظ" : "نُشر", body: item.title, tone: "success", icon: "📚" });
    setDraft(null);
  };
  const second = (x: (typeof list)[number]) => ("year" in x ? `موسم ${x.year}` : x.party);
  return (
    <Panel
      icon={isDecisions ? <FileText /> : <FileSignature />}
      title={isDecisions ? "المقررات الإدارية" : "نماذج العقود"}
      action={
        <span className="flex flex-wrap gap-2">
          {(isDecisions ? refs.edited.decisions : refs.edited.contracts) && (
            <Button size="sm" variant="ghost" className="text-white" onClick={() => write((isDecisions ? DEFAULT_DECISIONS : DEFAULT_CONTRACTS) as typeof list, "إعادة القائمة إلى الأصل", isDecisions ? "المقررات" : "العقود")}>
              <RotateCcw className="size-4" /> إلى الأصل
            </Button>
          )}
          <Button size="sm" variant="gold" onClick={() => setDraft({ title: "", second: isDecisions ? "1448" : "", desc: "", file: "" })}>
            <Plus className="size-4" /> {isDecisions ? "مقرر جديد" : "نموذج جديد"}
          </Button>
          <PublicLink href={isDecisions ? "/administrator/decisions" : "/administrator/contracts"} label="الصفحة العامة" />
        </span>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">{isDecisions ? "كتب المقررات التي تعدّل بها الإدارة النظام الإداري، بموسمها وملفها، منشورة للكادر." : "نماذج العقود التي يوقّعها الحاج والإداري ورئيس التكتل، يحمّلها كلٌّ من الصفحة العامة."}</p>
      {list.length === 0 ? (
        <Empty icon={<FileText />} title="القائمة فارغة" text="أضف أول عنصر." />
      ) : (
        <ul className="grid gap-2 md:grid-cols-2">
          {list.map((x) => (
            <li key={x.id} className="flex items-start gap-2 rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <span className="min-w-0 flex-1">
                <span className="block font-bold text-white">{x.title}</span>
                <span className="block text-xs text-gold">{second(x)}</span>
                <span className="block text-xs leading-6 text-white/65">{x.desc}</span>
                <span className="block text-[11px] text-white/45">📎 {x.file || "بلا ملف"}</span>
              </span>
              <IconBtn label={`تعديل ${x.title}`} onClick={() => setDraft({ id: x.id, title: x.title, second: "year" in x ? x.year : x.party, desc: x.desc, file: x.file })}>
                <Pencil className="size-4" />
              </IconBtn>
              <IconBtn danger label={`حذف ${x.title}`} onClick={() => write(list.filter((y) => y.id !== x.id) as typeof list, isDecisions ? "حذف مقرر إداري" : "حذف نموذج عقد", x.title)}>
                <Trash2 className="size-4" />
              </IconBtn>
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!draft} onClose={() => setDraft(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {draft && (
          <div className="space-y-3 text-sm">
            <p className="text-xs font-bold text-gold">{draft.id ? "تعديل" : isDecisions ? "مقرر جديد" : "نموذج جديد"}</p>
            <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={isDecisions ? "المقرر 4/1448: …" : "اسم العقد"} aria-label="العنوان" className={smallInputClass} />
            <input value={draft.second} onChange={(e) => setDraft({ ...draft, second: isDecisions ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value })} placeholder={isDecisions ? "الموسم" : "طرفاه"} aria-label={isDecisions ? "الموسم" : "طرفاه"} className={smallInputClass} dir={isDecisions ? "ltr" : undefined} />
            <textarea rows={3} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} placeholder="وصف قصير" aria-label="الوصف" className={textareaClass} />
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15">
              📎 {draft.file || "رفع الملف (PDF)"}
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0]?.name ?? draft.file })} />
            </label>
            <div className="flex gap-2">
              <Button variant="gold" disabled={draft.title.trim().length < 3 || !draft.second.trim() || !draft.file} onClick={save}>
                {draft.id ? "حفظ" : "نشر"}
              </Button>
              <Button variant="glass" onClick={() => setDraft(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}

// ───────────────────────── Operational plans ─────────────────────────

export const PLAN_STATE: Record<OperationalPlan["status"], { label: string; tone: "gold" | "green" | "maroon" }> = {
  submitted: { label: "تنتظر القرار", tone: "gold" },
  accepted: { label: "مقبولة", tone: "green" },
  returned: { label: "أُعيدت بملاحظات", tone: "maroon" },
};

function Plans() {
  const user = useStaffUser()!;
  const toast = useToast();
  const plans = Object.values(useStore((s) => s.plans)).sort((a, b) => b.at - a.at);
  const [returning, setReturning] = useState<OperationalPlan | null>(null);
  const [note, setNote] = useState("");
  const decide = (p: OperationalPlan, status: "accepted" | "returned", why?: string) => {
    actions.setPlan(p.clusterId, { ...p, status, decision: { by: user.name, at: nowMs(), note: why } });
    logAdmins(user, "references", { action: status === "accepted" ? "قبول خطة تشغيلية" : "إعادة خطة تشغيلية بملاحظات", target: p.clusterName, detail: why, ref: p.clusterId, important: true });
    toast({ title: status === "accepted" ? "قُبلت الخطة" : "أُعيدت الخطة", body: `${p.clusterName} — تصل ${p.headName} في «إدارة التكتل».`, tone: status === "accepted" ? "success" : "info", icon: status === "accepted" ? "✅" : "↩️" });
    setReturning(null);
    setNote("");
  };
  return (
    <Panel icon={<ClipboardList />} title="الخطط التشغيلية" action={<PublicLink href="/administrator/plans" label="الصفحة العامة" />}>
      <p className="mb-4 text-sm leading-7 text-white/70">يقدّم رئيس كل تكتل معتمد خطته التشغيلية من «إدارة التكتل» في حسابه: السكن والنقل والإعاشة والتفويج ومراحل العمل، بملفها. اقبلها، أو أعدها بملاحظات يصلحها ويعيد تقديمها.</p>
      {plans.length === 0 ? (
        <Empty icon={<ClipboardList />} title="لم تُقدَّم خطة بعد" text="تصل هنا حين يقدّمها رئيس تكتل." />
      ) : (
        <ul className="space-y-2">
          {plans.map((p) => (
            <li key={p.clusterId} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <div className="flex flex-wrap items-start gap-2">
                <span className="min-w-0 flex-1">
                  <span className="block font-bold text-white">
                    {p.clusterName} — {p.title}
                  </span>
                  <span className="block text-xs text-white/60">
                    قدّمها {p.headName} — {fmtDateTime(p.at)} — 📎 {p.file}
                  </span>
                </span>
                <Chip tone={PLAN_STATE[p.status].tone}>{PLAN_STATE[p.status].label}</Chip>
              </div>
              <p className="mt-2 whitespace-pre-line text-sm leading-7 text-white/80">{p.summary}</p>
              {p.decision?.note && <p className="mt-1 text-xs text-gold">ملاحظات الإعادة: {p.decision.note}</p>}
              {p.status === "submitted" && (
                <div className="mt-3 flex gap-2">
                  <Button size="sm" variant="gold" onClick={() => decide(p, "accepted")}>
                    <BadgeCheck className="size-4" /> قبول
                  </Button>
                  <Button size="sm" variant="glass" onClick={() => setReturning(p)}>
                    <X className="size-4" /> إعادة بملاحظات
                  </Button>
                </div>
              )}
              {p.decision && p.status !== "submitted" && <p className="mt-1 text-[11px] text-white/45">{p.status === "accepted" ? "قبلها" : "أعادها"} {p.decision.by} — {fmtDateTime(p.decision.at)}</p>}
            </li>
          ))}
        </ul>
      )}
      <Modal open={!!returning} onClose={() => setReturning(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        {returning && (
          <div className="space-y-3">
            <p className="text-xs font-bold text-gold">إعادة الخطة بملاحظات</p>
            <h3 className="font-display text-xl font-bold">{returning.clusterName}</h3>
            <textarea rows={4} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} placeholder="ما يصلحه رئيس التكتل" aria-label="الملاحظات" />
            <div className="flex gap-2">
              <Button variant="gold" disabled={note.trim().length < 5} onClick={() => decide(returning, "returned", note.trim())}>
                إعادة
              </Button>
              <Button variant="glass" onClick={() => setReturning(null)}>
                إلغاء
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </Panel>
  );
}
