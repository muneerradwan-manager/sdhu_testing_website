"use client";

import Link from "next/link";
import { BadgeCheck, Eye, RotateCcw, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { actions, useStore, type AdminRefs, type OperationalPlan } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { RefText } from "@/app/administrator/_components/ref-text";
import { DEFAULT_CONTRACTS, DEFAULT_DECISIONS, DEFAULT_SYSTEM, useAdminRefs, type JobDescription, type SystemSection } from "@/app/administrator/_lib/references";
import { Drawer, fmtDateTime, smallInputClass, textareaClass, useCan, useStaffUser } from "../../_components/kit";
import { InfoGrid } from "../../_components/ops-ui";
import { AddButton, Box, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { RecordHistory } from "../../_components/system";
import { Filters, Lead, Locked, Order, TitleCell, Views, useView } from "./ui";
import { logAdmins } from "../desk";

const TABS = ["jobs", "system", "decisions", "contracts", "plans"] as const;
type Tab = (typeof TABS)[number];

/** What viewing each list needs */
const TAB_GET: Record<Tab, string> = { jobs: "admins.job-descriptions.GET", system: "admins.system-sections.GET", decisions: "admins.decisions.GET", contracts: "admins.contract-templates.GET", plans: "admins.operational-plans.GET" };

/**
 * «المراجع الإدارية» — what the administration publishes to its cadre, one list at a time from the row at the
 * top (its address keeps it, `?tab=`): each role's job description, the administrative system in its sections,
 * the books of decisions and the contract forms — all on the public pages for the cadre — and the operational
 * plans the cluster heads file, each accepted or sent back with notes. Every change is in this page's record.
 */
export function ReferencesTab() {
  const refs = useAdminRefs();
  const plans = useStore((s) => s.plans);
  const tab = useView<Tab>("tab", TABS);
  const waiting = Object.values(plans).filter((p) => p.status === "submitted").length;
  const may = useCan();
  if (!may(TAB_GET[tab])) return <Locked perm={TAB_GET[tab]} />;
  return (
    <div className="space-y-6">
      <Views
        param="tab"
        value={tab}
        tabs
        label="المراجع الإدارية"
        items={[
          { key: "jobs", label: "التوصيف الوظيفي", count: refs.jobs.filter((j) => !j.hidden).length },
          { key: "system", label: "النظام الإداري", count: refs.system.length },
          { key: "decisions", label: "المقررات الإدارية", count: refs.decisions.length },
          { key: "contracts", label: "العقود", count: refs.contracts.length },
          { key: "plans", label: waiting ? `الخطط التشغيلية — ${waiting} تنتظر` : "الخطط التشغيلية", count: Object.keys(plans).length },
        ].filter((x) => may(TAB_GET[x.key as Tab]))}
      />
      {tab === "jobs" && <Jobs />}
      {tab === "system" && <System />}
      {tab === "decisions" && <Files kind="decisions" />}
      {tab === "contracts" && <Files kind="contracts" />}
      {tab === "plans" && <Plans />}
      <RecordsBox system="admins" area="references" title="سجل المراجع الإدارية" />
    </div>
  );
}

const PublicLink = ({ href, label = "الصفحة العامة" }: { href: string; label?: string }) => (
  <Link href={href} target="_blank" className="inline-flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-sm font-bold text-white/75 ring-1 ring-white/15 hover:bg-white/10 hover:text-white">
    <Eye className="size-4" /> {label}
  </Link>
);

// ───────────────────────── Job descriptions ─────────────────────────

function Jobs() {
  const user = useStaffUser()!;
  const toast = useToast();
  const { jobs, edited } = useAdminRefs();
  const [editing, setEditing] = useState<JobDescription | null>(null);
  const may = useCan();
  const mayEdit = may("admins.job-descriptions.PUT");
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
    <div className="space-y-4">
      <Title action={<PublicLink href="/administrator/job-descriptions" />}>التوصيف الوظيفي</Title>
      <Lead>بطاقة لكل صفة: خلاصتها ومهامها، كما تظهر في الصفحة العامة وتُطبع منها.</Lead>
      <ListTable head={["الصفة", "المستوى", "المهام", "الحالة", "الترتيب"]} minWidth="44rem">
        {jobs.map((j, i) => (
          <tr key={j.key} className={cn(j.hidden && "opacity-60")}>
            <TitleCell
              title={j.name}
              onOpen={() => setEditing(j)}
              sub={<span className="line-clamp-2">{j.summary}</span>}
              actions={
                mayEdit && (
                  <RowActions>
                    <RowLink onClick={() => setEditing(j)}>تعديل</RowLink>
                    <RowLink onClick={() => toggle(j)}>{j.hidden ? "إظهار" : "إخفاء"}</RowLink>
                  </RowActions>
                )
              }
            />
            <td className="p-3 align-top text-white/80">
              {j.level} {j.secondary && <Tag tone="gold">صفة ثانوية</Tag>}
            </td>
            <td className="p-3 align-top tabular-nums text-white/80">{j.duties.length}</td>
            <td className="p-3 align-top">{j.hidden ? <Tag tone="maroon">مخفية</Tag> : <Tag tone="green">منشورة</Tag>}</td>
            <td className="p-3 align-top">
              <Order name={j.name} first={i === 0} last={i === jobs.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} disabled={!mayEdit} />
            </td>
          </tr>
        ))}
      </ListTable>
      {(edited.jobs || edited.jobOrder) && may("admins.job-descriptions.reset") && (
        <Box title="خيارات متقدمة" open={false}>
          <Button size="sm" variant="glass" onClick={() => save({ jobs: undefined, jobOrder: undefined }, "إعادة التوصيف الوظيفي إلى الأصل", "كل الصفات")}>
            <RotateCcw className="size-4" /> إعادة التوصيف الوظيفي إلى الأصل
          </Button>
        </Box>
      )}
      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing ? `توصيف «${editing.name}»` : ""}>
        {editing && (
          <JobForm
            j={editing}
            locked={!mayEdit}
            onSave={(summary, duties) => {
              save({ jobs: { ...edited.jobs, [editing.key]: { ...edited.jobs?.[editing.key], summary, duties } } }, "تعديل توصيف صفة", editing.name);
              toast({ title: `حُفظ توصيف «${editing.name}»`, tone: "success", icon: "💾" });
              setEditing(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function JobForm({ j, onSave, locked }: { j: JobDescription; onSave: (summary: string, duties: string[]) => void; locked?: boolean }) {
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
      <Button variant="gold" disabled={!summary.trim() || locked} onClick={() => onSave(summary.trim(), duties.split("\n").map((d) => d.trim()).filter(Boolean))}>
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
  const may = useCan();
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
    <div className="space-y-4">
      <Title
        action={
          <>
            {may("admins.system-sections.POST") && <AddButton onClick={() => setOpen("new")}>إضافة قسم</AddButton>}
            <PublicLink href="/administrator/system" />
          </>
        }
      >
        النظام الإداري
      </Title>
      <Lead>أقسام النظام بترتيبها كما تُنشر للكادر. افتح القسم لتعديل نصه.</Lead>
      <ListTable head={["القسم", "الترتيب"]} minWidth="30rem">
        {system.length === 0 && <EmptyRow cols={2}>لا أقسام بعد.</EmptyRow>}
        {system.map((sec, i) => (
          <tr key={sec.id}>
            <TitleCell
              title={sec.title}
              onOpen={() => setOpen(sec)}
              sub={<span className="line-clamp-2">{sec.body}</span>}
              actions={
                <RowActions>
                  {may("admins.system-sections.PUT") && <RowLink onClick={() => setOpen(sec)}>تعديل</RowLink>}
                  {may("admins.system-sections.DELETE") && (
                    <RowLink
                      danger
                      onClick={() => {
                        save(system.filter((x) => x.id !== sec.id), "حذف قسم من النظام الإداري", sec.title);
                        toast({ title: "حُذف القسم", body: sec.title, tone: "info", icon: "🗑️" });
                      }}
                    >
                      حذف
                    </RowLink>
                  )}
                </RowActions>
              }
            />
            <td className="p-3 align-top">
              <Order name={sec.title} first={i === 0} last={i === system.length - 1} onUp={() => move(i, -1)} onDown={() => move(i, 1)} disabled={!may("admins.system-sections.PUT")} />
            </td>
          </tr>
        ))}
      </ListTable>
      {edited.system && may("admins.system-sections.reset") && (
        <Box title="خيارات متقدمة" open={false}>
          <Button
            size="sm"
            variant="glass"
            onClick={() => {
              actions.setAdminRefs({ system: undefined });
              logAdmins(user, "references", { action: "إعادة النظام الإداري إلى الأصل", target: `${DEFAULT_SYSTEM.length} أقسام`, ref: "system", important: true });
            }}
          >
            <RotateCcw className="size-4" /> إعادة النظام الإداري إلى الأصل
          </Button>
        </Box>
      )}
      <Drawer open={!!open} onClose={() => setOpen(null)} title={open === "new" ? "إضافة قسم" : open ? open.title : ""} width="max-w-3xl">
        {open && (
          <SectionForm
            sec={open === "new" ? { id: `s-${nowMs().toString(36)}`, title: "", body: "" } : open}
            locked={!may(open === "new" ? "admins.system-sections.POST" : "admins.system-sections.PUT")}
            onSave={(sec) => {
              const exists = system.some((x) => x.id === sec.id);
              save(exists ? system.map((x) => (x.id === sec.id ? sec : x)) : [...system, sec], exists ? "تعديل قسم من النظام الإداري" : "إضافة قسم إلى النظام الإداري", sec.title);
              toast({ title: "حُفظ القسم", body: sec.title, tone: "success", icon: "💾" });
              setOpen(null);
            }}
          />
        )}
      </Drawer>
    </div>
  );
}

function SectionForm({ sec, onSave, locked }: { sec: SystemSection; onSave: (s: SystemSection) => void; locked?: boolean }) {
  const [title, setTitle] = useState(sec.title);
  const [body, setBody] = useState(sec.body);
  return (
    <div className="grid gap-4 text-sm lg:grid-cols-2">
      <div className="space-y-3">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="عنوان القسم" aria-label="عنوان القسم" className={smallInputClass} />
        <textarea rows={16} value={body} onChange={(e) => setBody(e.target.value)} className={textareaClass} aria-label="نص القسم" />
        <p className="text-xs leading-6 text-white/55">سطر فارغ يفصل الفقرات، و«- » يبدأ بنداً، و«**كلمة**» بخط عريض.</p>
        <Button variant="gold" disabled={!title.trim() || !body.trim() || locked} onClick={() => onSave({ ...sec, title: title.trim(), body: body.trim() })}>
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

type FileDraft = { id?: string; title: string; second: string; desc: string; file: string };

function Files({ kind }: { kind: "decisions" | "contracts" }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useAdminRefs();
  const list = kind === "decisions" ? refs.decisions : refs.contracts;
  const isDecisions = kind === "decisions";
  const [draft, setDraft] = useState<FileDraft | null>(null);
  const may = useCan();
  const res = isDecisions ? "admins.decisions" : "admins.contract-templates";
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
  const edit = (x: (typeof list)[number]) => setDraft({ id: x.id, title: x.title, second: "year" in x ? x.year : x.party, desc: x.desc, file: x.file });
  return (
    <div className="space-y-4">
      <Title
        action={
          <>
            {may(`${res}.POST`) && <AddButton onClick={() => setDraft({ title: "", second: isDecisions ? "1448" : "", desc: "", file: "" })}>{isDecisions ? "إضافة مقرر" : "إضافة نموذج"}</AddButton>}
            <PublicLink href={isDecisions ? "/administrator/decisions" : "/administrator/contracts"} />
          </>
        }
      >
        {isDecisions ? "المقررات الإدارية" : "نماذج العقود"}
      </Title>
      <Lead>{isDecisions ? "كتب المقررات التي تعدّل بها الإدارة النظام الإداري، بموسمها وملفها، منشورة للكادر." : "نماذج العقود التي يوقّعها الحاج والإداري ورئيس التكتل، يحمّلها كلٌّ من الصفحة العامة."}</Lead>
      <ListTable head={["العنوان", isDecisions ? "الموسم" : "طرفاه", "الملف"]}>
        {list.length === 0 && <EmptyRow cols={3}>القائمة فارغة. أضف أول عنصر.</EmptyRow>}
        {list.map((x) => (
          <tr key={x.id}>
            <TitleCell
              title={x.title}
              onOpen={() => edit(x)}
              sub={x.desc}
              actions={
                <RowActions>
                  {may(`${res}.PUT`) && <RowLink onClick={() => edit(x)}>تعديل</RowLink>}
                  {may(`${res}.DELETE`) && (
                    <RowLink danger onClick={() => write(list.filter((y) => y.id !== x.id) as typeof list, isDecisions ? "حذف مقرر إداري" : "حذف نموذج عقد", x.title)}>
                      حذف
                    </RowLink>
                  )}
                </RowActions>
              }
            />
            <td className="p-3 align-top text-gold">{second(x)}</td>
            <td className="p-3 align-top text-xs text-white/60">📎 {x.file || "بلا ملف"}</td>
          </tr>
        ))}
      </ListTable>
      {(isDecisions ? refs.edited.decisions : refs.edited.contracts) && may(`${res}.reset`) && (
        <Box title="خيارات متقدمة" open={false}>
          <Button size="sm" variant="glass" onClick={() => write((isDecisions ? DEFAULT_DECISIONS : DEFAULT_CONTRACTS) as typeof list, "إعادة القائمة إلى الأصل", isDecisions ? "المقررات" : "العقود")}>
            <RotateCcw className="size-4" /> إعادة القائمة إلى الأصل
          </Button>
        </Box>
      )}
      <Drawer
        open={!!draft}
        onClose={() => setDraft(null)}
        title={draft?.id ? "تعديل" : isDecisions ? "إضافة مقرر" : "إضافة نموذج عقد"}
        width="max-w-lg"
        footer={
          draft && (
            <Button variant="gold" disabled={draft.title.trim().length < 3 || !draft.second.trim() || !draft.file || !may(`${res}.${draft.id ? "PUT" : "POST"}`)} onClick={save}>
              {draft.id ? "حفظ" : "نشر"}
            </Button>
          )
        }
      >
        {draft && (
          <div className="space-y-3 text-sm">
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">العنوان</span>
              <input value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} placeholder={isDecisions ? "المقرر 4/1448: …" : "اسم العقد"} className={smallInputClass} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">{isDecisions ? "الموسم" : "طرفاه"}</span>
              <input value={draft.second} onChange={(e) => setDraft({ ...draft, second: isDecisions ? e.target.value.replace(/\D/g, "").slice(0, 4) : e.target.value })} className={smallInputClass} dir={isDecisions ? "ltr" : undefined} />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">وصف قصير</span>
              <textarea rows={3} value={draft.desc} onChange={(e) => setDraft({ ...draft, desc: e.target.value })} className={textareaClass} />
            </label>
            <label className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/10 px-3 py-2 text-xs font-bold ring-1 ring-white/15">
              📎 {draft.file || "رفع الملف (PDF)"}
              <input type="file" accept=".pdf,.doc,.docx" className="sr-only" onChange={(e) => setDraft({ ...draft, file: e.target.files?.[0]?.name ?? draft.file })} />
            </label>
          </div>
        )}
      </Drawer>
    </div>
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
  const [filter, setFilter] = useState<"all" | OperationalPlan["status"]>("all");
  const [open, setOpen] = useState<string | null>(null);
  const [returning, setReturning] = useState<OperationalPlan | null>(null);
  const [note, setNote] = useState("");
  const may = useCan();
  const mayAccept = may("admins.operational-plans.approve");
  const mayReturn = may("admins.operational-plans.return");
  const shown = plans.filter((p) => filter === "all" || p.status === filter);
  const sheet = plans.find((p) => p.clusterId === open);
  const decide = (p: OperationalPlan, status: "accepted" | "returned", why?: string) => {
    actions.setPlan(p.clusterId, { ...p, status, decision: { by: user.name, at: nowMs(), note: why } });
    logAdmins(user, "references", { action: status === "accepted" ? "قبول خطة تشغيلية" : "إعادة خطة تشغيلية بملاحظات", target: p.clusterName, detail: why, ref: p.clusterId, important: true });
    toast({ title: status === "accepted" ? "قُبلت الخطة" : "أُعيدت الخطة", body: `${p.clusterName} — تصل ${p.headName} في «إدارة التكتل».`, tone: status === "accepted" ? "success" : "info", icon: status === "accepted" ? "✅" : "↩️" });
    setReturning(null);
    setNote("");
  };
  return (
    <div className="space-y-4">
      <Title action={<PublicLink href="/administrator/plans" />}>الخطط التشغيلية</Title>
      <Lead>يقدّمها رئيس كل تكتل معتمد من «إدارة التكتل» في حسابه. اقبلها، أو أعدها بملاحظات يصلحها ويعيد تقديمها.</Lead>
      <Filters
        label="تصفية الخطط"
        value={filter}
        onChange={setFilter}
        items={[
          { key: "all", label: "الكل", count: plans.length },
          { key: "submitted", label: PLAN_STATE.submitted.label, count: plans.filter((p) => p.status === "submitted").length },
          { key: "accepted", label: PLAN_STATE.accepted.label, count: plans.filter((p) => p.status === "accepted").length },
          { key: "returned", label: PLAN_STATE.returned.label, count: plans.filter((p) => p.status === "returned").length },
        ]}
      />
      <ListTable head={["الخطة", "قدّمها", "التاريخ", "الحالة"]}>
        {shown.length === 0 && <EmptyRow cols={4}>{plans.length ? "لا خطط بهذه الحالة." : "لم تُقدَّم خطة بعد. تصل هنا حين يقدّمها رئيس تكتل."}</EmptyRow>}
        {shown.map((p) => (
          <tr key={p.clusterId}>
            <TitleCell
              title={`${p.clusterName} — ${p.title}`}
              onOpen={() => setOpen(p.clusterId)}
              sub={`📎 ${p.file}`}
              actions={
                <RowActions>
                  <RowLink onClick={() => setOpen(p.clusterId)}>{p.status === "submitted" ? "مراجعة" : "فتح"}</RowLink>
                  {p.status === "submitted" && mayAccept && <RowLink onClick={() => decide(p, "accepted")}>قبول</RowLink>}
                  {p.status === "submitted" && mayReturn && (
                    <RowLink danger onClick={() => setReturning(p)}>
                      إعادة بملاحظات
                    </RowLink>
                  )}
                </RowActions>
              }
            />
            <td className="p-3 align-top text-white/80">{p.headName}</td>
            <td className="whitespace-nowrap p-3 align-top text-xs text-white/60">{fmtDateTime(p.at)}</td>
            <td className="p-3 align-top">
              <Tag tone={PLAN_STATE[p.status].tone}>{PLAN_STATE[p.status].label}</Tag>
            </td>
          </tr>
        ))}
      </ListTable>

      <Drawer
        open={!!sheet}
        onClose={() => setOpen(null)}
        title={sheet ? `${sheet.clusterName} — ${sheet.title}` : ""}
        footer={
          sheet?.status === "submitted" && (mayAccept || mayReturn) && (
            <div className="flex flex-wrap gap-2">
              <Button variant="gold" disabled={!mayAccept} onClick={() => decide(sheet, "accepted")}>
                <BadgeCheck className="size-4" /> قبول الخطة
              </Button>
              <Button variant="glass" disabled={!mayReturn} onClick={() => setReturning(sheet)}>
                <X className="size-4" /> إعادة بملاحظات
              </Button>
            </div>
          )
        }
      >
        {sheet && (
          <div className="space-y-4 text-sm">
            <Tag tone={PLAN_STATE[sheet.status].tone}>{PLAN_STATE[sheet.status].label}</Tag>
            <InfoGrid
              rows={[
                ["قدّمها", `${sheet.headName} — ${fmtDateTime(sheet.at)}`],
                ["الملف", `📎 ${sheet.file}`],
                ["القرار", sheet.decision && sheet.status !== "submitted" ? `${sheet.status === "accepted" ? "قبلها" : "أعادها"} ${sheet.decision.by} — ${fmtDateTime(sheet.decision.at)}` : ""],
              ]}
            />
            <p className="whitespace-pre-line leading-7 text-white/85">{sheet.summary}</p>
            {sheet.decision?.note && <p className="rounded-2xl bg-maroon/25 p-3 text-white ring-1 ring-maroon/50">ملاحظات الإعادة: {sheet.decision.note}</p>}
            <RecordHistory system="admins" refId={sheet.clusterId} />
          </div>
        )}
      </Drawer>

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
    </div>
  );
}
