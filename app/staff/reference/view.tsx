"use client";

import { CopyPlus, Database, Lock, Plus, Save } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import {
  CITY_LABEL,
  CURRENT_SEASON,
  MASHAER_LABEL,
  campName,
  fileTypeOf,
  fullName,
  matches,
  newId,
  opsActions,
  placeIndex,
  rolesAt,
  staffIn,
  useEmployees,
  useOpFiles,
  useRefs,
  type Camp,
  type Center,
  type City,
  type Hotel,
  type Mashaer,
  type RefKind,
  type Sector,
} from "@/lib/ops";
import { can } from "@/lib/staff";
import { cn, digitsOnly, formatNumber } from "@/lib/utils";
import { Drawer, Gate, PageHeader, Tabs, logAs, useStaffUser } from "../_components/kit";
import { Field, SearchBox, fieldClass, selectClass } from "../_components/ops-ui";
import { AddButton, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { FilterLinks, HowTo, ListToolbar, type FilterItem } from "../employees/list-ui";

export function ReferenceView() {
  return (
    <Gate perms={["ops.files"]}>
      <Reference />
    </Gate>
  );
}

type Tab = "hotels" | "sectors" | "centers" | "camps";
/** The views of a list: all its live entries, those of one city or holy site, or the archived ones */
type View = "all" | City | Mashaer | "archived";
type Item = Hotel | Sector | Center | Camp;
const SEASONS = [CURRENT_SEASON, CURRENT_SEASON - 1];
const KIND: Record<Tab, RefKind> = {
  hotels: "hotel",
  sectors: "sector",
  centers: "center",
  camps: "camp",
};
const NOUN: Record<Tab, { one: string; many: string }> = {
  hotels: { one: "فندق", many: "الفنادق" },
  sectors: { one: "قطاع", many: "القطاعات" },
  centers: { one: "مركز", many: "المراكز" },
  camps: { one: "مخيم", many: "المخيمات" },
};

type Use = {
  file: string;
  parent?: string;
  lead?: string;
  pilgrims: number;
  staff: number;
};

/**
 * البيانات المرجعية: the season's lists that operational files choose from instead of typing — the
 * hotels and sectors of Makkah for the housing file, the centres and camps of Mina and Arafat for the
 * camp files — each a list as a site's admin shows one: its views with their counts, a search, a table
 * whose rows open their side sheet on the name, with «تعديل | أرشفة» under it. Each season has its own
 * lists (contracts are renewed yearly); last season's stay as a read-only archive and anything in them
 * can be carried into this season in one step.
 */
function Reference() {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useRefs();
  const files = useOpFiles();
  const employees = useEmployees();

  const [season, setSeason] = useState(CURRENT_SEASON);
  const [tab, setTab] = useState<Tab>("hotels");
  const [view, setView] = useState<View>("all");
  const [q, setQ] = useState("");
  const [editHotel, setEditHotel] = useState<Hotel | null>(null);
  const [editSector, setEditSector] = useState<Sector | null>(null);
  const [editCenter, setEditCenter] = useState<Center | null>(null);
  const [editCamp, setEditCamp] = useState<Camp | null>(null);
  const [importing, setImporting] = useState(false);

  const editable = season === CURRENT_SEASON && can(user, "ops.files");
  const places = placeIndex(refs);

  /** Where each entry is used in the season's operational files */
  const use = useMemo(() => {
    const m = new Map<string, Use>();
    const who = (id?: string) => {
      const e = employees.find((x) => x.id === id);
      return e ? fullName(e) : undefined;
    };
    for (const f of files.filter((x) => x.season === season)) {
      const type = fileTypeOf(f.type);
      const outerLead = rolesAt(type, "outer").find((r) => r.required)?.code;
      const innerLead = rolesAt(type, "inner").find((r) => r.required)?.code;
      for (const o of f.nodes) {
        m.set(o.refId, {
          file: type.short,
          lead: who(o.members.find((x) => x.role === outerLead)?.employeeId),
          pilgrims: o.children.reduce((a, c) => a + c.pilgrims, 0),
          staff: o.children.length,
        });
        for (const c of o.children) {
          m.set(c.refId, {
            file: type.short,
            parent: places.get(o.refId)?.name,
            lead: who(c.members.find((x) => x.role === innerLead)?.employeeId),
            pilgrims: c.pilgrims,
            staff: staffIn(f, c.refId),
          });
        }
      }
    }
    return m;
  }, [files, season, employees, places]);

  const live = <T extends { season: number; archived?: boolean }>(l: T[]) => l.filter((x) => x.season === season && !x.archived);
  const archivedOf = <T extends { season: number; archived?: boolean }>(l: T[]) => l.filter((x) => x.season === season && x.archived);
  /** The entries of the view chosen: the archived ones, or the live ones of a city / holy site (or all) */
  const shownOf = <T extends { season: number; archived?: boolean }>(l: T[], groupOf?: (x: T) => string) => (view === "archived" ? archivedOf(l) : live(l).filter((x) => view === "all" || !groupOf || groupOf(x) === view));

  const hit = (id: string, extra: (string | number | undefined)[]) => matches(q, [places.get(id)?.name, places.get(id)?.sub, use.get(id)?.parent, use.get(id)?.lead, ...extra]);
  const byMina = (a: { mashaer: Mashaer }, b: { mashaer: Mashaer }) => Number(a.mashaer !== "mina") - Number(b.mashaer !== "mina");
  const rows = {
    hotels: shownOf(refs.hotels, (h) => h.city)
      .filter((h) => hit(h.id, [h.licence, CITY_LABEL[h.city]]))
      .sort((a, b) => Number(a.city !== "makkah") - Number(b.city !== "makkah") || Number(!use.has(a.id)) - Number(!use.has(b.id)) || a.name.localeCompare(b.name, "ar")),
    sectors: shownOf(refs.sectors)
      .filter((s) => hit(s.id, [s.zone]))
      .sort((a, b) => a.order - b.order),
    centers: shownOf(refs.centers, (c) => c.mashaer)
      .filter((c) => hit(c.id, [MASHAER_LABEL[c.mashaer], c.company]))
      .sort((a, b) => byMina(a, b) || a.order - b.order),
    camps: shownOf(refs.camps, (c) => c.mashaer)
      .filter((c) => hit(c.id, [c.number, MASHAER_LABEL[c.mashaer]]))
      .sort((a, b) => byMina(a, b) || Number(a.number) - Number(b.number)),
  };

  // The counts beside the views, and the contracted capacity they add up to
  const liveHotels = live(refs.hotels);
  const makkahBeds = liveHotels.filter((h) => h.city === "makkah").reduce((a, h) => a + h.capacity, 0);
  const campSeats = live(refs.camps).reduce((a, c) => a + c.capacity, 0);
  const list: { season: number; archived?: boolean }[] = { hotels: refs.hotels, sectors: refs.sectors, centers: refs.centers, camps: refs.camps }[tab];
  const sites: { season: number; archived?: boolean; mashaer: Mashaer }[] = tab === "centers" ? refs.centers : refs.camps;
  const views: FilterItem<View>[] = [
    { value: "all", label: "الكل", count: live(list).length },
    ...(tab === "hotels"
      ? [
          { value: "makkah" as const, label: "مكة المكرمة", count: liveHotels.filter((h) => h.city === "makkah").length },
          { value: "madinah" as const, label: "المدينة المنورة", count: liveHotels.filter((h) => h.city === "madinah").length },
        ]
      : tab === "centers" || tab === "camps"
        ? (["mina", "arafat"] as const).map((m) => ({ value: m, label: MASHAER_LABEL[m], count: live(sites).filter((c) => c.mashaer === m).length }))
        : []),
    { value: "archived", label: "المؤرشف", count: archivedOf(list).length },
  ];

  const archive = (tab: Tab, item: Item) => {
    const label = places.get(item.id)?.name ?? "";
    if (!item.archived && use.get(item.id)) {
      toast({
        title: "مستخدم في ملف تشغيلي",
        body: `${label} داخل ملف «${use.get(item.id)!.file}» لموسم ${season}. أزله من الملف أولاً ثم أرشفه.`,
        tone: "warning",
        icon: "⚠️",
      });
      return;
    }
    const next = { ...item, archived: !item.archived || undefined };
    if (tab === "hotels") opsActions.saveHotel(next as Hotel);
    if (tab === "sectors") opsActions.saveSector(next as Sector);
    if (tab === "centers") opsActions.saveCenter(next as Center);
    if (tab === "camps") opsActions.saveCamp(next as Camp);
    logAs(user, {
      action: item.archived ? "إعادة عنصر مرجعي من الأرشيف" : "أرشفة عنصر مرجعي",
      target: label,
      detail: `${NOUN[tab].many} — موسم ${season}`,
    });
  };

  const saved = (tab: Tab, isNew: boolean, name: string, detail: string) => {
    logAs(user, {
      action: isNew ? `إضافة ${NOUN[tab].one} إلى البيانات المرجعية` : `تعديل ${NOUN[tab].one} في البيانات المرجعية`,
      target: name,
      detail: `${detail} — موسم ${season}`,
    });
    toast({
      title: isNew ? "أُضيف إلى القائمة" : "حُفظت التعديلات",
      body: name,
      tone: "success",
      icon: "✅",
    });
  };

  // A new entry starts in the city / holy site of the view chosen
  const group = view === "all" || view === "archived" ? "" : view;
  const addNew = () => {
    if (tab === "hotels")
      setEditHotel({
        id: "",
        season,
        name: "",
        city: (group as City) || "makkah",
        area: "",
        distance: "",
        capacity: 400,
        licence: "",
      });
    if (tab === "sectors")
      setEditSector({
        id: "",
        season,
        name: "",
        zone: "",
        order: live(refs.sectors).length + 1,
      });
    if (tab === "centers") {
      const m = (group as Mashaer) || "mina";
      const next =
        Math.max(
          9,
          ...live(refs.centers)
            .filter((c) => c.mashaer === m)
            .map((c) => c.order),
        ) + 1;
      setEditCenter({
        id: "",
        season,
        name: `مركز ${next}`,
        mashaer: m,
        order: next,
      });
    }
    if (tab === "camps")
      setEditCamp({
        id: "",
        season,
        number: "",
        mashaer: (group as Mashaer) || "mina",
        capacity: 450,
        location: "",
      });
  };

  /** The entry's name — a link to its sheet when it can be edited — and «تعديل | أرشفة» under it */
  const title = (item: Item, name: string, sub: ReactNode, onEdit: () => void) => (
    <>
      {editable ? (
        <button type="button" onClick={onEdit} className="text-right font-bold text-white hover:text-gold">
          {name}
        </button>
      ) : (
        <p className="font-bold text-white">{name}</p>
      )}
      <p className="text-xs text-white/55">{sub}</p>
      {editable && (
        <RowActions>
          <RowLink onClick={onEdit}>تعديل</RowLink>
          <RowLink danger={!item.archived} onClick={() => archive(tab, item)}>
            {item.archived ? "إعادة من الأرشيف" : "أرشفة"}
          </RowLink>
        </RowActions>
      )}
    </>
  );

  const usageCell = (id: string, archived: boolean | undefined, offered: boolean) => {
    const u = use.get(id);
    if (u)
      return (
        <>
          <Tag tone="gold">{u.parent ?? u.file}</Tag>
          <p className="mt-1 text-[11px] text-white/60">{u.lead ? u.lead : "بلا مسؤول بعد"}</p>
        </>
      );
    if (archived) return <Tag>مؤرشف</Tag>;
    return offered ? <span className="text-xs font-bold text-white/85">متاح للإضافة</span> : <span className="text-xs text-white/40">—</span>;
  };

  const capacityCell = (id: string, capacity: number) => {
    const u = use.get(id);
    const load = u ? u.pilgrims + u.staff : 0;
    return (
      <>
        <p className="font-bold tabular-nums text-white">{formatNumber(capacity)}</p>
        {u && <p className={cn("text-[11px] tabular-nums", load > capacity ? "font-bold text-[#ffb4c8]" : "text-white/55")}>مشغول {formatNumber(load)}</p>}
      </>
    );
  };

  /** What a sector / centre holds in the season's file, and who leads it */
  const nodeCells = (id: string, children: string, leadRole: string) => {
    const u = use.get(id);
    return u ? (
      <>
        <td className="p-3 text-white/85">
          <span className="font-bold tabular-nums text-white">{u.staff}</span> {children} · <span className="font-bold tabular-nums text-white">{formatNumber(u.pilgrims)}</span> حاجاً
        </td>
        <td className="p-3">{u.lead ? <span className="font-bold text-gold">{u.lead}</span> : <span className="text-xs font-bold text-[#ffb4c8]">{leadRole}: لم يُحدَّد بعد</span>}</td>
      </>
    ) : (
      <td colSpan={2} className="p-3 text-xs text-white/50">
        غير مستخدم في ملفات هذا الموسم.
      </td>
    );
  };

  const empty = q ? "لا شيء يطابق البحث." : view === "archived" ? "لا شيء مؤرشف." : `لا ${NOUN[tab].many} في هذه القائمة بعد.`;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="الملفات التشغيلية"
        icon={<Database />}
        title="البيانات المرجعية"
        description="قوائم الموسم التي تختار منها الملفات التشغيلية: الفنادق والقطاعات والمراكز والمخيمات."
        actions={
          <Tabs
            id="ref-season"
            value={String(season)}
            onChange={(v) => setSeason(Number(v))}
            tabs={SEASONS.map((y) => ({
              value: String(y),
              label: y === CURRENT_SEASON ? `موسم ${y} — الحالي` : `موسم ${y} — أرشيف`,
            }))}
          />
        }
      />

      {!editable && (
        <p className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15">
          <Lock className="size-4 shrink-0 text-gold" />
          {season === CURRENT_SEASON
            ? "للاطلاع فقط: التعديل يحتاج صلاحية الملفات التشغيلية."
            : `قوائم موسم ${season} محفوظة للرجوع إليها ولا تُعدّل. يمكنك نقل ما تحتاجه منها إلى موسم ${CURRENT_SEASON}.`}
        </p>
      )}

      {/* The four lists, and «إضافة …» to the one open */}
      <div className="flex flex-wrap items-center gap-3">
        <Tabs<Tab>
          id="ref-tab"
          value={tab}
          onChange={(v) => {
            setTab(v);
            setView("all");
          }}
          tabs={[
            { value: "hotels", label: "الفنادق", count: live(refs.hotels).length },
            { value: "sectors", label: "القطاعات", count: live(refs.sectors).length },
            { value: "centers", label: "المراكز", count: live(refs.centers).length },
            { value: "camps", label: "المخيمات", count: live(refs.camps).length },
          ]}
        />
        {editable && (
          <>
            <AddButton onClick={addNew}>
              <Plus className="size-4" /> إضافة {NOUN[tab].one}
            </AddButton>
            <button type="button" onClick={() => setImporting(true)} className="inline-flex items-center gap-1.5 text-sm font-bold text-white/70 hover:text-white hover:underline">
              <CopyPlus className="size-4" /> نقل من موسم {CURRENT_SEASON - 1}
            </button>
          </>
        )}
      </div>

      <div>
        <ListToolbar
          filters={
            <>
              <FilterLinks<View> label={`عرض ${NOUN[tab].many}`} value={view} onChange={setView} items={views} />
              {tab === "hotels" && <p className="mt-1 text-xs text-white/55">فنادق مكة المكرمة: {formatNumber(makkahBeds)} سرير متعاقد عليه.</p>}
              {tab === "camps" && <p className="mt-1 text-xs text-white/55">طاقة المخيمات: {formatNumber(campSeats)} حاج.</p>}
            </>
          }
        >
          <SearchBox
            className="flex-1"
            value={q}
            onChange={setQ}
            label="بحث"
            placeholder={tab === "camps" ? "رقم المخيم، الموقع، المركز..." : tab === "hotels" ? "اسم الفندق، الحي، رقم الترخيص، القطاع..." : "الاسم، المسؤول..."}
          />
        </ListToolbar>

        {tab === "hotels" && (
          <ListTable head={["الفندق", "الموقع", "عن الحرم", "الطاقة", "في ملف التسكين"]} minWidth="52rem">
            {rows.hotels.length === 0 ? (
              <EmptyRow cols={5}>{empty}</EmptyRow>
            ) : (
              rows.hotels.map((h) => (
                <tr key={h.id} className={cn("align-top", h.archived && "opacity-60")}>
                  <td className="p-3">
                    {title(
                      h,
                      h.name,
                      <span className="tabular-nums">
                        ترخيص {h.licence || "—"}
                        {h.floors ? ` · ${h.floors} طابقاً` : ""}
                      </span>,
                      () => setEditHotel(h),
                    )}
                  </td>
                  <td className="p-3">
                    <p className="text-white/90">{h.area}</p>
                    <p className="text-xs text-white/55">{CITY_LABEL[h.city]}</p>
                  </td>
                  <td className="p-3 text-white/85">{h.distance}</td>
                  <td className="p-3">{capacityCell(h.id, h.capacity)}</td>
                  <td className="p-3">{usageCell(h.id, h.archived, h.city === "makkah")}</td>
                </tr>
              ))
            )}
          </ListTable>
        )}

        {tab === "sectors" && (
          <ListTable head={["القطاع", "الترتيب", "في ملف التسكين", "رئيس القطاع"]}>
            {rows.sectors.length === 0 ? (
              <EmptyRow cols={4}>{empty}</EmptyRow>
            ) : (
              rows.sectors.map((s) => (
                <tr key={s.id} className={cn("align-top", s.archived && "opacity-60")}>
                  <td className="p-3">{title(s, s.name, s.zone || "—", () => setEditSector(s))}</td>
                  <td className="p-3 font-display font-bold tabular-nums text-gold">{s.order}</td>
                  {nodeCells(s.id, "أبراج", "رئيس القطاع")}
                </tr>
              ))
            )}
          </ListTable>
        )}

        {tab === "centers" && (
          <ListTable head={["المركز", "الترتيب", "في ملف المخيمات", "المشرف"]}>
            {rows.centers.length === 0 ? (
              <EmptyRow cols={4}>{empty}</EmptyRow>
            ) : (
              rows.centers.map((c) => (
                <tr key={c.id} className={cn("align-top", c.archived && "opacity-60")}>
                  <td className="p-3">{title(c, c.name, `${MASHAER_LABEL[c.mashaer]}${c.company ? ` · ${c.company}` : ""}`, () => setEditCenter(c))}</td>
                  <td className="p-3 font-display font-bold tabular-nums text-gold">{c.order}</td>
                  {nodeCells(c.id, "مخيمات", "المشرف")}
                </tr>
              ))
            )}
          </ListTable>
        )}

        {tab === "camps" && (
          <ListTable head={["المخيم", "الموقع", "الطاقة", "المركز في الملف"]}>
            {rows.camps.length === 0 ? (
              <EmptyRow cols={4}>{empty}</EmptyRow>
            ) : (
              rows.camps.map((c) => (
                <tr key={c.id} className={cn("align-top", c.archived && "opacity-60")}>
                  <td className="p-3">{title(c, campName(c), MASHAER_LABEL[c.mashaer], () => setEditCamp(c))}</td>
                  <td className="p-3 text-white/85">{c.location}</td>
                  <td className="p-3">{capacityCell(c.id, c.capacity)}</td>
                  <td className="p-3">{usageCell(c.id, c.archived, true)}</td>
                </tr>
              ))
            )}
          </ListTable>
        )}
      </div>

      <HowTo>
        <p>فنادق مكة المكرمة والمدينة المنورة وقطاعات مكة لملف التسكين، ومراكز منى وعرفات ومخيماتهما لملفَي المخيمات. تختار منها الملفات التشغيلية بدل كتابتها يدوياً.</p>
        <p>لكل موسم قوائمه، لأن العقود تتغير من عام إلى عام. «نقل من موسم {CURRENT_SEASON - 1}» ينسخ ما جدّدتم التعاقد عليه إلى قائمة هذا الموسم.</p>
        <p>الأرشفة تُخفي العنصر من قوائم الاختيار دون أن تمسّ الملفات القديمة التي استعملته. ولا يُؤرشف عنصر ما زال في ملف تشغيلي.</p>
      </HowTo>

      <Drawer open={!!editHotel} onClose={() => setEditHotel(null)} title={editHotel?.id ? `تعديل: ${editHotel.name}` : "إضافة فندق"}>
        {editHotel && (
          <HotelForm
            initial={editHotel}
            taken={live(refs.hotels)
              .filter((h) => h.id !== editHotel.id)
              .map((h) => h.name)}
            onCancel={() => setEditHotel(null)}
            onSave={(h) => {
              const item = {
                ...h,
                id: h.id || newId(`${h.city === "makkah" ? "mk" : "md"}${season % 100}`),
              };
              opsActions.saveHotel(item);
              saved("hotels", !h.id, item.name, `${CITY_LABEL[item.city]} — الطاقة ${item.capacity}`);
              setEditHotel(null);
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!editSector} onClose={() => setEditSector(null)} title={editSector?.id ? `تعديل: ${editSector.name}` : "إضافة قطاع"} width="max-w-lg">
        {editSector && (
          <SectorForm
            initial={editSector}
            taken={live(refs.sectors)
              .filter((s) => s.id !== editSector.id)
              .map((s) => s.name)}
            onCancel={() => setEditSector(null)}
            onSave={(s) => {
              const item = { ...s, id: s.id || newId(`sc${season % 100}`) };
              opsActions.saveSector(item);
              saved("sectors", !s.id, item.name, item.zone);
              setEditSector(null);
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!editCenter} onClose={() => setEditCenter(null)} title={editCenter?.id ? `تعديل: ${editCenter.name}` : "إضافة مركز"} width="max-w-lg">
        {editCenter && (
          <CenterForm
            initial={editCenter}
            taken={live(refs.centers)
              .filter((c) => c.id !== editCenter.id)
              .map((c) => `${c.mashaer}:${c.name}`)}
            onCancel={() => setEditCenter(null)}
            onSave={(c) => {
              const item = { ...c, id: c.id || newId(`ce${season % 100}`) };
              opsActions.saveCenter(item);
              saved("centers", !c.id, `${item.name} — ${MASHAER_LABEL[item.mashaer]}`, item.company ?? "");
              setEditCenter(null);
            }}
          />
        )}
      </Drawer>

      <Drawer open={!!editCamp} onClose={() => setEditCamp(null)} title={editCamp?.id ? `تعديل: ${campName(editCamp)}` : "إضافة مخيم"} width="max-w-lg">
        {editCamp && (
          <CampForm
            initial={editCamp}
            taken={live(refs.camps)
              .filter((c) => c.id !== editCamp.id)
              .map((c) => `${c.mashaer}:${c.number}`)}
            onCancel={() => setEditCamp(null)}
            onSave={(c) => {
              const item = { ...c, id: c.id || newId(`cp${season % 100}`) };
              opsActions.saveCamp(item);
              saved("camps", !c.id, `${campName(item)} — ${MASHAER_LABEL[item.mashaer]}`, `الطاقة ${item.capacity}`);
              setEditCamp(null);
            }}
          />
        )}
      </Drawer>

      <ImportModal key={tab} open={importing} onClose={() => setImporting(false)} tab={tab} />
    </div>
  );
}

const err = (show: unknown, text: string) => (show ? <span className="mt-1 block text-[11px] font-bold text-[#ffb4c8]">{text}</span> : null);

function FormFooter({ onCancel, disabled }: { onCancel: () => void; disabled?: boolean }) {
  return (
    <div className="flex justify-end gap-2 border-t border-white/10 pt-4">
      <Button type="button" variant="glass" onClick={onCancel}>
        إلغاء
      </Button>
      <Button type="submit" variant="gold" disabled={disabled}>
        <Save className="size-4" /> حفظ
      </Button>
    </div>
  );
}

function HotelForm({ initial, taken, onSave, onCancel }: { initial: Hotel; taken: string[]; onSave: (h: Hotel) => void; onCancel: () => void }) {
  const [h, setH] = useState(initial);
  const [tried, setTried] = useState(false);
  const set = <K extends keyof Hotel>(k: K, v: Hotel[K]) => setH((x) => ({ ...x, [k]: v }));
  const dup = taken.includes(h.name.trim());
  const valid = h.name.trim() && h.area.trim() && h.capacity > 0 && !dup;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid) onSave({ ...h, name: h.name.trim(), area: h.area.trim() });
      }}
    >
      <Field label="اسم الفندق">
        <input value={h.name} onChange={(e) => set("name", e.target.value)} className={fieldClass} autoFocus />
        {err(tried && !h.name.trim(), "مطلوب")}
        {err(dup, "يوجد فندق بهذا الاسم في هذا الموسم")}
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="المدينة">
          <select value={h.city} onChange={(e) => set("city", e.target.value as City)} className={selectClass}>
            <option value="makkah">مكة المكرمة</option>
            <option value="madinah">المدينة المنورة</option>
          </select>
        </Field>
        <Field label="الحي">
          <input value={h.area} onChange={(e) => set("area", e.target.value)} className={fieldClass} />
          {err(tried && !h.area.trim(), "مطلوب")}
        </Field>
        <Field label="المسافة عن الحرم" hint="كما في العقد، مثل: 3.4 كم أو 450 م">
          <input value={h.distance} onChange={(e) => set("distance", e.target.value)} className={fieldClass} />
        </Field>
        <Field label="الطاقة الاستيعابية" hint="عدد الأسرّة المتعاقد عليها هذا الموسم">
          <input type="number" min={1} value={h.capacity} onChange={(e) => set("capacity", Number(e.target.value))} className={cn(fieldClass, "tabular-nums")} dir="ltr" />
        </Field>
        <Field label="رقم الترخيص">
          <input value={h.licence} onChange={(e) => set("licence", digitsOnly(e.target.value))} className={cn(fieldClass, "tabular-nums")} dir="ltr" />
        </Field>
        <Field label="عدد الطوابق">
          <input
            type="number"
            min={1}
            value={h.floors ?? ""}
            onChange={(e) => set("floors", e.target.value ? Number(e.target.value) : undefined)}
            className={cn(fieldClass, "tabular-nums")}
            dir="ltr"
          />
        </Field>
      </div>
      <Field label="رابط الموقع على الخريطة">
        <input value={h.mapUrl ?? ""} onChange={(e) => set("mapUrl", e.target.value || undefined)} placeholder="https://maps.google.com/..." className={fieldClass} dir="ltr" />
      </Field>
      <FormFooter onCancel={onCancel} />
    </form>
  );
}

function SectorForm({ initial, taken, onSave, onCancel }: { initial: Sector; taken: string[]; onSave: (s: Sector) => void; onCancel: () => void }) {
  const [s, setS] = useState(initial);
  const dup = taken.includes(s.name.trim());
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (s.name.trim() && !dup) onSave({ ...s, name: s.name.trim(), zone: s.zone.trim() });
      }}
    >
      <Field label="اسم القطاع" hint="مثل: القطاع السادس">
        <input value={s.name} onChange={(e) => setS({ ...s, name: e.target.value })} className={fieldClass} autoFocus />
        {err(dup, "يوجد قطاع بهذا الاسم في هذا الموسم")}
      </Field>
      <Field label="الأحياء التي يغطيها">
        <input value={s.zone} onChange={(e) => setS({ ...s, zone: e.target.value })} className={fieldClass} />
      </Field>
      <Field label="الترتيب">
        <input type="number" min={1} value={s.order} onChange={(e) => setS({ ...s, order: Number(e.target.value) })} className={cn(fieldClass, "tabular-nums")} dir="ltr" />
      </Field>
      <FormFooter onCancel={onCancel} disabled={!s.name.trim() || dup} />
    </form>
  );
}

function CenterForm({ initial, taken, onSave, onCancel }: { initial: Center; taken: string[]; onSave: (c: Center) => void; onCancel: () => void }) {
  const [c, setC] = useState(initial);
  const dup = taken.includes(`${c.mashaer}:${c.name.trim()}`);
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (c.name.trim() && !dup)
          onSave({
            ...c,
            name: c.name.trim(),
            company: c.company?.trim() || undefined,
          });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="المشعر">
          <select value={c.mashaer} onChange={(e) => setC({ ...c, mashaer: e.target.value as Mashaer })} className={selectClass}>
            <option value="mina">منى</option>
            <option value="arafat">عرفات</option>
          </select>
        </Field>
        <Field label="رقم المركز" hint="يُكتب الاسم منه: مركز 17">
          <input
            type="number"
            min={1}
            value={c.order}
            onChange={(e) =>
              setC({
                ...c,
                order: Number(e.target.value),
                name: `مركز ${e.target.value}`,
              })
            }
            className={cn(fieldClass, "tabular-nums")}
            dir="ltr"
            autoFocus
          />
          {err(dup, "هذا المركز موجود في المشعر نفسه")}
        </Field>
      </div>
      <Field label="الشركة المقدّمة للخدمة" hint="مطوّف المركز أو شركة الخدمة لهذا الموسم">
        <input value={c.company ?? ""} onChange={(e) => setC({ ...c, company: e.target.value })} className={fieldClass} />
      </Field>
      <FormFooter onCancel={onCancel} disabled={!c.name.trim() || dup} />
    </form>
  );
}

function CampForm({ initial, taken, onSave, onCancel }: { initial: Camp; taken: string[]; onSave: (c: Camp) => void; onCancel: () => void }) {
  const [c, setC] = useState(initial);
  const [tried, setTried] = useState(false);
  const dup = taken.includes(`${c.mashaer}:${c.number.trim()}`);
  const valid = c.number.trim() && c.capacity > 0 && !dup;
  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        setTried(true);
        if (valid)
          onSave({
            ...c,
            number: c.number.trim(),
            location: c.location.trim(),
          });
      }}
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="المشعر">
          <select value={c.mashaer} onChange={(e) => setC({ ...c, mashaer: e.target.value as Mashaer })} className={selectClass}>
            <option value="mina">منى</option>
            <option value="arafat">عرفات</option>
          </select>
        </Field>
        <Field label="رقم المخيم">
          <input value={c.number} onChange={(e) => setC({ ...c, number: e.target.value.replace(/[^\d]/g, "") })} className={cn(fieldClass, "tabular-nums")} dir="ltr" autoFocus />
          {err(tried && !c.number.trim(), "مطلوب")}
          {err(dup, "هذا المخيم موجود في المشعر نفسه")}
        </Field>
      </div>
      <Field label="الطاقة الاستيعابية" hint="عدد الحجاج الذي يتسع له المخيم في عقد هذا الموسم — عليه يقوم التوزيع">
        <input type="number" min={1} value={c.capacity} onChange={(e) => setC({ ...c, capacity: Number(e.target.value) })} className={cn(fieldClass, "tabular-nums")} dir="ltr" />
      </Field>
      <Field label="موقع المخيم">
        <input value={c.location} onChange={(e) => setC({ ...c, location: e.target.value })} className={fieldClass} placeholder="مثل: منى — المعيصم، المربع 7" />
      </Field>
      <Field label="رابط الموقع على الخريطة">
        <input value={c.mapUrl ?? ""} onChange={(e) => setC({ ...c, mapUrl: e.target.value || undefined })} placeholder="https://maps.google.com/..." className={fieldClass} dir="ltr" />
      </Field>
      <FormFooter onCancel={onCancel} />
    </form>
  );
}

/** Carry chosen entries from last season's list into this one (as new, editable copies) */
function ImportModal({ open, onClose, tab }: { open: boolean; onClose: () => void; tab: Tab }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useRefs();
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const prev = CURRENT_SEASON - 1;
  const places = placeIndex(refs);
  const kind = KIND[tab];
  const present = new Set([...places.values()].filter((p) => p.season === CURRENT_SEASON).map((p) => p.key));
  const source = [...places.values()].filter((p) => p.kind === kind && p.season === prev && !p.archived && !present.has(p.key));

  const toggle = (id: string) => setPicked((p) => (p.has(id) ? new Set([...p].filter((x) => x !== id)) : new Set([...p, id])));
  const run = () => {
    const ids = source.filter((x) => picked.has(x.id)).map((x) => x.id);
    const s = CURRENT_SEASON;
    if (tab === "hotels")
      opsActions.saveHotels(
        refs.hotels
          .filter((h) => ids.includes(h.id))
          .map((h) => ({
            ...h,
            id: newId(`${h.city === "makkah" ? "mk" : "md"}${s % 100}`),
            season: s,
          })),
      );
    if (tab === "sectors") {
      const n = refs.sectors.filter((x) => x.season === s).length;
      opsActions.saveSectors(
        refs.sectors
          .filter((x) => ids.includes(x.id))
          .map((x, i) => ({
            ...x,
            id: newId(`sc${s % 100}`),
            season: s,
            order: n + i + 1,
          })),
      );
    }
    if (tab === "centers") opsActions.saveCenters(refs.centers.filter((x) => ids.includes(x.id)).map((x) => ({ ...x, id: newId(`ce${s % 100}`), season: s })));
    if (tab === "camps") opsActions.saveCamps(refs.camps.filter((x) => ids.includes(x.id)).map((x) => ({ ...x, id: newId(`cp${s % 100}`), season: s })));
    logAs(user, {
      action: `نقل عناصر مرجعية من موسم ${prev}`,
      target: NOUN[tab].many,
      detail: source
        .filter((x) => picked.has(x.id))
        .map((x) => x.name)
        .join("، "),
    });
    toast({
      title: `نُقل ${ids.length} إلى موسم ${s}`,
      body: "راجع الطاقة والتفاصيل لأنها قد تتغير في عقد هذا العام.",
      tone: "success",
      icon: "📥",
    });
    setPicked(new Set());
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <h3 className="font-display text-2xl font-bold text-green-dark">
        نقل {NOUN[tab].many} من موسم {prev}
      </h3>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        تظهر هنا العناصر التي كانت في موسم {prev} وليست في موسم {CURRENT_SEASON}. اختر ما تجدّد التعاقد عليه لتُنسخ إلى قائمة هذا الموسم.
      </p>
      {source.length === 0 ? (
        <p className="mt-5 rounded-2xl bg-sand p-4 text-center text-sm text-ink-soft">
          كل {NOUN[tab].many} موسم {prev} موجودة في موسم {CURRENT_SEASON}.
        </p>
      ) : (
        <ul className="mt-4 max-h-80 space-y-2 overflow-y-auto">
          {source.map((x) => (
            <li key={x.id}>
              <label className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm", picked.has(x.id) ? "border-green-dark bg-green-dark/5" : "border-gold/40")}>
                <input type="checkbox" checked={picked.has(x.id)} onChange={() => toggle(x.id)} className="size-4 accent-[#00594F]" />
                <span className="min-w-0">
                  <span className="block font-bold text-ink">
                    {x.name}
                    {x.group && (x.kind === "camp" || x.kind === "center") ? ` — ${MASHAER_LABEL[x.group as Mashaer]}` : ""}
                  </span>
                  <span className="block text-xs text-hint">
                    {x.sub}
                    {x.capacity ? ` · الطاقة ${formatNumber(x.capacity)}` : ""}
                  </span>
                </span>
              </label>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-5 flex justify-end gap-3">
        <Button variant="ghost" onClick={onClose}>
          إلغاء
        </Button>
        <Button disabled={picked.size === 0} onClick={run}>
          <CopyPlus className="size-4" /> نقل {picked.size || ""}
        </Button>
      </div>
    </Modal>
  );
}
