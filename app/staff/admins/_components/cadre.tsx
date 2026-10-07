"use client";

import { AnimatePresence, motion } from "motion/react";
import { Ban, Columns3, Download, KeyRound, Plus, RotateCcw, Send, Trash2, UserCog, UserPlus, UsersRound } from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { downloadCsv } from "@/lib/csv";
import { groupName } from "@/lib/groups";
import { dayOf } from "@/lib/operations";
import { getPerson, isValidNationalId } from "@/lib/registry";
import { actions, getState, useStore, type CadreEventType } from "@/lib/store";
import { cn, maskNationalId, nowMs } from "@/lib/utils";
import { DEMO_ADMINS } from "@/app/administrator/_lib/admin";
import { EVENT_TYPES, contactOf, eventLabel, logCadre, newPin, presenceOf, useCadreEvents, useCadrePlaces, type Place } from "@/app/administrator/_lib/cadre";
import { useFormingSeason } from "@/app/administrator/_lib/formation";
import { HEADS_POOL, ROSTER } from "@/app/administrator/_lib/people";
import { ageOfId, branchOf, branchesOf, categoryOf, primaryOf, roleKeyByName, roleName, roleOf, seasonalOf, seasonalText, useCadre, useStructure, type SeasonalRole } from "@/app/administrator/_lib/structure";
import { useAdminRows } from "../../_components/data";
import { Drawer, Empty, Panel, Tabs, fmtDateTime, smallInputClass, textareaClass, useNow, useStaffUser } from "../../_components/kit";
import { Chip, FilterSelect, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory, SystemRecords } from "../../_components/system";
import { logAdmins, type Area } from "../desk";

const selectInput = cn(smallInputClass, "[&>option]:text-ink");

/**
 * «الكادر الإداري» — the administration's cadre across the seasons, as its own platform keeps it: one table of
 * everyone, each with his base role and this season's, his post in his cluster, his group and category, his
 * branches, how he is reached and signs in, and whether he is online. The holder adds a person, stops or deletes
 * an account, and changes anyone's role, category or branches with its reason — each change an event in his
 * file. «أحداث الكادر» lists those events for everyone; Telegram messages reach whoever linked the bot.
 */
export function CadreTab() {
  const [tab, setTab] = useState<"roster" | "events" | "telegram">("roster");
  const events = useCadreEvents();
  const sent = useStore((s) => s.cadre.telegram);
  return (
    <div className="space-y-6">
      <Tabs
        id="admin-cadre"
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "roster", label: "الكادر" },
          { value: "events", label: "أحداث الكادر", count: events.length },
          { value: "telegram", label: "رسائل تيليجرام", count: sent.length },
        ]}
      />
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} transition={{ duration: 0.25 }} className="space-y-6">
          {tab === "roster" && <Roster />}
          {tab === "events" && <Events />}
          {tab === "telegram" && <TelegramLog />}
        </motion.div>
      </AnimatePresence>
      <SystemRecords system="admins" area="cadre" title="سجل الكادر الإداري" />
    </div>
  );
}

// ───────────────────────── Who the cadre is ─────────────────────────

export type Person = { id: string; name: string; applied?: string };

/** Everyone the cadre knows: the administrators on this device and in the staff's records, the demo accounts, the qualified roster, the groups' heads, and whoever the administration added */
export function usePeople(): Person[] {
  const rows = useAdminRows();
  const s = useStructure();
  const added = useStore((x) => x.cadre.added);
  return useMemo(() => {
    const key = (pos?: string) => (pos ? (roleKeyByName(s, pos) ?? pos) : undefined);
    const map = new Map<string, Person>();
    for (const r of rows) map.set(r.id, { id: r.id, name: r.name, applied: key(r.profile.positions[0] ?? r.position) });
    // The demo accounts not signed in on this device yet, with the role of their story
    for (const d of DEMO_ADMINS) if (!map.has(d.id)) map.set(d.id, { id: d.id, name: d.title.split(" — ")[0], applied: d.position });
    for (const c of ROSTER) if (!map.has(c.id)) map.set(c.id, { id: c.id, name: c.name, applied: c.roleKey });
    for (const h of HEADS_POOL) if (!map.has(h.id)) map.set(h.id, { id: h.id, name: h.name, applied: "group-head" });
    for (const a of Object.values(added)) if (!map.has(a.id)) map.set(a.id, { id: a.id, name: a.name, applied: a.role });
    return [...map.values()];
  }, [rows, s, added]);
}

export type CadreRow = {
  id: string;
  name: string;
  applied?: string;
  gender: "M" | "F";
  primary: string;
  seasonal?: SeasonalRole;
  place?: Place;
  category?: string;
  branch: string;
  extra: string[];
  phone?: string;
  birth?: string;
  age?: number;
  barcode?: string;
  pin?: string;
  chatId?: string;
  status?: { state: "disabled" | "deleted"; reason: string; by: string; at: number };
  added: boolean;
};

export function useCadreRows(): CadreRow[] {
  const people = usePeople();
  const cadre = useCadre();
  const places = useCadrePlaces();
  const s = useStructure();
  return useMemo(
    () =>
      people.map((p) => {
        const primary = primaryOf(p.id, p.applied, cadre);
        const contact = contactOf(p.id, cadre);
        const added = cadre.added[p.id];
        const roleGender = roleOf(s, primary)?.gender ?? roleOf(s, p.applied)?.gender;
        return {
          id: p.id,
          name: p.name,
          applied: p.applied,
          gender: added?.gender ?? roleGender ?? (getPerson(p.id)?.gender === "F" ? "F" : "M"),
          primary,
          seasonal: seasonalOf(p.id, cadre),
          place: places.get(p.id),
          category: categoryOf(p.id, cadre),
          branch: branchOf(p.id, cadre),
          extra: branchesOf(p.id, cadre).slice(1),
          phone: contact.phone,
          birth: contact.birth,
          age: ageOfId(p.id),
          barcode: contact.barcode,
          pin: contact.pin,
          chatId: contact.chatId,
          status: cadre.status[p.id],
          added: !!added,
        };
      }),
    [people, cadre, places, s],
  );
}

// ───────────────────────── The roster ─────────────────────────

type ColKey = "primary" | "post" | "cluster" | "group" | "category" | "branch" | "extra" | "phone" | "birth" | "age" | "barcode" | "pin" | "telegram" | "presence";

const COLUMNS: { key: ColKey; label: string; on: boolean }[] = [
  { key: "primary", label: "الصفة الأساسية", on: true },
  { key: "post", label: "الصفة في التكتل", on: true },
  { key: "cluster", label: "التكتل", on: true },
  { key: "group", label: "المجموعة", on: true },
  { key: "category", label: "الفئة", on: true },
  { key: "branch", label: "الفرع", on: true },
  { key: "extra", label: "الفروع الإضافية", on: false },
  { key: "phone", label: "الهاتف", on: true },
  { key: "birth", label: "تاريخ الميلاد", on: false },
  { key: "age", label: "العمر", on: false },
  { key: "barcode", label: "رقم الباركود", on: false },
  { key: "pin", label: "رمز الدخول (PIN)", on: false },
  { key: "telegram", label: "تيليجرام", on: true },
  { key: "presence", label: "الحضور", on: true },
];

const COLS_KEY = "sdhu-cadre-columns";

/** The columns this viewer chose, kept in his browser only (a convenience, not the cadre's data) */
function useColumns() {
  const [cols, setCols] = useState<ColKey[]>(() => COLUMNS.filter((c) => c.on).map((c) => c.key));
  useEffect(() => {
    try {
      const saved = JSON.parse(window.localStorage.getItem(COLS_KEY) ?? "null");
      // eslint-disable-next-line react-hooks/set-state-in-effect -- read once from this browser after hydration
      if (Array.isArray(saved)) setCols(saved.filter((k): k is ColKey => COLUMNS.some((c) => c.key === k)));
    } catch {
      /* private mode: the defaults */
    }
  }, []);
  const save = (next: ColKey[]) => {
    setCols(next);
    try {
      window.localStorage.setItem(COLS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };
  return [cols, save] as const;
}

function useRowText() {
  const s = useStructure();
  const season = useFormingSeason();
  const presence = useStore((x) => x.presence);
  const now = useNow(30_000);
  const cat = (id?: string) => s.categories.find((c) => c.id === id)?.name;
  const pres = (r: CadreRow) => {
    const p = presenceOf(r.id, presence, now);
    return p.online ? "● متصل الآن" : p.at ? `آخر ظهور: ${fmtDateTime(p.at)}` : "غير متصل";
  };
  return (r: CadreRow, k: ColKey): string => {
    switch (k) {
      case "primary":
        return roleName(r.primary, s) + (r.seasonal ? ` (صفة موسمية ${season}: ${seasonalText(r.seasonal, s)})` : "");
      case "post":
        return r.place?.posts.join("، ") ?? "";
      case "cluster":
        return r.place?.clusterName ?? "";
      case "group":
        return r.place?.group !== undefined ? groupName(r.place.group) : "";
      case "category":
        return cat(r.category) ?? "";
      case "branch":
        return r.branch;
      case "extra":
        return r.extra.join("، ");
      case "phone":
        return r.phone ?? "";
      case "birth":
        return r.birth ?? "";
      case "age":
        return r.age ? String(r.age) : "";
      case "barcode":
        return r.barcode ?? "";
      case "pin":
        return r.pin ?? "";
      case "telegram":
        return r.chatId ? "مربوط" : "غير مربوط";
      case "presence":
        return pres(r);
    }
  };
}

function Roster() {
  const s = useStructure();
  const rows = useCadreRows();
  const text = useRowText();
  const presence = useStore((x) => x.presence);
  const now = useNow(30_000);
  const [cols, setCols] = useColumns();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [post, setPost] = useState("");
  const [state, setStateFilter] = useState("active");
  const [tg, setTg] = useState("");
  const [shown, setShown] = useState(60);
  const [open, setOpen] = useState<string | null>(null);
  const [choosing, setChoosing] = useState(false);
  const [adding, setAdding] = useState(false);
  const [sending, setSending] = useState(false);

  const found = rows
    .filter((r) => (state === "all" ? r.status?.state !== "deleted" : state === "active" ? !r.status : r.status?.state === state))
    .filter((r) => !role || r.primary === role || r.seasonal?.role === role)
    .filter((r) => !branch || r.branch === branch || r.extra.includes(branch))
    .filter((r) => !post || (post === "free" ? !r.place : post === "seasonal" ? !!r.seasonal : !!r.place))
    .filter((r) => !tg || (tg === "linked" ? !!r.chatId : !r.chatId))
    .filter((r) => !q.trim() || [r.name, r.phone ?? "", r.barcode ?? "", r.place?.clusterName ?? "", roleName(r.primary, s)].some((t) => t.includes(q.trim())));
  const sheet = rows.find((r) => r.id === open);
  const online = rows.filter((r) => presenceOf(r.id, presence, now).online).length;
  const visible = COLUMNS.filter((c) => cols.includes(c.key));

  const exportAll = () => downloadCsv(`الكادر-الإداري-${dayOf(new Date())}.csv`, [["الاسم", ...visible.map((c) => c.label), "الحالة"], ...found.map((r) => [r.name, ...visible.map((c) => text(r, c.key)), r.status ? (r.status.state === "disabled" ? "موقوف" : "محذوف") : "فعّال"])]);

  return (
    <>
      <div className="grid gap-3 sm:grid-cols-4">
        {[
          ["الكادر", rows.filter((r) => r.status?.state !== "deleted").length, "كل من يعرفه الموسم"],
          ["في تكتلات معتمدة", rows.filter((r) => r.place).length, "بمكانه في تكتله"],
          ["مربوطون بتيليجرام", rows.filter((r) => r.chatId).length, "يصلهم ما يُرسل عبر البوت"],
          ["متصلون الآن", online, `${rows.filter((r) => r.status?.state === "disabled").length} حسابات موقوفة`],
        ].map(([k, v, h]) => (
          <div key={k as string} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
            <p className="text-xs text-white/60">{k}</p>
            <p className="font-display text-2xl font-bold text-gold">{v}</p>
            <p className="text-[11px] text-white/50">{h}</p>
          </div>
        ))}
      </div>

      <Panel
        icon={<UsersRound />}
        title="الكادر الإداري"
        action={
          <span className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" className="text-white" onClick={() => setChoosing(true)}>
              <Columns3 className="size-4" /> الأعمدة
            </Button>
            <Button size="sm" variant="ghost" className="text-white" onClick={exportAll}>
              <Download className="size-4" /> Excel
            </Button>
            <Button size="sm" variant="glass" onClick={() => setSending(true)}>
              <Send className="size-4" /> إرسال تيليجرام
            </Button>
            <Button size="sm" variant="gold" onClick={() => setAdding(true)}>
              <UserPlus className="size-4" /> إضافة كادر
            </Button>
          </span>
        }
      >
        <p className="mb-3 text-sm leading-7 text-white/70">
          كل فرد مرة واحدة عبر المواسم. «الصفة الأساسية» تبقى من موسم إلى موسم، والموسمية تغطيها لموسم واحد. «الصفة في التكتل» ومكانه من التكتلات المعتمدة. افتح أي فرد لتعديل بياناته وصفته وفئته وفروعه، أو لإيقاف حسابه أو حذفه، ولكل تعديل سببه في أحداث ملفه.
        </p>
        <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-7">
          <SearchBox value={q} onChange={setQ} placeholder="الاسم، الهاتف، الباركود، التكتل" label="بحث في الكادر" className="md:col-span-3 xl:col-span-2" />
          <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={s.roles.map((r) => ({ value: r.key, label: `${r.name} (${rows.filter((x) => x.primary === r.key || x.seasonal?.role === r.key).length})` }))} />
          <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
          <FilterSelect label="المكان" all="الكل" value={post} onChange={setPost} options={[{ value: "placed", label: "في تكتل معتمد" }, { value: "free", label: "بلا تكتل" }, { value: "seasonal", label: "له صفة موسمية" }]} />
          <FilterSelect label="الحساب" all="غير المحذوفين" value={state === "all" ? "" : state} onChange={(v) => setStateFilter(v || "all")} options={[{ value: "active", label: "فعّال" }, { value: "disabled", label: "موقوف" }, { value: "deleted", label: "محذوف" }]} />
          <FilterSelect label="تيليجرام" all="الكل" value={tg} onChange={setTg} options={[{ value: "linked", label: "مربوط" }, { value: "unlinked", label: "غير مربوط" }]} />
        </div>
        <p className="mt-3 text-xs text-white/55">{found.length} فرداً في القائمة</p>
        {found.length === 0 ? (
          <Empty icon={<UsersRound />} title="لا أحد" text="غيّر البحث أو المرشّحات." />
        ) : (
          <div className="mt-2 overflow-x-auto rounded-2xl ring-1 ring-white/10">
            <table className="w-full min-w-[960px] text-right text-sm">
              <thead className="bg-white/[.07] text-xs text-gold">
                <tr>
                  <th className="px-3 py-2.5 font-bold">الاسم</th>
                  {visible.map((c) => (
                    <th key={c.key} className="whitespace-nowrap px-3 py-2.5 font-bold">
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {found.slice(0, shown).map((r) => (
                  <tr key={r.id} onClick={() => setOpen(r.id)} className={cn("cursor-pointer border-t border-white/5 transition hover:bg-white/[.06]", r.status && "opacity-60")}>
                    <td className="px-3 py-2.5">
                      <span className="block font-bold text-white">{r.name}</span>
                      {r.status && <Chip tone="maroon">{r.status.state === "disabled" ? "موقوف" : "محذوف"}</Chip>}
                      {r.added && !r.status && <span className="text-[11px] text-white/50">أضافته الإدارة</span>}
                    </td>
                    {visible.map((c) => (
                      <td key={c.key} className={cn("px-3 py-2.5 text-white/85", ["telegram", "presence", "phone", "pin", "barcode", "birth", "age"].includes(c.key) && "whitespace-nowrap", c.key === "presence" && text(r, c.key).startsWith("●") && "font-bold text-green-light", (c.key === "phone" || c.key === "barcode" || c.key === "pin") && "tabular-nums")} dir={c.key === "phone" || c.key === "barcode" || c.key === "pin" ? "ltr" : undefined}>
                        {text(r, c.key) || <span className="text-white/30">—</span>}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {found.length > shown && (
          <Button size="sm" variant="glass" className="mt-3" onClick={() => setShown(shown + 100)}>
            عرض المزيد ({found.length - shown})
          </Button>
        )}
      </Panel>

      <Drawer open={!!sheet} onClose={() => setOpen(null)} title={sheet?.name ?? ""} width="max-w-3xl">
        {sheet && <PersonFile r={sheet} onClose={() => setOpen(null)} />}
      </Drawer>

      <Modal open={choosing} onClose={() => setChoosing(false)} className="max-w-md border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="text-xs font-bold text-gold">أعمدة الجدول</p>
        <p className="mt-1 text-sm text-white/70">يُحفظ اختيارك في متصفحك، ويُصدَّر إلى Excel ما تختاره.</p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          {COLUMNS.map((c) => (
            <label key={c.key} className="flex cursor-pointer items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-sm ring-1 ring-white/10">
              <input type="checkbox" checked={cols.includes(c.key)} onChange={(e) => setCols(e.target.checked ? COLUMNS.filter((x) => x.key === c.key || cols.includes(x.key)).map((x) => x.key) : cols.filter((k) => k !== c.key))} className="size-4 accent-[#D9C89E]" /> {c.label}
            </label>
          ))}
        </div>
        <div className="mt-4 flex gap-2">
          <Button size="sm" variant="gold" onClick={() => setChoosing(false)}>
            تم
          </Button>
          <Button size="sm" variant="glass" onClick={() => setCols(COLUMNS.filter((c) => c.on).map((c) => c.key))}>
            <RotateCcw className="size-4" /> الأعمدة الأصلية
          </Button>
        </div>
      </Modal>

      <AddPerson open={adding} onClose={() => setAdding(false)} onAdded={(id) => setOpen(id)} />
      <SendTelegram open={sending} onClose={() => setSending(false)} rows={found.filter((r) => !r.status)} />
    </>
  );
}

// ───────────────────────── One person's file ─────────────────────────

function PersonFile({ r, onClose }: { r: CadreRow; onClose: () => void }) {
  const [tab, setTab] = useState<"data" | "role" | "events">("data");
  return (
    <div className="space-y-5">
      <Tabs
        id={`person-${r.id}`}
        value={tab}
        onChange={setTab}
        tabs={[
          { value: "data", label: "البيانات والدخول" },
          { value: "role", label: "الصفة والفئة والفروع" },
          { value: "events", label: "أحداث ملفه" },
        ]}
      />
      {tab === "data" && <PersonData r={r} onClose={onClose} />}
      {tab === "role" && <PersonCadre id={r.id} name={r.name} applied={r.applied} area="cadre" />}
      {tab === "events" && <PersonEvents r={r} />}
    </div>
  );
}

function PersonData({ r, onClose }: { r: CadreRow; onClose: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const presence = useStore((x) => x.presence);
  const now = useNow(30_000);
  const [phone, setPhone] = useState(r.phone ?? "");
  const [barcode, setBarcode] = useState(r.barcode ?? "");
  const [birth, setBirth] = useState(r.birth ?? "");
  const [acting, setActing] = useState<"disable" | "enable" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const p = presenceOf(r.id, presence, now);
  const log = (action: string, detail?: string, important = false) => logAdmins(user, "cadre", { action, target: r.name, detail, ref: r.id, important });

  const saveContact = () => {
    actions.setCadre("contact", r.id, { ...storedContact(r.id), phone: phone.trim() || undefined, barcode: barcode.trim() || undefined, birth: birth || undefined });
    log("تعديل بيانات فرد من الكادر", [phone !== r.phone && `الهاتف ${phone}`, barcode !== r.barcode && `الباركود ${barcode}`, birth !== r.birth && `الميلاد ${birth}`].filter(Boolean).join(" · "));
    toast({ title: "حُفظت البيانات", body: r.name, tone: "success", icon: "💾" });
  };
  const pin = () => {
    const next = newPin(nowMs() + r.id.length);
    actions.setCadre("contact", r.id, { ...storedContact(r.id), pin: next });
    log("رمز دخول جديد", "أُلغي الرمز السابق");
    toast({ title: "رمز دخول جديد", body: `${r.name}: ${next}`, tone: "gold", icon: "🔑" });
  };
  const sendPin = () => {
    if (!r.chatId) return toast({ title: "لم يربط تيليجرام", body: "يربطه من «الإشعارات» في حسابه، أو يأخذ رمزه من المكتب.", tone: "info", icon: "✈️" });
    actions.addTelegram({ by: user.name, text: `رمز دخولك إلى منصة الإداريين: ${r.pin}`, to: [r.id], reached: [r.id] });
    log("إرسال رمز الدخول عبر تيليجرام");
    toast({ title: "أُرسل رمز الدخول", body: `إلى تيليجرام ${r.name}`, tone: "success", icon: "✈️" });
  };
  const unlink = () => {
    // An empty chat id is kept as "unlinked" (an absent one would fall back to the season's records)
    actions.setCadre("contact", r.id, { ...storedContact(r.id), chatId: "", telegram: undefined });
    log("فك ربط تيليجرام");
  };
  const act = () => {
    const why = reason.trim();
    if (acting === "delete") {
      if (r.place) return toast({ title: "لا يُحذف من في تكتل معتمد", body: `أخرجه من «${r.place.clusterName}» بتعديل استثنائي أولاً.`, tone: "info", icon: "🔒" });
      actions.setCadre("status", r.id, { state: "deleted", reason: why, by: user.name, at: nowMs() });
      logCadre(r.id, r.name, "deleted", user.name, { change: roleName(r.primary), note: why });
      log("حذف فرد من الكادر نهائياً", why, true);
      toast({ title: `حُذف ${r.name}`, body: "لا يظهر في الكادر ولا يُدعى إلى تكتل، ويبقى حدث حذفه في أحداث الكادر.", tone: "info", icon: "🗑️" });
      onClose();
    } else if (acting === "disable") {
      actions.setCadre("status", r.id, { state: "disabled", reason: why, by: user.name, at: nowMs() });
      logCadre(r.id, r.name, "status", user.name, { change: "إيقاف الحساب", note: why });
      log("إيقاف حساب فرد من الكادر", why, true);
      toast({ title: `أُوقف حساب ${r.name}`, body: "لا يدخل المنصة ولا يُدعى إلى تكتل حتى يُفعَّل.", tone: "info", icon: "⛔" });
    } else if (acting === "enable") {
      actions.setCadre("status", r.id, undefined);
      logCadre(r.id, r.name, "status", user.name, { change: r.status?.state === "deleted" ? "استعادة بعد الحذف" : "تفعيل الحساب", note: why });
      log(r.status?.state === "deleted" ? "استعادة فرد محذوف إلى الكادر" : "تفعيل حساب فرد من الكادر", why, true);
      toast({ title: `فُعّل حساب ${r.name}`, tone: "success", icon: "✅" });
    }
    setActing(null);
    setReason("");
  };

  return (
    <div className="space-y-5 text-sm">
      {r.status && (
        <p className="rounded-2xl bg-maroon/25 p-3 leading-7 text-white ring-1 ring-maroon/50">
          {r.status.state === "disabled" ? "حسابه موقوف" : "محذوف من الكادر"} — {r.status.reason}. ({r.status.by}، {fmtDateTime(r.status.at)})
        </p>
      )}
      <InfoGrid
        rows={[
          ["الرقم الوطني", r.id.startsWith("seed-") || r.id.startsWith("s-") ? "من سجلات الموسم" : <span dir="ltr">{maskNationalId(r.id)}</span>],
          ["الجنس", r.gender === "F" ? "أنثى" : "ذكر"],
          ["العمر", r.age ? `${r.age} سنة` : undefined],
          ["الصفة الأساسية", roleName(r.primary)],
          ["مكانه هذا الموسم", r.place ? `${r.place.clusterName} — ${r.place.posts.join("، ")}${r.place.group !== undefined ? ` (${groupName(r.place.group)})` : ""}` : "لم يدخل تكتلاً معتمداً"],
          ["الحضور", p.online ? <b className="text-green-light">● متصل الآن</b> : p.at ? `آخر ظهور: ${fmtDateTime(p.at)}` : "غير متصل"],
        ]}
      />

      <div className="space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="font-bold text-white">بياناته</p>
        <div className="grid gap-2 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الهاتف</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))} className={smallInputClass} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">تاريخ الميلاد</span>
            <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className={cn(smallInputClass, "[color-scheme:dark]")} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">رقم الباركود (بطاقته)</span>
            <input value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))} className={smallInputClass} dir="ltr" />
          </label>
        </div>
        <Button size="sm" variant="gold" disabled={phone === (r.phone ?? "") && barcode === (r.barcode ?? "") && birth === (r.birth ?? "")} onClick={saveContact}>
          حفظ البيانات
        </Button>
      </div>

      <div className="space-y-3 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
        <p className="flex items-center gap-2 font-bold text-white">
          <KeyRound className="size-4 text-gold" /> الدخول وتيليجرام
        </p>
        <p className="text-xs leading-6 text-white/65">يدخل الإداري باسمه أو هاتفه ورمز الدخول (PIN)، أو برقمه الوطني وكلمة مروره. يصله الرمز من بوت تيليجرام إن ربطه، أو من المكتب.</p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-xl bg-black/20 px-3 py-2 font-display text-lg font-bold tracking-[.3em] text-gold" dir="ltr">
            {r.pin}
          </span>
          <Button size="sm" variant="glass" onClick={pin}>
            <RotateCcw className="size-4" /> رمز جديد
          </Button>
          <Button size="sm" variant="glass" onClick={sendPin}>
            <Send className="size-4" /> أرسله عبر تيليجرام
          </Button>
        </div>
        <p className="text-xs text-white/70">
          تيليجرام:{" "}
          {r.chatId ? (
            <>
              <b className="text-green-light">مربوط</b> <span dir="ltr">(chat_id {r.chatId})</span>{" "}
              <button type="button" onClick={unlink} className="font-bold text-gold underline">
                فك الربط
              </button>
            </>
          ) : (
            <b className="text-gold">غير مربوط — يربطه بنفسه من «الإشعارات» في حسابه</b>
          )}
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-t border-white/10 pt-4">
        {r.status ? (
          <Button size="sm" variant="gold" onClick={() => setActing("enable")}>
            <RotateCcw className="size-4" /> {r.status.state === "deleted" ? "استعادته إلى الكادر" : "تفعيل الحساب"}
          </Button>
        ) : (
          <>
            <Button size="sm" variant="glass" onClick={() => setActing("disable")}>
              <Ban className="size-4" /> إيقاف الحساب
            </Button>
            <Button size="sm" variant="ghost" className="text-white hover:bg-maroon/40" onClick={() => setActing("delete")}>
              <Trash2 className="size-4" /> حذف نهائياً
            </Button>
          </>
        )}
      </div>
      <RecordHistory system="admins" refId={r.id} />

      <Modal open={!!acting} onClose={() => setActing(null)} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
        <p className="text-xs font-bold text-gold">{acting === "delete" ? "حذف نهائي من الكادر" : acting === "disable" ? "إيقاف الحساب" : "تفعيل الحساب"}</p>
        <h3 className="mt-1 font-display text-xl font-bold">{r.name}</h3>
        <p className="mt-1 text-sm leading-7 text-white/70">
          {acting === "delete"
            ? "يختفي من الكادر ومن قوائم الترشيح، ويبقى حدث حذفه وسببه في أحداث الكادر. لا يُحذف من في تكتل معتمد."
            : acting === "disable"
              ? "لا يدخل المنصة ولا يُدعى إلى تكتل حتى يُفعَّل، ويبقى في الكادر بملفه."
              : "يعود حسابه كما كان، ويُكتب ذلك في أحداث ملفه."}
        </p>
        <textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder="السبب (إلزامي)" aria-label="السبب" />
        <div className="mt-4 flex gap-2">
          <Button variant="gold" disabled={reason.trim().length < 3} onClick={act}>
            تنفيذ
          </Button>
          <Button variant="glass" onClick={() => setActing(null)}>
            إلغاء
          </Button>
        </div>
      </Modal>
    </div>
  );
}

/** What the staff already set on his contact (only that is written back, over the season's records) */
const storedContact = (id: string) => getState().cadre.contact[id] ?? {};

/** The events of one person's file, newest first, and an event written by hand */
function PersonEvents({ r }: { r: CadreRow }) {
  const events = useCadreEvents().filter((e) => e.personId === r.id);
  return (
    <div className="space-y-4">
      <AddEvent person={r} />
      {events.length === 0 ? (
        <Empty icon={<UserCog />} title="لا أحداث بعد" text="يُكتب هنا انضمامه إلى تكتل، وكل تعديل على صفته وفئته وفرعه، وما تكتبه بيدك." />
      ) : (
        <ol className="space-y-2">
          {events.map((e) => (
            <li key={e.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="flex flex-wrap items-center gap-2 text-sm font-bold text-white">
                {eventLabel(e.type)} <Chip>{e.season ? `موسم ${e.season}` : "بلا موسم"}</Chip>
                <span className="text-xs font-normal text-white/55">{e.date}</span>
              </p>
              {e.change && <p className="mt-1 text-sm text-white/85">{e.change}</p>}
              {e.note && <p className="text-xs leading-6 text-white/65">{e.note}</p>}
              <p className="mt-1 text-[11px] text-white/45">
                سجّله {e.by} — {fmtDateTime(e.at)}
              </p>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function AddEvent({ person, people }: { person?: CadreRow; people?: CadreRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useFormingSeason();
  const [open, setOpen] = useState(false);
  const [who, setWho] = useState(person?.id ?? "");
  const [q, setQ] = useState("");
  const [type, setType] = useState<CadreEventType>("note");
  const [date, setDate] = useState(() => dayOf(new Date()));
  const [ofSeason, setOfSeason] = useState(String(season));
  const [change, setChange] = useState("");
  const [note, setNote] = useState("");
  const target = person ?? people?.find((x) => x.id === who);
  const matches = people && q.trim() ? people.filter((x) => x.name.includes(q.trim())).slice(0, 8) : [];
  const save = () => {
    if (!target) return;
    logCadre(target.id, target.name, type, user.name, { change: change.trim() || undefined, note: note.trim() || undefined, date, season: ofSeason ? Number(ofSeason) : null });
    logAdmins(user, "cadre", { action: "إضافة حدث إلى ملف فرد", target: target.name, detail: `${EVENT_TYPES[type].label}${change.trim() ? ` — ${change.trim()}` : ""}`, ref: target.id });
    toast({ title: "أُضيف الحدث", body: `${EVENT_TYPES[type].label} — ${target.name}`, tone: "success", icon: "📝" });
    setOpen(false);
    setChange("");
    setNote("");
    if (!person) setWho("");
  };
  if (!open)
    return (
      <Button size="sm" variant="gold" onClick={() => setOpen(true)}>
        <Plus className="size-4" /> إضافة حدث
      </Button>
    );
  return (
    <div className="space-y-3 rounded-2xl bg-white/5 p-3 text-sm ring-1 ring-gold/30">
      <p className="font-bold text-gold">حدث جديد {target ? `في ملف ${target.name}` : ""}</p>
      {!person && (
        <div>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث عن الفرد بالاسم" className={smallInputClass} aria-label="الفرد" />
          {matches.length > 0 && (
            <ul className="mt-1 space-y-1">
              {matches.map((m) => (
                <li key={m.id}>
                  <button type="button" onClick={() => { setWho(m.id); setQ(m.name); }} className={cn("w-full rounded-xl px-3 py-1.5 text-right text-xs ring-1", who === m.id ? "bg-gold/20 ring-gold/50" : "bg-white/5 ring-white/10")}>
                    {m.name} — {roleName(m.primary)}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="grid gap-2 sm:grid-cols-3">
        <select value={type} onChange={(e) => setType(e.target.value as CadreEventType)} aria-label="نوع الحدث" className={selectInput}>
          {(Object.keys(EVENT_TYPES) as CadreEventType[]).map((t) => (
            <option key={t} value={t}>
              {eventLabel(t)}
            </option>
          ))}
        </select>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} aria-label="تاريخ الحدث" className={cn(smallInputClass, "[color-scheme:dark]")} dir="ltr" />
        <select value={ofSeason} onChange={(e) => setOfSeason(e.target.value)} aria-label="الموسم" className={selectInput}>
          {[season, season - 1, season - 2].map((y) => (
            <option key={y} value={y}>
              موسم {y}
            </option>
          ))}
          <option value="">بلا موسم</option>
        </select>
      </div>
      <input value={change} onChange={(e) => setChange(e.target.value)} placeholder="التغيير (اختياري) — مثال: حلب ← دمشق" className={smallInputClass} aria-label="التغيير" />
      <textarea rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="التوضيح" className={textareaClass} aria-label="التوضيح" />
      <div className="flex gap-2">
        <Button size="sm" variant="gold" disabled={!target || (!note.trim() && !change.trim())} onClick={save}>
          حفظ الحدث
        </Button>
        <Button size="sm" variant="glass" onClick={() => setOpen(false)}>
          إلغاء
        </Button>
      </div>
    </div>
  );
}

// ───────────────────────── The cadre's events ─────────────────────────

function Events() {
  const events = useCadreEvents();
  const rows = useCadreRows();
  const season = useFormingSeason();
  const [type, setType] = useState("");
  const [ofSeason, setOfSeason] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(80);
  const seasons = [...new Set(events.map((e) => e.season).filter((x): x is number => x !== null))].sort((a, b) => b - a);
  const found = events
    .filter((e) => !type || e.type === type)
    .filter((e) => !ofSeason || (ofSeason === "none" ? e.season === null : e.season === Number(ofSeason)))
    .filter((e) => !q.trim() || [e.name, e.change ?? "", e.note ?? "", e.by].some((t) => t.includes(q.trim())));
  const exportAll = () =>
    downloadCsv(`أحداث-الكادر-${dayOf(new Date())}.csv`, [
      ["تاريخ الحدث", "الفرد", "النوع", "الموسم", "التغيير", "التوضيح", "سجّله", "وقت التسجيل"],
      ...found.map((e) => [e.date, e.name, EVENT_TYPES[e.type].label, e.season ?? "", e.change ?? "", e.note ?? "", e.by, fmtDateTime(e.at)]),
    ]);
  return (
    <Panel
      icon={<UserCog />}
      title="أحداث الكادر"
      action={
        <Button size="sm" variant="ghost" className="text-white" onClick={exportAll}>
          <Download className="size-4" /> Excel
        </Button>
      }
    >
      <p className="mb-3 text-sm leading-7 text-white/70">
        ملف كل فرد عبر المواسم: انضمامه إلى تكتل باعتماده، والتعديلات الاستثنائية التي مسّته، وتغيير صفته الأساسية والموسمية وفرعه وفئته، وإضافته وإيقافه وحذفه، وما تكتبه الإدارة بيدها. الموسم الحالي {season}.
      </p>
      <AddEvent people={rows.filter((r) => r.status?.state !== "deleted")} />
      <div className="mt-4 grid gap-2 md:grid-cols-[2fr_1fr_1fr]">
        <SearchBox value={q} onChange={setQ} placeholder="الفرد، التغيير، التوضيح، من سجّله" label="بحث في الأحداث" />
        <FilterSelect label="النوع" all="كل الأنواع" value={type} onChange={setType} options={(Object.keys(EVENT_TYPES) as CadreEventType[]).map((t) => ({ value: t, label: `${eventLabel(t)} (${events.filter((e) => e.type === t).length})` }))} />
        <FilterSelect label="الموسم" all="كل المواسم" value={ofSeason} onChange={setOfSeason} options={[...seasons.map((y) => ({ value: String(y), label: `موسم ${y}` })), { value: "none", label: "بلا موسم" }]} />
      </div>
      <div className="mt-3 overflow-x-auto rounded-2xl ring-1 ring-white/10">
        <table className="w-full min-w-[900px] text-right text-sm">
          <thead className="bg-white/[.07] text-xs text-gold">
            <tr>
              {["تاريخ الحدث", "الفرد", "النوع", "الموسم", "التغيير", "التوضيح", "سجّله", "وقت التسجيل"].map((h) => (
                <th key={h} className="whitespace-nowrap px-3 py-2.5 font-bold">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {found.slice(0, shown).map((e) => (
              <tr key={e.id} className="border-t border-white/5 align-top">
                <td className="whitespace-nowrap px-3 py-2 text-white/80" dir="ltr">
                  {e.date}
                </td>
                <td className="px-3 py-2 font-bold text-white">{e.name}</td>
                <td className="whitespace-nowrap px-3 py-2 text-white/85">{eventLabel(e.type)}</td>
                <td className="px-3 py-2 text-white/70">{e.season ?? "—"}</td>
                <td className="px-3 py-2 text-white/85">{e.change ?? "—"}</td>
                <td className="px-3 py-2 text-xs leading-6 text-white/65">{e.note ?? "—"}</td>
                <td className="whitespace-nowrap px-3 py-2 text-white/70">{e.by}</td>
                <td className="whitespace-nowrap px-3 py-2 text-xs text-white/55">{fmtDateTime(e.at)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {found.length > shown && (
        <Button size="sm" variant="glass" className="mt-3" onClick={() => setShown(shown + 120)}>
          عرض المزيد ({found.length - shown})
        </Button>
      )}
    </Panel>
  );
}

// ───────────────────────── Adding a person ─────────────────────────

function AddPerson({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (id: string) => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const rows = useCadreRows();
  const [id, setId] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState("group-deputy");
  const [branch, setBranch] = useState("دمشق");
  const [category, setCategory] = useState("");
  const [reason, setReason] = useState("");
  const person = isValidNationalId(id) ? getPerson(id) : null;
  const exists = rows.find((r) => r.id === id);
  const def = roleOf(s, role);
  const genderOk = !def?.gender || !person || def.gender === person.gender;
  const ready = !!person && !exists && genderOk && /^09\d{8}$/.test(phone) && reason.trim().length >= 3 && (!def?.category || !!category);
  const add = () => {
    if (!person) return;
    const name = `${person.firstName} ${person.fatherName} ${person.lastName}`;
    const at = nowMs();
    actions.setCadre("added", id, { id, name, gender: person.gender, role, branch, phone, birth: person.birthDate, at, by: user.name });
    actions.setCadre("branches", id, { branch, extra: [] });
    actions.setCadre("contact", id, { phone, birth: person.birthDate });
    if (def?.category && category) actions.setCadre("category", id, category);
    logCadre(id, name, "added", user.name, { change: `${roleName(role, s)} — فرع ${branch}`, note: reason.trim() });
    logAdmins(user, "cadre", { action: "إضافة فرد إلى الكادر", target: name, detail: `${roleName(role, s)} — ${branch} — ${reason.trim()}`, ref: id, important: true });
    toast({ title: `أُضيف ${name}`, body: `${roleName(role, s)} — فرع ${branch}. رمز دخوله في ملفه.`, tone: "success", icon: "🆕" });
    onClose();
    onAdded(id);
    setId("");
    setPhone("");
    setReason("");
    setCategory("");
  };
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      <p className="text-xs font-bold text-gold">إضافة كادر</p>
      <h3 className="mt-1 font-display text-xl font-bold">فرد جديد في الكادر الإداري</h3>
      <p className="mt-1 text-sm leading-7 text-white/70">بالرقم الوطني من السجل المدني: الاسم والجنس والميلاد منه، والهاتف والصفة والفرع منك. يُكتب في أحداث ملفه «إضافة كادر جديد» بسببها.</p>
      <div className="mt-4 space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الرقم الوطني</span>
          <input value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 11))} className={smallInputClass} dir="ltr" placeholder="11 رقماً" />
        </label>
        {id.length === 11 &&
          (exists ? (
            <p className="rounded-xl bg-gold/15 p-2 text-xs text-gold">في الكادر من قبل: {exists.name} — {roleName(exists.primary, s)}.</p>
          ) : person ? (
            <p className="rounded-xl bg-white/5 p-2 text-xs text-white/80">
              من السجل المدني: <b className="text-white">{`${person.firstName} ${person.fatherName} ${person.lastName}`}</b> — {person.gender === "F" ? "أنثى" : "ذكر"} — مواليد {person.birthDate} — {person.governorate}
            </p>
          ) : (
            <p className="text-xs text-gold">لا أحد بهذا الرقم في السجل المدني.</p>
          ))}
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الهاتف</span>
            <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))} className={smallInputClass} dir="ltr" placeholder="09XXXXXXXX" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الصفة الأساسية</span>
            <select value={role} onChange={(e) => setRole(e.target.value)} className={selectInput}>
              {s.roles
                .filter((r) => r.active)
                .map((r) => (
                  <option key={r.key} value={r.key}>
                    {r.name}
                  </option>
                ))}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الفرع</span>
            <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectInput}>
              {s.branches
                .filter((b) => b.active)
                .map((b) => (
                  <option key={b.id} value={b.name}>
                    {b.name}
                  </option>
                ))}
            </select>
          </label>
          {def?.category && (
            <label className="block">
              <span className="mb-1 block text-xs text-white/60">الفئة</span>
              <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectInput}>
                <option value="">— اختر —</option>
                {s.categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {!genderOk && <p className="text-xs font-bold text-gold">صفة «{def?.name}» {def?.gender === "F" ? "للإناث" : "للذكور"}.</p>}
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="السبب (إلزامي) — مثال: بكتاب فرع حلب رقم 112" aria-label="سبب الإضافة" />
      </div>
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={!ready} onClick={add}>
          <UserPlus className="size-4" /> إضافة
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}

// ───────────────────────── Telegram ─────────────────────────

function SendTelegram({ open, onClose, rows }: { open: boolean; onClose: () => void; rows: CadreRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [text, setText] = useState("");
  const linked = rows.filter((r) => r.chatId);
  const send = () => {
    actions.addTelegram({ by: user.name, text: text.trim(), to: rows.map((r) => r.id), reached: linked.map((r) => r.id) });
    logAdmins(user, "cadre", { action: "إرسال رسالة تيليجرام إلى الكادر", target: `${rows.length} فرداً`, detail: `${text.trim()} — وصلت إلى ${linked.length}`, important: rows.length > 20 });
    toast({ title: "أُرسلت الرسالة", body: `وصلت إلى ${linked.length} من ${rows.length} (المربوطون بالبوت).`, tone: "success", icon: "✈️" });
    setText("");
    onClose();
  };
  return (
    <Modal open={open} onClose={onClose} className="max-w-lg border border-gold/30 bg-linear-to-b from-[#004a42] to-[#00352f] text-white">
      <p className="text-xs font-bold text-gold">إرسال تيليجرام</p>
      <h3 className="mt-1 font-display text-xl font-bold">إلى من في القائمة المعروضة ({rows.length})</h3>
      <p className="mt-1 text-sm leading-7 text-white/70">تصل الرسالة عبر بوت المنصة إلى {linked.length} منهم ربطوا تيليجرام، وتظهر في «الإشعارات» عند كل واحد منهم. صفِّ القائمة أولاً لتختار من تصله.</p>
      <textarea rows={4} value={text} onChange={(e) => setText(e.target.value)} className={cn(textareaClass, "mt-4")} placeholder="نص الرسالة" aria-label="نص الرسالة" />
      <div className="mt-4 flex gap-2">
        <Button variant="gold" disabled={text.trim().length < 3 || rows.length === 0} onClick={send}>
          <Send className="size-4" /> إرسال
        </Button>
        <Button variant="glass" onClick={onClose}>
          إلغاء
        </Button>
      </div>
    </Modal>
  );
}

function TelegramLog() {
  const sent = useStore((s) => s.cadre.telegram);
  return (
    <Panel icon={<Send />} title="رسائل تيليجرام المرسلة" action={<Chip tone="gold">{sent.length}</Chip>}>
      {sent.length === 0 ? (
        <Empty icon={<Send />} title="لم تُرسل رسالة بعد" text="من «الكادر»: صفِّ القائمة ثم «إرسال تيليجرام»، أو أرسل رمز الدخول لفرد من ملفه." />
      ) : (
        <ol className="space-y-2">
          {[...sent].reverse().map((m) => (
            <li key={m.id} className="rounded-2xl bg-white/[.06] p-3 ring-1 ring-white/10">
              <p className="text-sm leading-7 text-white">{m.text}</p>
              <p className="mt-1 text-xs text-white/55">
                {m.by} — {fmtDateTime(m.at)} — وصلت إلى {m.reached.length} من {m.to.length}
              </p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}

// ───────────────────────── A person's role, category and branches ─────────────────────────

/**
 * One person as the administration sets him: his base role («الصفة الأساسية», kept from season to season), a
 * seasonal role over it for this season (with a ready label and its reason) or none, his category when he leads
 * a group, his branch and extra branches. Each change asks its reason, is written to the staff's record, and is
 * an event in his file.
 */
export function PersonCadre({ id, name, applied, history = true, area = "cadre" }: { id: string; name: string; applied?: string; history?: boolean; area?: Area }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const season = useFormingSeason();
  const current = seasonalOf(id, cadre);
  const base = primaryOf(id, applied, cadre);
  const [primary, setPrimary] = useState(base);
  const [role, setRole] = useState(current?.role ?? "");
  const [label, setLabel] = useState(current?.label ?? "");
  const [category, setCategory] = useState(categoryOf(id, cadre) ?? "");
  const [branch, setBranch] = useState(branchOf(id, cadre));
  const [extra, setExtra] = useState<string[]>(branchesOf(id, cadre).slice(1));
  const [reason, setReason] = useState("");
  const log = (action: string, before: string, after: string) => logAdmins(user, area, { action, target: name, before, after, detail: reason.trim(), ref: id, important: true });
  const ready = reason.trim().length >= 3;
  const effective = role || primary;
  const leads = !!roleOf(s, effective)?.category || !!roleOf(s, base)?.category || !!categoryOf(id, cadre);
  const catName = (c?: string) => s.categories.find((x) => x.id === c)?.name ?? "—";

  const savePrimary = () => {
    actions.setCadre("primary", id, primary === applied ? undefined : primary);
    log("تغيير الصفة الأساسية", roleName(base, s), roleName(primary, s));
    logCadre(id, name, "role", user.name, { change: `${roleName(base, s)} ← ${roleName(primary, s)}`, note: reason.trim() });
    toast({ title: "حُفظت الصفة الأساسية", body: `${name}: ${roleName(primary, s)}`, tone: "success", icon: "🔄" });
    setReason("");
  };
  const saveRole = () => {
    const before = current ? seasonalText(current, s) : "لا صفة موسمية";
    if (!role) {
      actions.setCadre("seasonal", id, null);
      log("سحب صفة موسمية", before, `صفته الأساسية: ${roleName(base, s)}`);
      logCadre(id, name, "seasonal", user.name, { change: `${before} ← بلا صفة موسمية`, note: reason.trim() });
    } else {
      const g = { role, label: label || undefined, reason: reason.trim(), by: user.name, at: nowMs() };
      actions.setCadre("seasonal", id, g);
      log("منح صفة موسمية", before, seasonalText(g, s));
      logCadre(id, name, "seasonal", user.name, { change: `${before} ← ${seasonalText(g, s)}`, note: reason.trim() });
    }
    toast({ title: "حُفظت الصفة الموسمية", body: name, tone: "success", icon: "🏷️" });
    setReason("");
  };
  const saveCategory = () => {
    actions.setCadre("category", id, category || undefined);
    log("تعديل فئة", catName(categoryOf(id, cadre)), catName(category));
    logCadre(id, name, "category", user.name, { change: `${catName(categoryOf(id, cadre))} ← ${catName(category)}`, note: reason.trim() });
    toast({ title: "حُفظت الفئة", body: name, tone: "success", icon: "🏷️" });
    setReason("");
  };
  const saveBranches = () => {
    const next = [branch, ...extra.filter((b) => b !== branch)];
    actions.setCadre("branches", id, { branch, extra: extra.filter((b) => b !== branch) });
    log("تعديل الفروع", branchesOf(id, cadre).join("، "), next.join("، "));
    logCadre(id, name, "branch", user.name, { change: `${branchesOf(id, cadre).join("، ")} ← ${next.join("، ")}`, note: reason.trim() });
    toast({ title: "حُفظت الفروع", body: name, tone: "success", icon: "🏢" });
    setReason("");
  };

  return (
    <div className="space-y-5 text-sm">
      <p className="rounded-2xl bg-white/5 p-3 text-white/80 ring-1 ring-white/10">
        صفته الأساسية: <b className="text-gold">{roleName(base, s) || "—"}</b>
        {applied && applied !== base && <> (تقدّم هذا الموسم بصفة {roleName(applied, s)})</>}
        {current && (
          <>
            {" "}
            · الموسمية لموسم {season}: <b className="text-gold">{seasonalText(current, s)}</b> — {current.reason}
          </>
        )}
      </p>
      <label className="block">
        <span className="mb-1 block text-xs text-white/60">السبب (إلزامي لكل تعديل، ويُكتب في أحداث ملفه)</span>
        <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="مثال: اتحاد مع مجموعة أخرى — بناءً على كتاب تشكيل التكتلات" />
      </label>

      <Section title="الصفة الأساسية — تبقى من موسم إلى موسم">
        <select value={primary} onChange={(e) => setPrimary(e.target.value)} aria-label="الصفة الأساسية" className={selectInput}>
          {s.roles
            .filter((r) => r.active || r.key === primary)
            .map((r) => (
              <option key={r.key} value={r.key}>
                {r.name}
              </option>
            ))}
        </select>
        <Button size="sm" variant="gold" disabled={!ready || primary === base} onClick={savePrimary}>
          حفظ الصفة الأساسية
        </Button>
      </Section>

      <Section title={`الصفة الموسمية — لموسم ${season} وحده`}>
        <div className="grid gap-2 sm:grid-cols-2">
          <select value={role} onChange={(e) => { setRole(e.target.value); setLabel(""); }} aria-label="الصفة الموسمية" className={selectInput}>
            <option value="">— لا صفة موسمية —</option>
            {s.roles
              .filter((r) => r.active || r.key === role)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
          </select>
          <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={!role} aria-label="التسمية المعروضة" className={selectInput}>
            <option value="">— بلا تسمية —</option>
            {s.labels
              .filter((l) => l.active && l.base === role)
              .map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
          </select>
        </div>
        <Button size="sm" variant="gold" disabled={!ready || (role === (current?.role ?? "") && label === (current?.label ?? ""))} onClick={saveRole}>
          حفظ الصفة الموسمية
        </Button>
      </Section>

      {leads && (
        <Section title="الفئة (فئة مجموعته)">
          <select value={category} onChange={(e) => setCategory(e.target.value)} aria-label="الفئة" className={selectInput}>
            <option value="">— لا فئة —</option>
            {s.categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <Button size="sm" variant="gold" disabled={!ready || category === (categoryOf(id, cadre) ?? "")} onClick={saveCategory}>
            حفظ الفئة
          </Button>
        </Section>
      )}

      <Section title="الفرع والفروع الإضافية">
        <select value={branch} onChange={(e) => setBranch(e.target.value)} aria-label="الفرع" className={selectInput}>
          {s.branches
            .filter((b) => b.active || b.name === branch)
            .map((b) => (
              <option key={b.id} value={b.name}>
                {b.name}
              </option>
            ))}
        </select>
        <div className="flex flex-wrap gap-2">
          {s.branches
            .filter((b) => b.active && b.name !== branch)
            .map((b) => (
              <label key={b.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1", extra.includes(b.name) ? "bg-gold/20 text-gold ring-gold/40" : "bg-white/5 text-white/70 ring-white/15")}>
                <input type="checkbox" checked={extra.includes(b.name)} onChange={(e) => setExtra(e.target.checked ? [...extra, b.name] : extra.filter((x) => x !== b.name))} className="size-3.5 accent-[#D9C89E]" /> {b.name}
              </label>
            ))}
        </div>
        <Button size="sm" variant="gold" disabled={!ready || [branch, ...extra].join() === branchesOf(id, cadre).join()} onClick={saveBranches}>
          حفظ الفروع
        </Button>
      </Section>

      {history && <RecordHistory system="admins" refId={id} />}
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="space-y-2 rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
      <p className="font-bold text-white">{title}</p>
      {children}
    </div>
  );
}

