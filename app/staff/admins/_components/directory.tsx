"use client";

import { CalendarPlus, Download, RotateCcw } from "lucide-react";
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
import { Drawer, fmtDate, smallInputClass, textareaClass, useStaffUser } from "../../_components/kit";
import { FilterSelect, SearchBox } from "../../_components/ops-ui";
import { Box, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, TitleCell, Tool, Views, useView } from "./ui";
import { logAdmins, useAdminsDesk } from "../desk";

/**
 * «التكتلات والمجموعات» — what the approved formations produced, as two lists (`?v=`): every cluster and every
 * group with its season, its head's category, its numbers and the date it was formed, the archived ones too.
 * Nothing here is edited but the administration's own note on each; who is in a cluster changes only by an
 * exceptional edit on its request. Each list exports to Excel. The season's end («بدء موسم جديد») waits closed.
 */
export function DirectoryTab() {
  const desk = useAdminsDesk();
  const view = useView("v", ["clusters", "groups"] as const);
  const formed = useMemo(() => desk.requests.filter((r) => r.status === "approved"), [desk.requests]);
  const groups = useMemo(() => formed.flatMap((r) => r.groups.map((g) => ({ r, g }))), [formed]);
  return (
    <div className="space-y-5">
      <Views
        param="v"
        value={view}
        label="التكتلات والمجموعات"
        items={[
          { key: "clusters", label: "التكتلات", count: formed.length },
          { key: "groups", label: "المجموعات", count: groups.length },
        ]}
      />
      {view === "clusters" ? <Clusters formed={formed} /> : <Groups rows={groups} />}
      <div className="grid gap-4 lg:grid-cols-2">
        <Season formed={formed} />
        <Help>
          <p>من التشكيلات المعتمدة، والمؤرشفة منها بموسمها. لا يُعدَّل هنا إلا ملاحظة الإدارة؛ أعضاء التكتل يتغيرون بتعديل استثنائي في «طلبات التكتلات».</p>
          <p>يُختم كل تشكيل جديد بموسمه الهجري. وفي ختام الموسم «بدء موسم جديد» يؤرشف تشكيلات الموسم المعتمدة.</p>
        </Help>
      </div>
      <RecordsBox system="admins" area="directory" title="سجل التكتلات والمجموعات" />
    </div>
  );
}

/** The administration's free note on a cluster or a group: the only thing written here, in a small side sheet */
function NoteSheet({ k, target, onClose }: { k: string; target: string; onClose: () => void }) {
  const user = useStaffUser()!;
  const note = useStore((s) => s.formation.notes[k]) ?? "";
  const [text, setText] = useState(note);
  const save = () => {
    actions.setFormation((f) => {
      const notes = { ...f.notes };
      if (text.trim()) notes[k] = text.trim();
      else delete notes[k];
      return { ...f, notes };
    });
    logAdmins(user, "directory", { action: "ملاحظة على تشكيل", target, before: note || "—", after: text.trim() || "—", ref: k });
    onClose();
  };
  return (
    <div className="space-y-3 text-sm">
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">ملاحظة الإدارة على {target}</span>
        <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={textareaClass} />
      </label>
      <Button variant="gold" disabled={text.trim() === note} onClick={save}>
        حفظ الملاحظة
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
  const [shelf, setShelf] = useState<"all" | "live" | "archived">("all");
  const [open, setOpen] = useState<string | null>(null);
  const [noting, setNoting] = useState<ClusterRequest | null>(null);
  const cat = (id: string) => categoryOfId(s, categoryOf(id, cadre))?.name ?? "—";
  const base = formed
    .filter((r) => !season || r.season === Number(season))
    .filter((r) => !branch || r.branches.includes(branch))
    .filter((r) => !q.trim() || [r.cluster.name, r.headName].some((t) => t.includes(q.trim())));
  const list = base.filter((r) => shelf === "all" || (shelf === "archived" ? !!r.archived : !r.archived));
  const sheet = formed.find((r) => r.cluster.id === open);
  const notes = useStore((x) => x.formation.notes);
  const exportAll = () =>
    downloadCsv(`التكتلات-${dayOf(new Date())}.csv`, [
      ["رئيس التكتل", "اسم التكتل", "الموسم", "فئة الرئيس", "عدد المجموعات", "عدد الفئات", "عدد الحجاج", "تاريخ التشكيل", "الحالة", "ملاحظات"],
      ...list.map((r) => [r.headName, r.cluster.name, r.season, cat(r.headId), r.groups.length, r.weight, r.pilgrims, r.cluster.decision ? fmtDate(r.cluster.decision.at) : "", r.archived ? "مؤرشف" : "نشط", notes[`c:${r.cluster.id}`] ?? ""]),
    ]);
  return (
    <div className="space-y-4">
      <Title>التكتلات</Title>
      <Lead>كل تكتل معتمد بموسمه وأرقامه. افتحه لترى أعضاءه بمواقعهم.</Lead>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters
          label="النشطة والمؤرشفة"
          value={shelf}
          onChange={setShelf}
          items={[
            { key: "all", label: "الكل", count: base.length },
            { key: "live", label: "النشطة", count: base.filter((r) => !r.archived).length },
            { key: "archived", label: "المؤرشفة", count: base.filter((r) => r.archived).length },
          ]}
        />
        <Tool onClick={exportAll}>
          <Download /> Excel
        </Tool>
      </div>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="اسم التكتل أو رئيسه" label="بحث في التكتلات" />
        <FilterSelect label="الموسم" all="كل المواسم" value={season} onChange={setSeason} options={seasons.map((y) => ({ value: String(y), label: `موسم ${y}` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
      </div>
      <ListTable head={["التكتل", "الموسم", "فئة الرئيس", "المجموعات", "الفئات", "الحجاج", "تاريخ التشكيل", "ملاحظة الإدارة"]} minWidth="64rem">
        {list.length === 0 && <EmptyRow cols={8}>لا تكتلات هنا. تظهر حين تُعتمد طلباتها.</EmptyRow>}
        {list.map((r) => (
          <tr key={r.cluster.id}>
            <TitleCell
              title={r.cluster.name}
              onOpen={() => setOpen(r.cluster.id)}
              sub={
                <>
                  رئيسه {r.headName} {r.archived && <Tag>مؤرشف</Tag>}
                </>
              }
              actions={
                <RowActions>
                  <RowLink onClick={() => setOpen(r.cluster.id)}>الأعضاء ({r.cadre})</RowLink>
                  <RowLink onClick={() => setNoting(r)}>ملاحظة</RowLink>
                </RowActions>
              }
            />
            <td className="p-3 align-top text-white/80">{r.season}</td>
            <td className="p-3 align-top text-white/80">{cat(r.headId)}</td>
            <td className="p-3 align-top tabular-nums text-white/80">{r.groups.length}</td>
            <td className="p-3 align-top tabular-nums text-white/80">{r.weight}</td>
            <td className="p-3 align-top tabular-nums text-white/80">{r.pilgrims}</td>
            <td className="whitespace-nowrap p-3 align-top text-white/70">{r.cluster.decision ? fmtDate(r.cluster.decision.at) : "—"}</td>
            <td className="max-w-56 p-3 align-top text-xs text-white/70">{notes[`c:${r.cluster.id}`] ?? <span className="text-white/30">—</span>}</td>
          </tr>
        ))}
      </ListTable>
      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet ? `أعضاء ${sheet.cluster.name}` : ""}>
        {sheet && <Members r={sheet} />}
      </Drawer>
      <Drawer open={!!noting} onClose={() => setNoting(null)} title={noting ? `ملاحظة على ${noting.cluster.name}` : ""} width="max-w-md">
        {noting && <NoteSheet key={noting.cluster.id} k={`c:${noting.cluster.id}`} target={noting.cluster.name} onClose={() => setNoting(null)} />}
      </Drawer>
    </div>
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
      <ListTable head={["الاسم", "موقعه"]} minWidth="20rem">
        {places.map(([id, p]) => (
          <tr key={id}>
            <td className="p-3 font-bold text-white">{nameOf(id, r)}</td>
            <td className="p-3 text-xs text-white/70">
              {p.posts.join("، ")}
              {p.group !== undefined ? ` — ${groupName(p.group)}` : ""}
            </td>
          </tr>
        ))}
      </ListTable>
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
  const [noting, setNoting] = useState<number | null>(null);
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
    <div className="space-y-4">
      <Title action={<Tool onClick={exportAll}><Download /> Excel</Tool>}>المجموعات</Title>
      <Lead>كل مجموعة في تكتل معتمد، بموسمها وفئة رئيسها وحجاجها.</Lead>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="المجموعة، رئيسها، تكتلها" label="بحث في المجموعات" />
        <FilterSelect label="الموسم" all="كل المواسم" value={season} onChange={setSeason} options={seasons.map((y) => ({ value: String(y), label: `موسم ${y}` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
        <FilterSelect label="الفئة" all="كل الفئات" value={category} onChange={setCategory} options={s.categories.map((c) => ({ value: c.id, label: c.name }))} />
      </div>
      <ListTable head={["المجموعة", "التكتل", "الموسم", "فئة الرئيس", "الحجاج", "الفرع", "تاريخ التشكيل", "ملاحظة الإدارة"]} minWidth="60rem">
        {list.length === 0 && <EmptyRow cols={8}>لا مجموعات بهذا البحث.</EmptyRow>}
        {list.map(({ r, g }) => (
          <tr key={`${r.cluster.id}-${g.number}`}>
            <TitleCell
              title={groupName(g.number)}
              sub={`رئيسها ${g.head}`}
              actions={
                <RowActions>
                  <RowLink onClick={() => setNoting(g.number)}>ملاحظة</RowLink>
                </RowActions>
              }
            />
            <td className="p-3 align-top text-white/80">
              {r.cluster.name} {r.archived && <Tag>مؤرشف</Tag>}
            </td>
            <td className="p-3 align-top text-white/80">{r.season}</td>
            <td className="p-3 align-top text-white/80">{g.categoryName}</td>
            <td className="p-3 align-top tabular-nums text-white/80">{g.pilgrims}</td>
            <td className="p-3 align-top text-white/80">{g.branch}</td>
            <td className="whitespace-nowrap p-3 align-top text-white/70">{r.cluster.decision ? fmtDate(r.cluster.decision.at) : "—"}</td>
            <td className="max-w-56 p-3 align-top text-xs text-white/70">{notes[`g:${g.number}`] ?? <span className="text-white/30">—</span>}</td>
          </tr>
        ))}
      </ListTable>
      <Drawer open={noting !== null} onClose={() => setNoting(null)} title={noting !== null ? `ملاحظة على ${groupName(noting)}` : ""} width="max-w-md">
        {noting !== null && <NoteSheet key={noting} k={`g:${noting}`} target={groupName(noting)} onClose={() => setNoting(null)} />}
      </Drawer>
    </div>
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
    <Box title={`بدء موسم جديد (الموسم الحالي: ${season})`} open={false}>
      <p className="leading-7 text-white/75">
        يُختم كل تشكيل جديد بموسمه الهجري. في ختام الموسم، «بدء موسم جديد» يؤرشف تشكيلات الموسم المعتمدة ({toArchive.length} الآن) فتبقى هنا بموسمها، وتُختم الطلبات بعده بموسم {season + 1}. ما لم يُعتمد يبقى كما هو. لا يُغيّر شيئاً في ملف أي فرد.
      </p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="glass" onClick={() => setOpen(true)}>
          <CalendarPlus className="size-4" /> بدء موسم جديد
        </Button>
        {started && (
          <Button size="sm" variant="glass" onClick={undo}>
            <RotateCcw className="size-4" /> التراجع عن بدء موسم {started.to} (تجربة)
          </Button>
        )}
      </div>
      {started && (
        <p className="text-xs text-white/55">
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
    </Box>
  );
}
