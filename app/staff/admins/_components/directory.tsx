"use client";

import { AnimatePresence, motion } from "motion/react";
import { CalendarPlus, Download, Network, NotebookPen, RotateCcw, UsersRound } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { downloadCsv } from "@/lib/csv";
import { groupName } from "@/lib/groups";
import { dayOf } from "@/lib/operations";
import { actions, useStore } from "@/lib/store";
import { cn, nowMs } from "@/lib/utils";
import { nameOf, placesOf } from "@/app/administrator/_lib/cadre";
import { useFormingSeason, type ClusterRequest } from "@/app/administrator/_lib/formation";
import { categoryOf, categoryOfId, useCadre, useStructure } from "@/app/administrator/_lib/structure";
import { Drawer, Empty, Panel, Tabs, fmtDate, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { Chip, FilterSelect, SearchBox } from "../../_components/ops-ui";
import { SystemRecords } from "../../_components/system";
import { logAdmins, useAdminsDesk } from "../desk";

/**
 * «التكتلات والمجموعات» — what the approved formations produced, as the administration's platform computes it:
 * every cluster and every group with its season, its head's category, its numbers and the date it was formed,
 * the archived ones too. Nothing here is edited but the administration's own note on each; who is in a cluster
 * changes only by an exceptional edit on its request. Each list exports to Excel, and the season ends here:
 * «بدء موسم جديد» sets the season's approved formations in the archive and stamps new ones with the next.
 */
export function DirectoryTab() {
  const desk = useAdminsDesk();
  const [tab, setTab] = useState<"clusters" | "groups">("clusters");
  const formed = useMemo(() => desk.requests.filter((r) => r.status === "approved"), [desk.requests]);
  const groups = useMemo(() => formed.flatMap((r) => r.groups.map((g) => ({ r, g }))), [formed]);
  return (
    <div className="space-y-6">
      <Tabs
        id="admin-directory"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "clusters", label: "التكتلات", count: formed.length },
          { value: "groups", label: "المجموعات", count: groups.length },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }}>
          {tab === "clusters" ? <Clusters formed={formed} /> : <Groups rows={groups} />}
        </motion.div>
      </AnimatePresence>
      <Season formed={formed} />
      <SystemRecords system="admins" area="directory" title="سجل التكتلات والمجموعات" />
    </div>
  );
}

/** The administration's free note on a cluster or a group: the only thing written here */
function Note({ k, target }: { k: string; target: string }) {
  const user = useStaffUser()!;
  const note = useStore((s) => s.formation.notes[k]) ?? "";
  const [open, setOpen] = useState(false);
  const [text, setText] = useState(note);
  const save = () => {
    actions.setFormation((f) => {
      const notes = { ...f.notes };
      if (text.trim()) notes[k] = text.trim();
      else delete notes[k];
      return { ...f, notes };
    });
    logAdmins(user, "directory", { action: "ملاحظة على تشكيل", target, before: note || "—", after: text.trim() || "—", ref: k });
    setOpen(false);
  };
  if (!open)
    return (
      <button type="button" onClick={(e) => { e.stopPropagation(); setText(note); setOpen(true); }} className="flex max-w-56 items-start gap-1 text-right text-xs text-white/70 hover:text-gold">
        <NotebookPen className="mt-0.5 size-3.5 shrink-0 text-gold" /> {note || <span className="text-white/35">أضف ملاحظة</span>}
      </button>
    );
  return (
    <div className="flex min-w-56 gap-1" onClick={(e) => e.stopPropagation()}>
      <input value={text} onChange={(e) => setText(e.target.value)} autoFocus className={cn(smallInputClass, "h-9 text-xs")} aria-label={`ملاحظة على ${target}`} onKeyDown={(e) => e.key === "Enter" && save()} />
      <Button size="sm" variant="gold" onClick={save}>
        حفظ
      </Button>
    </div>
  );
}

function useSeasons(formed: ClusterRequest[]) {
  return [...new Set(formed.map((r) => r.season))].sort((a, b) => b - a);
}

function Clusters({ formed }: { formed: ClusterRequest[] }) {
  const s = useStructure();
  const cadre = useCadre();
  const seasons = useSeasons(formed);
  const [q, setQ] = useState("");
  const [season, setSeason] = useState("");
  const [branch, setBranch] = useState("");
  const [shelf, setShelf] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const cat = (id: string) => categoryOfId(s, categoryOf(id, cadre))?.name ?? "—";
  const list = formed
    .filter((r) => !season || r.season === Number(season))
    .filter((r) => !branch || r.branches.includes(branch))
    .filter((r) => !shelf || (shelf === "archived" ? !!r.archived : !r.archived))
    .filter((r) => !q.trim() || [r.cluster.name, r.headName].some((t) => t.includes(q.trim())));
  const sheet = formed.find((r) => r.cluster.id === open);
  const notes = useStore((x) => x.formation.notes);
  const exportAll = () =>
    downloadCsv(`التكتلات-${dayOf(new Date())}.csv`, [
      ["رئيس التكتل", "اسم التكتل", "الموسم", "فئة الرئيس", "عدد المجموعات", "عدد الفئات", "عدد الحجاج", "تاريخ التشكيل", "الحالة", "ملاحظات"],
      ...list.map((r) => [r.headName, r.cluster.name, r.season, cat(r.headId), r.groups.length, r.weight, r.pilgrims, r.cluster.decision ? fmtDate(r.cluster.decision.at) : "", r.archived ? "مؤرشف" : "نشط", notes[`c:${r.cluster.id}`] ?? ""]),
    ]);
  return (
    <Panel
      icon={<Network />}
      title="التكتلات"
      action={
        <Button size="sm" variant="ghost" className="text-white" onClick={exportAll}>
          <Download className="size-4" /> Excel
        </Button>
      }
    >
      <p className="mb-3 text-sm leading-7 text-white/70">من التشكيلات المعتمدة، والمؤرشفة منها بموسمها. لا يُعدَّل هنا إلا ملاحظة الإدارة؛ أعضاء التكتل يتغيرون بتعديل استثنائي في «طلبات التكتلات».</p>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="اسم التكتل أو رئيسه" label="بحث في التكتلات" />
        <FilterSelect label="الموسم" all="كل المواسم" value={season} onChange={setSeason} options={seasons.map((y) => ({ value: String(y), label: `موسم ${y}` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
        <FilterSelect label="الحالة" all="النشطة والمؤرشفة" value={shelf} onChange={setShelf} options={[{ value: "live", label: "النشطة" }, { value: "archived", label: "المؤرشفة" }]} />
      </div>
      {list.length === 0 ? (
        <Empty icon={<Network />} title="لا تكتلات" text="تظهر هنا التكتلات حين تُعتمد طلباتها." />
      ) : (
        <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-white/10">
          <table className="w-full min-w-[980px] text-right text-sm">
            <thead className="bg-white/[.07] text-xs text-gold">
              <tr>
                {["رئيس التكتل", "اسم التكتل", "الموسم", "فئة الرئيس", "عدد المجموعات", "عدد الفئات", "عدد الحجاج", "تاريخ التشكيل", "ملاحظات", "الأعضاء"].map((h) => (
                  <th key={h} className="whitespace-nowrap px-3 py-2.5 font-bold">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r.cluster.id} className="border-t border-white/5 align-top">
                  <td className="px-3 py-2.5 font-bold text-white">{r.headName}</td>
                  <td className="px-3 py-2.5 text-white">
                    {r.cluster.name} {r.archived && <Chip>مؤرشف</Chip>}
                  </td>
                  <td className="px-3 py-2.5 text-white/80">{r.season}</td>
                  <td className="px-3 py-2.5 text-white/80">{cat(r.headId)}</td>
                  <td className="px-3 py-2.5 tabular-nums text-white/80">{r.groups.length}</td>
                  <td className="px-3 py-2.5 tabular-nums text-white/80">{r.weight}</td>
                  <td className="px-3 py-2.5 tabular-nums text-white/80">{r.pilgrims}</td>
                  <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{r.cluster.decision ? fmtDate(r.cluster.decision.at) : "—"}</td>
                  <td className="px-3 py-2.5">
                    <Note k={`c:${r.cluster.id}`} target={r.cluster.name} />
                  </td>
                  <td className="px-3 py-2.5">
                    <Button size="sm" variant="glass" onClick={() => setOpen(r.cluster.id)}>
                      <UsersRound className="size-4" /> {r.cadre}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? `أعضاء ${sheet.cluster.name}` : ""}>
        {sheet && <Members r={sheet} />}
      </Drawer>
    </Panel>
  );
}

/** Everyone in a cluster with his post, read-only: an exceptional edit on its request is the only way to change it */
function Members({ r }: { r: ClusterRequest }) {
  const places = [...placesOf(r, r.cluster)];
  return (
    <div className="space-y-3 text-sm">
      <p className="rounded-2xl bg-white/5 p-3 text-xs leading-6 text-white/70 ring-1 ring-white/10">
        {places.length} من الكادر في {r.groups.length} مجموعات — موسم {r.season}. لتغيير أحد: «طلبات التكتلات» ← {r.cluster.name} ← تعديل استثنائي بسببه، فيُكتب في أحداث ملفه.
      </p>
      <ul className="space-y-1.5">
        {places.map(([id, p]) => (
          <li key={id} className="flex flex-wrap items-center gap-2 rounded-xl bg-white/[.06] px-3 py-2 ring-1 ring-white/10">
            <span className="min-w-0 flex-1 font-bold text-white">{nameOf(id, r)}</span>
            <span className="text-xs text-white/70">
              {p.posts.join("، ")}
              {p.group !== undefined ? ` — ${groupName(p.group)}` : ""}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Groups({ rows }: { rows: { r: ClusterRequest; g: ClusterRequest["groups"][number] }[] }) {
  const s = useStructure();
  const notes = useStore((x) => x.formation.notes);
  const seasons = [...new Set(rows.map((x) => x.r.season))].sort((a, b) => b - a);
  const [q, setQ] = useState("");
  const [season, setSeason] = useState("");
  const [branch, setBranch] = useState("");
  const [category, setCategory] = useState("");
  const list = rows
    .filter((x) => !season || x.r.season === Number(season))
    .filter((x) => !branch || x.g.branch === branch)
    .filter((x) => !category || x.g.category === category)
    .filter((x) => !q.trim() || [groupName(x.g.number), x.g.head, x.r.cluster.name].some((t) => t.includes(q.trim())));
  const exportAll = () =>
    downloadCsv(`المجموعات-${dayOf(new Date())}.csv`, [
      ["رئيس المجموعة", "اسم المجموعة", "التكتل", "الموسم", "فئة الرئيس", "عدد الحجاج", "الفرع", "تاريخ التشكيل", "ملاحظات"],
      ...list.map(({ r, g }) => [g.head, groupName(g.number), r.cluster.name, r.season, g.categoryName, g.pilgrims, g.branch, r.cluster.decision ? fmtDate(r.cluster.decision.at) : "", notes[`g:${g.number}`] ?? ""]),
    ]);
  return (
    <Panel
      icon={<UsersRound />}
      title="المجموعات"
      action={
        <Button size="sm" variant="ghost" className="text-white" onClick={exportAll}>
          <Download className="size-4" /> Excel
        </Button>
      }
    >
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="المجموعة، رئيسها، تكتلها" label="بحث في المجموعات" />
        <FilterSelect label="الموسم" all="كل المواسم" value={season} onChange={setSeason} options={seasons.map((y) => ({ value: String(y), label: `موسم ${y}` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
        <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={s.categories.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-white/10">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="bg-white/[.07] text-xs text-gold">
            <tr>
              {["رئيس المجموعة", "اسم المجموعة", "التكتل", "الموسم", "فئة الرئيس", "عدد الحجاج", "الفرع", "تاريخ التشكيل", "ملاحظات"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {list.map(({ r, g }) => (
              <tr key={`${r.cluster.id}-${g.number}`} className="border-t border-white/5 align-top">
                <td className="px-3 py-2.5 font-bold text-white">{g.head}</td>
                <td className="px-3 py-2.5 text-white">{groupName(g.number)}</td>
                <td className="px-3 py-2.5 text-white/80">
                  {r.cluster.name} {r.archived && <Chip>مؤرشف</Chip>}
                </td>
                <td className="px-3 py-2.5 text-white/80">{r.season}</td>
                <td className="px-3 py-2.5 text-white/80">{g.categoryName}</td>
                <td className="px-3 py-2.5 tabular-nums text-white/80">{g.pilgrims}</td>
                <td className="px-3 py-2.5 text-white/80">{g.branch}</td>
                <td className="whitespace-nowrap px-3 py-2.5 text-white/70">{r.cluster.decision ? fmtDate(r.cluster.decision.at) : "—"}</td>
                <td className="px-3 py-2.5">
                  <Note k={`g:${g.number}`} target={groupName(g.number)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}

// ───────────────────────── The season ─────────────────────────

/**
 * The season the platform stamps on every new formation, and its end: «بدء موسم جديد» sets every approved
 * formation of the season in the archive (they stay here, by their season) and stamps new requests with the
 * next. The requests not approved stay as they are. The demo can take it back.
 */
function Season({ formed }: { formed: ClusterRequest[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useFormingSeason();
  const started = useStore((s) => s.formation.seasonStarted);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const toArchive = formed.filter((r) => !r.archived && r.season === season);
  const begin = () => {
    const at = nowMs();
    const ids = toArchive.map((r) => r.cluster.id);
    actions.setFormation((f) => ({
      ...f,
      archived: { ...f.archived, ...Object.fromEntries(ids.map((id) => [id, { season, at, by: user.name }])) },
      season: season + 1,
      seasonStarted: { from: season, to: season + 1, at, by: user.name, archived: ids },
    }));
    logAdmins(user, "directory", { action: "بدء موسم جديد", target: `موسم ${season + 1}`, before: `موسم ${season}`, after: `موسم ${season + 1}`, detail: `أُرشف ${ids.length} تشكيلاً معتمداً — ${reason.trim()}`, important: true });
    toast({ title: `بدأ موسم ${season + 1}`, body: `أُرشفت تشكيلات موسم ${season} المعتمدة (${ids.length})، وتُختم الطلبات الجديدة بموسم ${season + 1}.`, tone: "success", icon: "🗓️" });
    setOpen(false);
    setTyped("");
    setReason("");
  };
  const undo = () => {
    if (!started) return;
    actions.setFormation((f) => ({ ...f, archived: Object.fromEntries(Object.entries(f.archived).filter(([id]) => !started.archived.includes(id))), season: started.from === 1448 ? undefined : started.from, seasonStarted: undefined }));
    logAdmins(user, "directory", { action: "التراجع عن بدء الموسم", target: `موسم ${started.to}`, after: `موسم ${started.from}`, important: true });
    toast({ title: `عاد موسم ${started.from}`, body: "استُعيدت تشكيلاته من الأرشيف.", tone: "info", icon: "↩️" });
  };
  return (
    <Panel icon={<CalendarPlus />} title={`الموسم الحالي: ${season}`}>
      <p className="text-sm leading-7 text-white/75">
        يُختم كل تشكيل جديد بموسمه الهجري. في ختام الموسم، «بدء موسم جديد» يؤرشف تشكيلات الموسم المعتمدة ({toArchive.length} الآن) فتبقى هنا بموسمها، وتُختم الطلبات بعده بموسم {season + 1}. ما لم يُعتمد يبقى كما هو. لا يُغيّر شيئاً في ملف أي فرد.
      </p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button size="sm" variant="gold" onClick={() => setOpen(true)}>
          <CalendarPlus className="size-4" /> بدء موسم جديد
        </Button>
        {started && (
          <Button size="sm" variant="glass" onClick={undo}>
            <RotateCcw className="size-4" /> التراجع عن بدء موسم {started.to} (تجربة)
          </Button>
        )}
      </div>
      {started && (
        <p className="mt-3 text-xs text-white/55">
          بدأه {started.by} — {fmtDate(started.at)} — أُرشف {started.archived.length} تشكيلاً من موسم {started.from}.
        </p>
      )}
      <Modal open={open} onClose={() => setOpen(false)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="text-xs font-bold text-gold">بدء موسم جديد</p>
        <h3 className="mt-1 font-display text-xl font-bold">
          من موسم {season} إلى موسم {season + 1}
        </h3>
        <p className="mt-1 text-sm leading-7 text-white/70">تُؤرشف {toArchive.length} تشكيلات معتمدة من موسم {season}، وتُختم الطلبات الجديدة بموسم {season + 1}. للتأكيد اكتب رقم الموسم الجديد.</p>
        <input value={typed} onChange={(e) => setTyped(e.target.value.replace(/\D/g, ""))} placeholder={String(season + 1)} className={cn(smallInputClass, "mt-4 text-center font-display text-lg")} dir="ltr" aria-label="رقم الموسم الجديد" />
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={cn(textareaClass, "mt-3")} placeholder="السبب (إلزامي) — مثال: انتهاء موسم 1448 وتصنيفه" aria-label="السبب" />
        <div className="mt-4 flex gap-2">
          <Button variant="gold" disabled={typed !== String(season + 1) || reason.trim().length < 3} onClick={begin}>
            بدء موسم {season + 1}
          </Button>
          <Button variant="glass" onClick={() => setOpen(false)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </Panel>
  );
}
