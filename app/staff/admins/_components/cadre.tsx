"use client";

import { useRouter } from "next/navigation";
import { Ban, Columns3, Download, RotateCcw, Send, Trash2, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
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
import { Drawer, fmtDateTime, smallInputClass, textareaClass, useNow, useStaffUser } from "../../_components/kit";
import { FilterSelect, InfoGrid, SearchBox } from "../../_components/ops-ui";
import { RecordHistory } from "../../_components/system";
import { AddButton, Box, EditHeader, EditLayout, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, SettingsRow, SettingsSection, Tag, Title } from "../../_components/wp";
import { Filters, Help, Lead, NotFound, SaveLine, TitleCell, Tool, Views, useHrefWith, useOpenId, useView } from "./ui";
import { logAdmins, type Area } from "../desk";

const selectInput = cn(smallInputClass, "[&>option]:text-ink");
const CADRE = "/staff/admins/manage/cadre";

/**
 * «الكادر الإداري» — the administration's cadre across the seasons, as a site's users screen: one table of
 * everyone (its columns chosen by the viewer), each person opening on his own screen (`?id=`) — his data, his
 * role, category and branches with their reason, the events of his file in the middle; his account and his
 * sign-in on the side. The cadre's events and the Telegram messages sent are the page's two other views (`?v=`).
 */
export function CadreTab() {
  const id = useOpenId();
  const view = useView("v", ["roster", "events", "telegram"] as const);
  const events = useCadreEvents();
  const sent = useStore((s) => s.cadre.telegram);
  const rows = useCadreRows();
  if (id) return <PersonScreen id={id} />;
  return (
    <div className="space-y-5">
      <Views
        param="v"
        value={view}
        label="الكادر وأحداثه"
        items={[
          { key: "roster", label: "الكادر", count: rows.filter((r) => r.status?.state !== "deleted").length },
          { key: "events", label: "أحداث الكادر", count: events.length },
          { key: "telegram", label: "رسائل تيليجرام", count: sent.length },
        ]}
      />
      {view === "roster" && <Roster />}
      {view === "events" && <Events />}
      {view === "telegram" && <TelegramLog />}
      <RecordsBox system="admins" area="cadre" title="سجل الكادر الإداري" />
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

type StateFilter = "active" | "disabled" | "deleted" | "all";

function Roster() {
  const s = useStructure();
  const router = useRouter();
  const hrefWith = useHrefWith();
  const rows = useCadreRows();
  const text = useRowText();
  const [cols, setCols] = useColumns();
  const [q, setQ] = useState("");
  const [role, setRole] = useState("");
  const [branch, setBranch] = useState("");
  const [post, setPost] = useState("");
  const [state, setState] = useState<StateFilter>("active");
  const [tg, setTg] = useState("");
  const [shown, setShown] = useState(60);
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
  const visible = COLUMNS.filter((c) => cols.includes(c.key));

  const exportAll = () => downloadCsv(`الكادر-الإداري-${dayOf(new Date())}.csv`, [["الاسم", ...visible.map((c) => c.label), "الحالة"], ...found.map((r) => [r.name, ...visible.map((c) => text(r, c.key)), r.status ? (r.status.state === "disabled" ? "موقوف" : "محذوف") : "فعّال"])]);

  return (
    <div className="space-y-4">
      <Title action={<AddButton onClick={() => setAdding(true)}>إضافة فرد إلى الكادر</AddButton>}>الكادر الإداري</Title>
      <Lead>كل فرد مرة واحدة عبر المواسم. افتح أي فرد لتعديل بياناته وصفته وفئته وفروعه، أو لإيقاف حسابه.</Lead>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <Filters
          label="حال الحساب"
          value={state}
          onChange={setState}
          items={[
            { key: "active", label: "الفعّالون", count: rows.filter((r) => !r.status).length },
            { key: "disabled", label: "الموقوفون", count: rows.filter((r) => r.status?.state === "disabled").length },
            { key: "deleted", label: "المحذوفون", count: rows.filter((r) => r.status?.state === "deleted").length },
            { key: "all", label: "الكل عدا المحذوفين", count: rows.filter((r) => r.status?.state !== "deleted").length },
          ]}
        />
        <span className="flex flex-wrap gap-2">
          <Tool onClick={() => setChoosing(true)}>
            <Columns3 /> الأعمدة
          </Tool>
          <Tool onClick={exportAll}>
            <Download /> Excel
          </Tool>
          <Tool onClick={() => setSending(true)}>
            <Send /> إرسال تيليجرام
          </Tool>
        </span>
      </div>
      <div className="grid gap-2 md:grid-cols-3 xl:grid-cols-6">
        <SearchBox value={q} onChange={setQ} placeholder="الاسم، الهاتف، الباركود، التكتل" label="بحث في الكادر" className="md:col-span-3 xl:col-span-2" />
        <FilterSelect label="الصفة" all="كل الصفات" value={role} onChange={setRole} options={s.roles.map((r) => ({ value: r.key, label: `${r.name} (${rows.filter((x) => x.primary === r.key || x.seasonal?.role === r.key).length})` }))} />
        <FilterSelect label="الفرع" all="كل الفروع" value={branch} onChange={setBranch} options={s.branches.map((b) => b.name)} />
        <FilterSelect label="المكان" all="كل الأماكن" value={post} onChange={setPost} options={[{ value: "placed", label: "في تكتل معتمد" }, { value: "free", label: "بلا تكتل" }, { value: "seasonal", label: "له صفة موسمية" }]} />
        <FilterSelect label="تيليجرام" all="تيليجرام: الكل" value={tg} onChange={setTg} options={[{ value: "linked", label: "مربوط" }, { value: "unlinked", label: "غير مربوط" }]} />
      </div>

      <ListTable head={["الاسم", ...visible.map((c) => c.label)]} minWidth="60rem">
        {found.length === 0 && <EmptyRow cols={visible.length + 1}>لا أحد بهذا البحث. غيّر البحث أو المرشّحات.</EmptyRow>}
        {found.slice(0, shown).map((r) => {
          const href = hrefWith({ id: r.id });
          return (
            <tr key={r.id} className={cn(r.status && "opacity-60")}>
              <TitleCell
                title={r.name}
                href={href}
                sub={r.status ? <Tag tone="maroon">{r.status.state === "disabled" ? "موقوف" : "محذوف"}</Tag> : r.added ? "أضافته الإدارة" : undefined}
                actions={
                  <RowActions>
                    <RowLink href={href}>فتح الملف</RowLink>
                  </RowActions>
                }
              />
              {visible.map((c) => (
                <td
                  key={c.key}
                  className={cn("p-3 align-top text-white/85", ["telegram", "presence", "phone", "pin", "barcode", "birth", "age"].includes(c.key) && "whitespace-nowrap", c.key === "presence" && text(r, c.key).startsWith("●") && "font-bold text-green-light", (c.key === "phone" || c.key === "barcode" || c.key === "pin") && "tabular-nums")}
                  dir={c.key === "phone" || c.key === "barcode" || c.key === "pin" ? "ltr" : undefined}
                >
                  {text(r, c.key) || <span className="text-white/30">—</span>}
                </td>
              ))}
            </tr>
          );
        })}
      </ListTable>
      {found.length > shown && (
        <Button size="sm" variant="glass" onClick={() => setShown(shown + 100)}>
          عرض المزيد ({found.length - shown})
        </Button>
      )}

      <Help>
        <p>«الصفة الأساسية» تبقى من موسم إلى موسم، والموسمية تغطيها لموسم واحد. «الصفة في التكتل» ومكانه من التكتلات المعتمدة.</p>
        <p>لكل تعديل على صفة فرد أو فئته أو فروعه سببه، ويُكتب في أحداث ملفه. وتصل رسائل تيليجرام إلى من ربط البوت فقط.</p>
      </Help>

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

      <AddPerson open={adding} onClose={() => setAdding(false)} onAdded={(id) => router.push(`${CADRE}?id=${id}`)} />
      <SendTelegram open={sending} onClose={() => setSending(false)} rows={found.filter((r) => !r.status)} />
    </div>
  );
}

// ───────────────────────── One person's screen ─────────────────────────

/** One person, as a site's user profile: his data, role and events in the middle; his account and sign-in on the side */
function PersonScreen({ id }: { id: string }) {
  const rows = useCadreRows();
  const hrefWith = useHrefWith();
  const s = useStructure();
  const presence = useStore((x) => x.presence);
  const now = useNow(30_000);
  const r = rows.find((x) => x.id === id);
  const back = hrefWith({ id: null });
  if (!r) return <NotFound back={back} backLabel="الكادر الإداري" what="هذا الفرد" />;
  const p = presenceOf(r.id, presence, now);
  return (
    <div>
      <EditHeader back={back} backLabel="الكادر الإداري" title={r.name}>
        {roleName(r.primary, s)} — فرع {r.branch}
        {r.status ? ` — ${r.status.state === "disabled" ? "حسابه موقوف" : "محذوف من الكادر"}` : ""}
      </EditHeader>
      <EditLayout
        main={
          <>
            {r.status && (
              <p className="rounded-2xl bg-maroon/25 p-3 text-sm leading-7 text-white ring-1 ring-maroon/50">
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
            <ContactForm key={`${r.phone}-${r.barcode}-${r.birth}`} r={r} />
            <SettingsSection title="الصفة والفئة والفروع">
              <div className="py-4">
                <PersonCadre id={r.id} name={r.name} applied={r.applied} area="cadre" history={false} />
              </div>
            </SettingsSection>
            <PersonEvents r={r} />
          </>
        }
        side={
          <>
            <AccountBox r={r} />
            <SignInBox r={r} />
            <Box title="سجلّه" open={false}>
              <RecordHistory system="admins" refId={r.id} bare />
            </Box>
          </>
        }
      />
    </div>
  );
}

/** His phone, birth date and card barcode: one form, saved once */
function ContactForm({ r }: { r: CadreRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const [phone, setPhone] = useState(r.phone ?? "");
  const [barcode, setBarcode] = useState(r.barcode ?? "");
  const [birth, setBirth] = useState(r.birth ?? "");
  const dirty = phone !== (r.phone ?? "") || barcode !== (r.barcode ?? "") || birth !== (r.birth ?? "");
  const save = () => {
    actions.setCadre("contact", r.id, { ...storedContact(r.id), phone: phone.trim() || undefined, barcode: barcode.trim() || undefined, birth: birth || undefined });
    logAdmins(user, "cadre", { action: "تعديل بيانات فرد من الكادر", target: r.name, detail: [phone !== r.phone && `الهاتف ${phone}`, barcode !== r.barcode && `الباركود ${barcode}`, birth !== r.birth && `الميلاد ${birth}`].filter(Boolean).join(" · "), ref: r.id });
    toast({ title: "حُفظت البيانات", body: r.name, tone: "success", icon: "💾" });
  };
  return (
    <SettingsSection title="بياناته">
      <SettingsRow label="الهاتف">
        <input value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ""))} className={cn(smallInputClass, "max-w-xs")} dir="ltr" aria-label="الهاتف" />
      </SettingsRow>
      <SettingsRow label="تاريخ الميلاد">
        <input type="date" value={birth} onChange={(e) => setBirth(e.target.value)} className={cn(smallInputClass, "max-w-xs [color-scheme:dark]")} dir="ltr" aria-label="تاريخ الميلاد" />
      </SettingsRow>
      <SettingsRow label="رقم الباركود" hint="رقم بطاقته.">
        <input value={barcode} onChange={(e) => setBarcode(e.target.value.replace(/\D/g, ""))} className={cn(smallInputClass, "max-w-xs")} dir="ltr" aria-label="رقم الباركود" />
      </SettingsRow>
      <div className="py-4">
        <SaveLine dirty={dirty} onSave={save} label="حفظ البيانات" />
      </div>
    </SettingsSection>
  );
}

/** His account: active, stopped or deleted — each change with its reason, written to his file */
function AccountBox({ r }: { r: CadreRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const router = useRouter();
  const [acting, setActing] = useState<"disable" | "enable" | "delete" | null>(null);
  const [reason, setReason] = useState("");
  const log = (action: string, detail?: string, important = false) => logAdmins(user, "cadre", { action, target: r.name, detail, ref: r.id, important });
  const act = () => {
    const why = reason.trim();
    if (acting === "delete") {
      if (r.place) return toast({ title: "لا يُحذف من في تكتل معتمد", body: `أخرجه من «${r.place.clusterName}» بتعديل استثنائي أولاً.`, tone: "info", icon: "🔒" });
      actions.setCadre("status", r.id, { state: "deleted", reason: why, by: user.name, at: nowMs() });
      logCadre(r.id, r.name, "deleted", user.name, { change: roleName(r.primary), note: why });
      log("حذف فرد من الكادر نهائياً", why, true);
      toast({ title: `حُذف ${r.name}`, body: "لا يظهر في الكادر ولا يُدعى إلى تكتل، ويبقى حدث حذفه في أحداث الكادر.", tone: "info", icon: "🗑️" });
      router.push(CADRE);
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
    <Box title="الحساب">
      <p>{r.status ? <Tag tone="maroon">{r.status.state === "disabled" ? "موقوف" : "محذوف"}</Tag> : <Tag tone="green">فعّال</Tag>}</p>
      {r.status ? (
        <Button size="sm" variant="gold" className="w-full" onClick={() => setActing("enable")}>
          <RotateCcw className="size-4" /> {r.status.state === "deleted" ? "استعادته إلى الكادر" : "تفعيل الحساب"}
        </Button>
      ) : (
        <div className="flex flex-col gap-2">
          <Button size="sm" variant="glass" onClick={() => setActing("disable")}>
            <Ban className="size-4" /> إيقاف الحساب
          </Button>
          <button type="button" onClick={() => setActing("delete")} className="inline-flex items-center gap-1.5 text-xs font-bold text-[#ffb4c8] hover:underline">
            <Trash2 className="size-3.5" /> حذف من الكادر نهائياً
          </button>
        </div>
      )}
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
    </Box>
  );
}

/** How he signs in: his PIN, a new one, sent to his Telegram; and whether Telegram is linked */
function SignInBox({ r }: { r: CadreRow }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const log = (action: string, detail?: string) => logAdmins(user, "cadre", { action, target: r.name, detail, ref: r.id });
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
  return (
    <Box title="الدخول وتيليجرام">
      <p className="text-xs text-white/60">رمز الدخول (PIN)</p>
      <p className="rounded-xl bg-black/20 px-3 py-2 text-center font-display text-lg font-bold tracking-[.3em] text-gold" dir="ltr">
        {r.pin}
      </p>
      <RowActions>
        <RowLink onClick={pin}>رمز جديد</RowLink>
        <RowLink onClick={sendPin}>إرساله عبر تيليجرام</RowLink>
      </RowActions>
      <p className="text-xs text-white/70">
        تيليجرام:{" "}
        {r.chatId ? (
          <>
            <b className="text-green-light">مربوط</b> <span dir="ltr">({r.chatId})</span>{" "}
            <button type="button" onClick={unlink} className="font-bold text-gold hover:underline">
              فك الربط
            </button>
          </>
        ) : (
          <b className="text-gold">غير مربوط — يربطه بنفسه من «الإشعارات» في حسابه</b>
        )}
      </p>
      <p className="text-[11px] leading-5 text-white/50">يدخل الإداري باسمه أو هاتفه ورمز الدخول، أو برقمه الوطني وكلمة مروره.</p>
    </Box>
  );
}

/** What the staff already set on his contact (only that is written back, over the season's records) */
const storedContact = (id: string) => getState().cadre.contact[id] ?? {};

/** The events of one person's file, newest first, and an event written by hand */
function PersonEvents({ r }: { r: CadreRow }) {
  const events = useCadreEvents().filter((e) => e.personId === r.id);
  const [adding, setAdding] = useState(false);
  return (
    <section className="space-y-3">
      <Title action={<AddButton onClick={() => setAdding(true)}>إضافة حدث</AddButton>}>أحداث ملفه</Title>
      <ListTable head={["الحدث", "الموسم", "التاريخ"]} minWidth="30rem">
        {events.length === 0 && <EmptyRow cols={3}>لا أحداث بعد: يُكتب هنا انضمامه إلى تكتل، وكل تعديل على صفته وفئته وفرعه، وما تكتبه بيدك.</EmptyRow>}
        {events.map((e) => (
          <tr key={e.id}>
            <TitleCell title={eventLabel(e.type)} sub={[e.change, e.note, `سجّله ${e.by} — ${fmtDateTime(e.at)}`].filter(Boolean).join(" — ")} />
            <td className="p-3 align-top text-white/70">{e.season ?? "بلا موسم"}</td>
            <td className="whitespace-nowrap p-3 align-top text-white/70" dir="ltr">
              {e.date}
            </td>
          </tr>
        ))}
      </ListTable>
      <AddEvent open={adding} onClose={() => setAdding(false)} person={r} />
    </section>
  );
}

/** An event written by hand in someone's file: for the person given, or one searched by name */
function AddEvent({ open, onClose, person, people }: { open: boolean; onClose: () => void; person?: CadreRow; people?: CadreRow[] }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const season = useFormingSeason();
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
    onClose();
    setChange("");
    setNote("");
    if (!person) {
      setWho("");
      setQ("");
    }
  };
  return (
    <Drawer
      open={open}
      onClose={onClose}
      title={target ? `حدث جديد في ملف ${target.name}` : "حدث جديد"}
      width="max-w-lg"
      footer={
        <Button variant="gold" disabled={!target || (!note.trim() && !change.trim())} onClick={save}>
          حفظ الحدث
        </Button>
      }
    >
      <div className="space-y-3 text-sm">
        {!person && (
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الفرد</span>
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث بالاسم" className={smallInputClass} />
            {matches.length > 0 && (
              <ul className="mt-1 space-y-1">
                {matches.map((m) => (
                  <li key={m.id}>
                    <button
                      type="button"
                      onClick={() => {
                        setWho(m.id);
                        setQ(m.name);
                      }}
                      className={cn("w-full rounded-xl px-3 py-1.5 text-right text-xs ring-1", who === m.id ? "bg-gold/20 ring-gold/50" : "bg-white/5 ring-white/10")}
                    >
                      {m.name} — {roleName(m.primary)}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">نوع الحدث</span>
          <select value={type} onChange={(e) => setType(e.target.value as CadreEventType)} className={selectInput}>
            {(Object.keys(EVENT_TYPES) as CadreEventType[]).map((t) => (
              <option key={t} value={t}>
                {eventLabel(t)}
              </option>
            ))}
          </select>
        </label>
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">تاريخه</span>
            <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={cn(smallInputClass, "[color-scheme:dark]")} dir="ltr" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الموسم</span>
            <select value={ofSeason} onChange={(e) => setOfSeason(e.target.value)} className={selectInput}>
              {[season, season - 1, season - 2].map((y) => (
                <option key={y} value={y}>
                  موسم {y}
                </option>
              ))}
              <option value="">بلا موسم</option>
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">التغيير (اختياري)</span>
          <input value={change} onChange={(e) => setChange(e.target.value)} placeholder="مثال: حلب ← دمشق" className={smallInputClass} />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">التوضيح</span>
          <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} className={textareaClass} />
        </label>
      </div>
    </Drawer>
  );
}

// ───────────────────────── The cadre's events ─────────────────────────

function Events() {
  const events = useCadreEvents();
  const rows = useCadreRows();
  const hrefWith = useHrefWith();
  const [type, setType] = useState("");
  const [ofSeason, setOfSeason] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(80);
  const [adding, setAdding] = useState(false);
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
    <div className="space-y-4">
      <Title action={<AddButton onClick={() => setAdding(true)}>إضافة حدث</AddButton>}>أحداث الكادر</Title>
      <Lead>ملف كل فرد عبر المواسم: انضمامه إلى تكتل، والتعديلات التي مسّته، وما تكتبه الإدارة بيدها.</Lead>
      <div className="grid gap-2 md:grid-cols-[2fr_1fr_1fr_auto]">
        <SearchBox value={q} onChange={setQ} placeholder="الفرد، التغيير، التوضيح، من سجّله" label="بحث في الأحداث" />
        <FilterSelect label="النوع" all="كل الأنواع" value={type} onChange={setType} options={(Object.keys(EVENT_TYPES) as CadreEventType[]).map((t) => ({ value: t, label: `${eventLabel(t)} (${events.filter((e) => e.type === t).length})` }))} />
        <FilterSelect label="الموسم" all="كل المواسم" value={ofSeason} onChange={setOfSeason} options={[...seasons.map((y) => ({ value: String(y), label: `موسم ${y}` })), { value: "none", label: "بلا موسم" }]} />
        <span className="self-center">
          <Tool onClick={exportAll}>
            <Download /> Excel
          </Tool>
        </span>
      </div>
      <ListTable head={["الفرد", "الحدث", "الموسم", "تاريخ الحدث", "سجّله"]} minWidth="56rem">
        {found.length === 0 && <EmptyRow cols={5}>لا أحداث بهذا البحث.</EmptyRow>}
        {found.slice(0, shown).map((e) => (
          <tr key={e.id}>
            <TitleCell title={e.name} href={rows.some((r) => r.id === e.personId) ? hrefWith({ id: e.personId, v: null }) : undefined} />
            <td className="p-3 align-top">
              <p className="font-bold text-white/90">{eventLabel(e.type)}</p>
              {e.change && <p className="text-white/80">{e.change}</p>}
              {e.note && <p className="text-xs leading-6 text-white/60">{e.note}</p>}
            </td>
            <td className="p-3 align-top text-white/70">{e.season ?? "—"}</td>
            <td className="whitespace-nowrap p-3 align-top text-white/80" dir="ltr">
              {e.date}
            </td>
            <td className="p-3 align-top text-xs text-white/60">
              {e.by}
              <span className="block">{fmtDateTime(e.at)}</span>
            </td>
          </tr>
        ))}
      </ListTable>
      {found.length > shown && (
        <Button size="sm" variant="glass" onClick={() => setShown(shown + 120)}>
          عرض المزيد ({found.length - shown})
        </Button>
      )}
      <AddEvent open={adding} onClose={() => setAdding(false)} people={rows.filter((r) => r.status?.state !== "deleted")} />
    </div>
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
    <Drawer
      open={open}
      onClose={onClose}
      title="إضافة فرد إلى الكادر"
      width="max-w-xl"
      footer={
        <Button variant="gold" disabled={!ready} onClick={add}>
          <UserPlus className="size-4" /> إضافة
        </Button>
      }
    >
      <p className="mb-4 text-sm leading-7 text-white/70">بالرقم الوطني من السجل المدني: الاسم والجنس والميلاد منه، والهاتف والصفة والفرع منك.</p>
      <div className="space-y-3 text-sm">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الرقم الوطني</span>
          <input value={id} onChange={(e) => setId(e.target.value.replace(/\D/g, "").slice(0, 11))} className={smallInputClass} dir="ltr" placeholder="11 رقماً" />
        </label>
        {id.length === 11 &&
          (exists ? (
            <p className="rounded-xl bg-gold/15 p-2 text-xs text-gold">
              في الكادر من قبل: {exists.name} — {roleName(exists.primary, s)}.
            </p>
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
        {!genderOk && (
          <p className="text-xs font-bold text-gold">
            صفة «{def?.name}» {def?.gender === "F" ? "للإناث" : "للذكور"}.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">السبب (إلزامي، ويُكتب في أحداث ملفه)</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="مثال: بكتاب فرع حلب رقم 112" />
        </label>
      </div>
    </Drawer>
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
      <p className="mt-1 text-sm leading-7 text-white/70">تصل إلى {linked.length} منهم ربطوا تيليجرام، وتظهر في «الإشعارات» عند كل واحد منهم. صفِّ القائمة أولاً لتختار من تصله.</p>
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
    <div className="space-y-4">
      <Title>رسائل تيليجرام المرسلة</Title>
      <Lead>من «الكادر»: صفِّ القائمة ثم «إرسال تيليجرام»، أو أرسل رمز الدخول لفرد من ملفه.</Lead>
      <ListTable head={["الرسالة", "أرسلها", "الوقت", "وصلت إلى"]}>
        {sent.length === 0 && <EmptyRow cols={4}>لم تُرسل رسالة بعد.</EmptyRow>}
        {[...sent].reverse().map((m) => (
          <tr key={m.id}>
            <td className="p-3 align-top leading-7 text-white">{m.text}</td>
            <td className="p-3 align-top text-white/80">{m.by}</td>
            <td className="whitespace-nowrap p-3 align-top text-xs text-white/60">{fmtDateTime(m.at)}</td>
            <td className="p-3 align-top tabular-nums text-white/80">
              {m.reached.length} من {m.to.length}
            </td>
          </tr>
        ))}
      </ListTable>
    </div>
  );
}

// ───────────────────────── A person's role, category and branches ─────────────────────────

/**
 * One person as the administration sets him, as one form saved once: his base role («الصفة الأساسية», kept from
 * season to season), a seasonal role over it for this season (with a ready label) or none, his category when he
 * leads a group, his branch and extra branches. Saving needs its reason; each part that changed is written to
 * the staff's record and is an event in his file, as it always was.
 */
export function PersonCadre({ id, name, applied, history = true, area = "cadre" }: { id: string; name: string; applied?: string; history?: boolean; area?: Area }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const s = useStructure();
  const cadre = useCadre();
  const season = useFormingSeason();
  const current = seasonalOf(id, cadre);
  const base = primaryOf(id, applied, cadre);
  const storedCategory = categoryOf(id, cadre) ?? "";
  const storedBranches = branchesOf(id, cadre);
  const [primary, setPrimary] = useState(base);
  const [role, setRole] = useState(current?.role ?? "");
  const [label, setLabel] = useState(current?.label ?? "");
  const [category, setCategory] = useState(storedCategory);
  const [branch, setBranch] = useState(branchOf(id, cadre));
  const [extra, setExtra] = useState<string[]>(storedBranches.slice(1));
  const [reason, setReason] = useState("");
  const log = (action: string, before: string, after: string) => logAdmins(user, area, { action, target: name, before, after, detail: reason.trim(), ref: id, important: true });
  const effective = role || primary;
  const leads = !!roleOf(s, effective)?.category || !!roleOf(s, base)?.category || !!categoryOf(id, cadre);
  const catName = (c?: string) => s.categories.find((x) => x.id === c)?.name ?? "—";

  const primaryChanged = primary !== base;
  const roleChanged = role !== (current?.role ?? "") || label !== (current?.label ?? "");
  const categoryChanged = leads && category !== storedCategory;
  const branchesChanged = [branch, ...extra].join() !== storedBranches.join();
  const dirty = primaryChanged || roleChanged || categoryChanged || branchesChanged;

  const save = () => {
    const why = reason.trim();
    const done: string[] = [];
    if (primaryChanged) {
      actions.setCadre("primary", id, primary === applied ? undefined : primary);
      log("تغيير الصفة الأساسية", roleName(base, s), roleName(primary, s));
      logCadre(id, name, "role", user.name, { change: `${roleName(base, s)} ← ${roleName(primary, s)}`, note: why });
      done.push("الصفة الأساسية");
    }
    if (roleChanged) {
      const before = current ? seasonalText(current, s) : "لا صفة موسمية";
      if (!role) {
        actions.setCadre("seasonal", id, null);
        log("سحب صفة موسمية", before, `صفته الأساسية: ${roleName(base, s)}`);
        logCadre(id, name, "seasonal", user.name, { change: `${before} ← بلا صفة موسمية`, note: why });
      } else {
        const g = { role, label: label || undefined, reason: why, by: user.name, at: nowMs() };
        actions.setCadre("seasonal", id, g);
        log("منح صفة موسمية", before, seasonalText(g, s));
        logCadre(id, name, "seasonal", user.name, { change: `${before} ← ${seasonalText(g, s)}`, note: why });
      }
      done.push("الصفة الموسمية");
    }
    if (categoryChanged) {
      actions.setCadre("category", id, category || undefined);
      log("تعديل فئة", catName(storedCategory || undefined), catName(category));
      logCadre(id, name, "category", user.name, { change: `${catName(storedCategory || undefined)} ← ${catName(category)}`, note: why });
      done.push("الفئة");
    }
    if (branchesChanged) {
      const next = [branch, ...extra.filter((b) => b !== branch)];
      actions.setCadre("branches", id, { branch, extra: extra.filter((b) => b !== branch) });
      log("تعديل الفروع", storedBranches.join("، "), next.join("، "));
      logCadre(id, name, "branch", user.name, { change: `${storedBranches.join("، ")} ← ${next.join("، ")}`, note: why });
      done.push("الفروع");
    }
    toast({ title: `حُفظ: ${done.join("، ")}`, body: name, tone: "success", icon: "🏷️" });
    setReason("");
  };

  return (
    <div className="space-y-4 text-sm">
      <p className="text-white/75">
        صفته الأساسية: <b className="text-gold">{roleName(base, s) || "—"}</b>
        {applied && applied !== base && <> (تقدّم هذا الموسم بصفة {roleName(applied, s)})</>}
        {current && (
          <>
            {" "}
            · الموسمية لموسم {season}: <b className="text-gold">{seasonalText(current, s)}</b> — {current.reason}
          </>
        )}
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الصفة الأساسية (تبقى من موسم إلى موسم)</span>
          <select value={primary} onChange={(e) => setPrimary(e.target.value)} className={selectInput}>
            {s.roles
              .filter((r) => r.active || r.key === primary)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الصفة الموسمية (لموسم {season} وحده)</span>
          <select
            value={role}
            onChange={(e) => {
              setRole(e.target.value);
              setLabel("");
            }}
            className={selectInput}
          >
            <option value="">— لا صفة موسمية —</option>
            {s.roles
              .filter((r) => r.active || r.key === role)
              .map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name}
                </option>
              ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">التسمية المعروضة مع الموسمية</span>
          <select value={label} onChange={(e) => setLabel(e.target.value)} disabled={!role} className={selectInput}>
            <option value="">— بلا تسمية —</option>
            {s.labels
              .filter((l) => l.active && l.base === role)
              .map((l) => (
                <option key={l.id} value={l.label}>
                  {l.label}
                </option>
              ))}
          </select>
        </label>
        {leads && (
          <label className="block">
            <span className="mb-1 block text-xs text-white/60">الفئة (فئة مجموعته)</span>
            <select value={category} onChange={(e) => setCategory(e.target.value)} className={selectInput}>
              <option value="">— لا فئة —</option>
              {s.categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
        )}
        <label className="block">
          <span className="mb-1 block text-xs text-white/60">الفرع</span>
          <select value={branch} onChange={(e) => setBranch(e.target.value)} className={selectInput}>
            {s.branches
              .filter((b) => b.active || b.name === branch)
              .map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name}
                </option>
              ))}
          </select>
        </label>
      </div>
      <fieldset>
        <legend className="mb-1 text-xs text-white/60">الفروع الإضافية</legend>
        <div className="flex flex-wrap gap-2">
          {s.branches
            .filter((b) => b.active && b.name !== branch)
            .map((b) => (
              <label key={b.id} className={cn("flex cursor-pointer items-center gap-1.5 rounded-full px-3 py-1 text-xs ring-1", extra.includes(b.name) ? "bg-gold/20 text-gold ring-gold/40" : "bg-white/5 text-white/70 ring-white/15")}>
                <input type="checkbox" checked={extra.includes(b.name)} onChange={(e) => setExtra(e.target.checked ? [...extra, b.name] : extra.filter((x) => x !== b.name))} className="size-3.5 accent-[#D9C89E]" /> {b.name}
              </label>
            ))}
        </div>
      </fieldset>
      {dirty && (
        <label className="block">
          <span className="mb-1 block text-xs font-bold text-gold">سبب التعديل (إلزامي، ويُكتب في أحداث ملفه)</span>
          <textarea rows={2} value={reason} onChange={(e) => setReason(e.target.value)} className={textareaClass} placeholder="مثال: اتحاد مع مجموعة أخرى — بناءً على كتاب تشكيل التكتلات" />
        </label>
      )}
      <SaveLine dirty={dirty} disabled={reason.trim().length < 3} onSave={save} note={dirty && reason.trim().length < 3 ? "اكتب السبب ثم احفظ." : undefined} />
      {history && <RecordHistory system="admins" refId={id} />}
    </div>
  );
}
