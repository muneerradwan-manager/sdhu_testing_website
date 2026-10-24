"use client";

import { AlertTriangle, CopyPlus, FilePlus2, FileStack, FileText, Hotel as HotelIcon, Lock, MapPinned, Plus, Plane, Power, Save, Scale, Tent, Trash2, UsersRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import { CADENCE_LABEL, CURRENT_SEASON, FILE_STATE_LABEL, FILE_TYPES, copyFile, fileState, fileStats, fileTypeOf, fullName, gapsOf, matches, newId, opsActions, optionsFor, roleIn, rolesAt, useEmployees, useOpFiles, useRefs, type FileType, type FileTypeCode, type InnerNode, type OpFile, type OuterNode, type Place, type ReportCadence, type Role, outerOf } from "@/lib/ops";
import { can } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, Gate, PageHeader, Panel, fmtDate, fmtDateTime, logAs, textareaClass, useStaffUser } from "../_components/kit";
import { Chip, Field, SearchBox, fieldClass, selectClass } from "../_components/ops-ui";
import { AddButton, Box, EditHeader, EditLayout, EmptyRow, ListTable, RowActions, RowLink, Tag } from "../_components/wp";
import { FilterLinks, HowTo, ListToolbar } from "../employees/list-ui";
import { InnerDrawer, Occupancy, RoleBlock } from "./inner";
import { assign, download, membersAt, setHousing, toCsv, unassign, type Target } from "./model";
import { EmployeePicker } from "./picker";
import { viewKeys } from "@/lib/permissions";

export function OperationalFilesView() {
  return (
    <Gate perms={viewKeys("opfiles")}>
      <OperationalFiles />
    </Gate>
  );
}

const STATE_TONE: Record<string, "gold" | "green" | "muted"> = {
  draft: "gold",
  active: "green",
  ended: "muted",
};
const dateOf = (iso: string) => fmtDate(new Date(`${iso}T12:00:00`).getTime());
const TYPE_ICON: Record<FileTypeCode, typeof HotelIcon> = {
  "makkah-housing": HotelIcon,
  "madinah-housing": HotelIcon,
  "mina-camps": Tent,
  "arafat-camps": Tent,
  flights: Plane,
  "evaluation-committee": Scale,
};
/** A file's counts as its line reads them: the Madinah file has hotels and people only, no towers and no pilgrims */
const countsOf = (t: FileType, st: ReturnType<typeof fileStats>) =>
  !t.outer ? `${st.people} موظفاً` : t.inner ? `${st.outer} ${outerOf(t).plural} · ${st.inner} ${t.inner.plural} · ${st.people} موظفاً · ${formatNumber(st.pilgrims)} حاجاً` : `${st.outer} ${outerOf(t).plural} · ${st.people} موظفاً`;
/** "القطاع" → "قطاع", for "إضافة قطاع" */
const bare = (s: string) => s.split(" ")[0].replace(/^ال/, "");
const SEASONS = [CURRENT_SEASON, CURRENT_SEASON - 1];
/** A file's own screen: its type and season in the address */
const fileHref = (code: FileTypeCode, season: number) => `/staff/operational-files?type=${code}&season=${season}`;

/**
 * The operational files as a site's admin lists its items: the season's files in a table — one per type,
 * each opening its own screen (`?type=&season=`) on its name — and on that screen the file itself: its
 * sectors / centres and their towers / camps in the middle, who holds each post, and on the side the file's
 * state, its decision and dates, activating it, and what its type is.
 */
function OperationalFiles() {
  const params = useSearchParams();
  const code = FILE_TYPES.find((t) => t.code === params.get("type"))?.code;
  const asked = Number(params.get("season"));
  const season = SEASONS.includes(asked) ? asked : CURRENT_SEASON;
  return code ? <FileScreen key={`${code}-${season}`} type={fileTypeOf(code)} season={season} /> : <FilesList />;
}

// ───────────────────────── The season's files ─────────────────────────

function FilesList() {
  const user = useStaffUser()!;
  const files = useOpFiles();
  const employees = useEmployees();
  const refs = useRefs();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const ofSeason = (y: number) => files.filter((f) => f.season === y);
  const exportFile = (f: OpFile) => {
    const t = fileTypeOf(f.type);
    const opts = optionsFor(t, f.season, refs);
    download(`${t.short.replace(/ /g, "-")}-${f.season}.csv`, toCsv(f, employees, new Map([...opts.outer, ...opts.inner].map((p) => [p.id, p]))));
    logAs(user, { action: "تصدير ملف تشغيلي", target: `${t.short} — ${f.season}`, detail: "Excel (CSV)" });
  };

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="بناء العمل للموسم" icon={<FileStack />} title="الملفات التشغيلية" description="ملف لكل نوع في كل موسم: أماكنه من البيانات المرجعية، ومن يشغل كل منصب فيه." />

      <ListToolbar
        filters={
          <FilterLinks<string>
            label="الموسم"
            value={String(season)}
            onChange={(v) => setSeason(Number(v))}
            items={SEASONS.map((y) => ({ value: String(y), label: y === CURRENT_SEASON ? `موسم ${y}` : `موسم ${y} — منتهٍ`, count: ofSeason(y).length }))}
          />
        }
      />

      <ListTable head={["الملف", "الحالة", "القرار", "فترة العمل", "المناصب الإلزامية"]} minWidth="50rem">
        {FILE_TYPES.map((t) => {
          const f = files.find((x) => x.type === t.code && x.season === season);
          const st = f ? fileStats(f) : undefined;
          const state = f ? fileState(f) : undefined;
          const Icon = TYPE_ICON[t.code];
          const href = fileHref(t.code, season);
          const canCreate = can(user, "opfiles.files.POST", t.code) && season === CURRENT_SEASON;
          return (
            <tr key={t.code} className="align-top">
              <td className="p-3">
                <div className="flex items-start gap-3">
                  <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-white/10 text-gold">
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0">
                    <Link href={href} className="font-bold text-white hover:text-gold">
                      {t.short}
                    </Link>
                    <p className="text-xs text-white/60">{st ? countsOf(t, st) : `لا ملف لموسم ${season} بعد`}</p>
                    <RowActions>
                      {f ? <RowLink href={href}>{can(user, "opfiles.files.PUT", t.code) && state !== "ended" ? "تعديل" : "عرض"}</RowLink> : canCreate ? <RowLink href={href}>إنشاء</RowLink> : <RowLink href={href}>عن هذا النوع</RowLink>}
                      {f && can(user, "opfiles.files.export", t.code) && <RowLink onClick={() => exportFile(f)}>تصدير Excel</RowLink>}
                    </RowActions>
                  </div>
                </div>
              </td>
              <td className="p-3">{f && state ? <Tag tone={STATE_TONE[state]}>{FILE_STATE_LABEL[state]}</Tag> : <Tag tone="maroon">لم يُنشأ</Tag>}</td>
              <td className="p-3 tabular-nums text-white/85">{f ? f.decisionNumber || <span className="text-xs text-[#ffb4c8]">بلا رقم</span> : "—"}</td>
              <td className="p-3 text-xs text-white/80">{f ? `${dateOf(f.startsOn)} ← ${dateOf(f.endsOn)}` : "—"}</td>
              <td className="p-3">{!f || !st ? "—" : st.gaps > 0 && state !== "ended" ? <Tag tone="maroon">{st.gaps} شاغرة</Tag> : st.gaps === 0 ? <Tag tone="green">مكتملة</Tag> : <span className="text-xs text-white/50">{st.gaps} شاغرة</span>}</td>
            </tr>
          );
        })}
      </ListTable>

      <HowTo>
        <p>الملف التشغيلي يحدد هيكل العمل الميداني وتوزيع الموظفين عليه. يُفتح لكل نوع ملف واحد في كل موسم.</p>
        <p>افتح الملف باسمه: أضف {outerOf(FILE_TYPES[0]).plural} ثم {FILE_TYPES[0].inner?.plural} من البيانات المرجعية للموسم (وملف المدينة المنورة فنادقها وحدها، تُسند الموظفين إليها مباشرة)، ثم أسند كل منصب إلى موظف من المشاركين في الموسم، ثم أدخل رقم القرار وفعّل الملف.</p>
        <p>لا يُفعَّل ملف قبل شغل كل منصب إلزامي فيه. وبعد تفعيله يصل إشعار كل تغيير في الإسناد إلى الموظف المعني.</p>
      </HowTo>
    </div>
  );
}

// ───────────────────────── One file's screen ─────────────────────────

/** What the file type is: its levels, roles and job descriptions — the same for every season */
function TypeBox({ type, open = false }: { type: FileType; open?: boolean }) {
  return (
    <Box title="نوع الملف وأدواره" open={open}>
      <p className="font-bold text-white">{type.name}</p>
      <p className="text-xs leading-6 text-white/70">{type.description}</p>
      <div className="rounded-xl bg-white/5 p-3 ring-1 ring-white/10">
        {type.team && (
          <p className="mb-2 flex items-center gap-2 font-bold text-white">
            <UsersRound className="size-4 text-gold" /> {type.team} <span className="text-xs font-normal text-white/55">(على الملف)</span>
          </p>
        )}
        {type.outer && (
          <p className="flex items-center gap-2 font-bold text-white">
            {outerOf(type).ref === "hotels" ? <HotelIcon className="size-4 text-gold" /> : <MapPinned className="size-4 text-gold" />} {outerOf(type).name}
          </p>
        )}
        {type.inner && (
          <p className="mr-6 mt-2 flex items-center gap-2 border-r-2 border-gold/40 pr-3 font-bold text-white">
            {type.inner.ref === "camps" ? <Tent className="size-4 text-gold" /> : <HotelIcon className="size-4 text-gold" />} {type.inner.name}
          </p>
        )}
      </div>
      <p className="text-xs leading-6 text-white/65">
        <span className="font-bold text-white/85">بداية العمل: </span>
        {type.startCondition}
      </p>
      <p className="text-xs leading-6 text-white/65">
        <span className="font-bold text-white/85">نهاية العمل: </span>
        {type.endCondition}
      </p>
      <ul className="space-y-2">
        {type.roles.map((r) => (
          <li key={r.code} className="rounded-xl bg-white/5 p-2.5 ring-1 ring-white/10">
            <div className="flex flex-wrap items-center gap-1.5">
              <p className="font-bold text-white">{r.name}</p>
              <Chip>{r.level === "file" ? (type.team ?? "على الملف") : r.level === "outer" ? `على ${outerOf(type).name}` : `في ${type.inner?.name}`}</Chip>
              {r.required && <Chip tone="maroon">إلزامي</Chip>}
              {r.multiple && <Chip tone="gold">{r.max ? `حتى ${r.max}` : "أكثر من شخص"}</Chip>}
            </div>
            <p className="mt-1 text-xs leading-6 text-white/70">{r.description}</p>
          </li>
        ))}
      </ul>
    </Box>
  );
}

function FileScreen({ type, season }: { type: FileType; season: number }) {
  const user = useStaffUser()!;
  const files = useOpFiles();
  const file = files.find((f) => f.type === type.code && f.season === season);
  const previous = files.find((f) => f.type === type.code && f.season === season - 1);
  return (
    <div>
      <EditHeader back="/staff/operational-files" backLabel="كل الملفات التشغيلية" title={`${type.short} — موسم ${season}`}>
        {type.name}
      </EditHeader>
      {file ? (
        <FileView key={file.id} file={file} />
      ) : (
        <EditLayout main={<CreateFile type={type} season={season} previous={previous} canCreate={can(user, "opfiles.files.POST", type.code) && season === CURRENT_SEASON} />} side={<TypeBox type={type} open />} />
      )}
    </div>
  );
}

// ───────────────────────── Creating a season's file ─────────────────────────

function CreateFile({ type, season, previous, canCreate }: { type: FileType; season: number; previous?: OpFile; canCreate: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useRefs();
  const employees = useEmployees();
  const [withPeople, setWithPeople] = useState(true);

  if (!canCreate) return <Empty icon={<FileText />} title={`لا يوجد ملف «${type.short}» لموسم ${season}`} text={season === CURRENT_SEASON ? "يُنشئه من يملك صلاحية «إضافة — الملفات» لهذا النوع من الملفات التشغيلية." : undefined} />;

  const create = (from?: OpFile) => {
    if (from) {
      const { file, missing, dropped } = copyFile(from, {
        season,
        withPeople,
        refs,
        employees,
        by: user.name,
      });
      opsActions.saveFile(file);
      logAs(user, {
        action: "إنشاء ملف تشغيلي من ملف الموسم السابق",
        target: `${type.short} — ${season}`,
        detail: `${file.nodes.length} ${outerOf(type).plural}${type.inner ? ` · ${file.nodes.reduce((a, s) => a + s.children.length, 0)} ${type.inner.plural}` : ""}${withPeople ? " مع الموظفين" : ""}`,
      });
      toast({
        title: "أُنشئ الملف مسودةً",
        body:
          [
            missing.length ? `لم تُنقل ${missing.length} عناصر غير موجودة في قوائم ${season}: ${missing.join("، ")}.` : "",
            dropped ? `${dropped} مواقع لم يُنقل أصحابها لأنهم غير مشاركين هذا الموسم.` : "",
          ]
            .filter(Boolean)
            .join(" ") || "راجع التوزيع وأكمل الإسناد.",
        tone: missing.length || dropped ? "gold" : "success",
        icon: "📁",
      });
    } else {
      const dates = type.dates[season] ?? type.dates[CURRENT_SEASON];
      const file: OpFile = {
        id: newId("f"),
        type: type.code,
        season,
        decisionNumber: "",
        ...dates,
        reportCadence: "daily",
        status: "draft",
        createdAt: Date.now(),
        createdBy: user.name,
        members: [],
        nodes: [],
      };
      opsActions.saveFile(file);
      logAs(user, {
        action: "إنشاء ملف تشغيلي فارغ",
        target: `${type.short} — ${season}`,
      });
      toast({
        title: "أُنشئ ملف فارغ",
        body: type.inner ? `أضف ${outerOf(type).plural} ثم ${type.inner.plural}.` : `أضف ${outerOf(type).plural} ثم أسند الموظفين إليها.`,
        tone: "success",
        icon: "📁",
      });
    }
  };

  return (
    <Panel icon={<FilePlus2 />} title={`إنشاء ملف «${type.short}» لموسم ${season}`}>
      <p className="max-w-3xl text-sm leading-7 text-white/75">
        لا يوجد بعد ملف {type.short} لهذا الموسم. يمكنك البدء من الصفر، أو بناؤه على ملف موسم {season - 1}: تُنقل {outerOf(type).plural}{type.inner && ` و${type.inner.plural}`} الموجودة في قوائم هذا الموسم (بمطابقة الاسم)،
        ويُبلَّغ عمّا لم يعد موجوداً.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {previous && (
          <div className="rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
            <p className="font-bold text-white">بناءً على ملف موسم {season - 1}</p>
            <p className="mt-1 text-xs text-white/70">
              {previous.nodes.length} {outerOf(type).plural} · {type.inner && `${previous.nodes.reduce((a, s) => a + s.children.length, 0)} ${type.inner.plural} · `}{fileStats(previous).people} موظفاً
            </p>
            <label className="mt-3 flex cursor-pointer items-start gap-2 text-sm text-white/85">
              <input type="checkbox" checked={withPeople} onChange={(e) => setWithPeople(e.target.checked)} className="mt-1 size-4 accent-[#D9C89E]" />
              <span>
                مع الموظفين في مواقعهم
                <span className="block text-xs text-white/55">فقط من سجّل في موسم {season}، ويمكن تغيير أي منهم بعد ذلك.</span>
              </span>
            </label>
            <Button className="mt-4" variant="gold" onClick={() => create(previous)}>
              <CopyPlus className="size-4" /> إنشاء من ملف {season - 1}
            </Button>
          </div>
        )}
        <div className="rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
          <p className="font-bold text-white">ملف فارغ</p>
          <p className="mt-1 text-xs text-white/70">
            {type.inner ? `تبدأ من ${outerOf(type).plural}، ثم تضيف ${type.inner.plural} إلى كل ${bare(outerOf(type).name)}، ثم تسند المناصب.` : `تضيف ${outerOf(type).plural} من البيانات المرجعية، ثم تسند الموظفين إليها.`}
          </p>
          <Button className="mt-4" variant="glass" onClick={() => create()}>
            <FilePlus2 className="size-4" /> إنشاء ملف فارغ
          </Button>
        </div>
      </div>
    </Panel>
  );
}

// ───────────────────────── The file ─────────────────────────

type Picking = { target: Target; role: Role; place: string } | null;

function FileView({ file }: { file: OpFile }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const employees = useEmployees();
  const refs = useRefs();
  const type = fileTypeOf(file.type);
  const places = useMemo(() => optionsFor(type, file.season, refs), [type, file.season, refs]);
  const index = useMemo(() => new Map([...places.outer, ...places.inner].map((p) => [p.id, p])), [places]);
  const placeOf = (id?: string) => (id ? index.get(id) : undefined);
  const state = fileState(file);
  // Each act its own permission, for this file's type; an ended file is read only
  const open = state !== "ended";
  const may = (key: string) => open && can(user, `opfiles.${key}`, file.type);
  const acts: Acts = {
    addNode: may("nodes.POST"),
    editNode: may("nodes.PUT"),
    removeNode: may("nodes.DELETE"),
    assign: may("assignments.POST") || may("assignments.PUT"),
    unassign: may("assignments.DELETE"),
    contact: can(user, "opfiles.staff-contact.GET", file.type),
  };
  const editable = acts.addNode || acts.editNode || acts.removeNode || acts.assign || acts.unassign;
  const stats = fileStats(file);
  const gaps = gapsOf(file);

  const [q, setQ] = useState("");
  const [picking, setPicking] = useState<Picking>(null);
  const [innerOpen, setInnerOpen] = useState<{
    outer: string;
    inner: string;
  } | null>(null);
  const [addInnerTo, setAddInnerTo] = useState<string | null>(null);
  const [addOuter, setAddOuter] = useState(false);
  const [editInfo, setEditInfo] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const name = (id?: string) => placeOf(id)?.name ?? "";
  const empName = (id: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? fullName(e) : id;
  };
  const targetName = (t: Target) => {
    if (!t.outer) return type.team ?? type.short;
    const o = file.nodes.find((x) => x.id === t.outer)!;
    return t.inner ? name(o.children.find((x) => x.id === t.inner)?.refId) : name(o.refId);
  };
  const label = `${type.short} ${file.season}`;

  const save = (next: OpFile, action: string, target: string, detail?: string) => {
    opsActions.saveFile(next);
    logAs(user, {
      action,
      target,
      detail: detail ? `${detail} — ${label}` : label,
    });
  };

  const pick = (ids: string[], moveIds: string[]) => {
    if (!picking || !acts.assign) return;
    const { target, role, place } = picking;
    const moving = ids.filter((id) => moveIds.includes(id));
    let next = moving.length ? assign(file, target, role.code, moving, true) : file;
    const adding = ids.filter((id) => !moveIds.includes(id));
    if (adding.length) next = assign(next, target, role.code, adding, false);
    const replaced = !role.multiple ? membersAt(file, target).find((m) => m.role === role.code) : undefined;
    save(next, replaced ? `تغيير ${role.name}` : `إسناد ${role.name}`, place, ids.map(empName).join("، ") + (replaced ? ` بدلاً من ${empName(replaced.employeeId)}` : ""));
    toast({
      title: `أُسند ${role.name}`,
      body: `${ids.map(empName).join("، ")} — ${place}`,
      tone: "success",
      icon: "✅",
    });
    setPicking(null);
  };

  const openPicker = (target: Target, role: Role) => setPicking({ target, role, place: targetName(target) });
  const remove = (target: Target, role: Role, employeeId: string) => save(unassign(file, target, role.code, employeeId), `إزالة ${role.name}`, targetName(target), empName(employeeId));

  const patchInner = (outer: string, inner: string, patch: Partial<InnerNode>) =>
    opsActions.saveFile({
      ...file,
      nodes: file.nodes.map((o) =>
        o.id !== outer
          ? o
          : {
              ...o,
              children: o.children.map((c) => (c.id === inner ? { ...c, ...patch } : c)),
            },
      ),
    });

  /** A tower / camp out of the file: it is offered again, and whoever slept in it no longer has a bed */
  const removeInner = (outer: string, inner: InnerNode) =>
    save(
      {
        ...file,
        nodes: file.nodes.map((o) =>
          o.id !== outer
            ? o
            : {
                ...o,
                children: o.children.filter((c) => c.id !== inner.id),
                members: o.members.map((m) => (m.housingHotelId === inner.refId ? { ...m, housingHotelId: undefined } : m)),
              },
        ),
      },
      "إزالة من ملف تشغيلي",
      name(inner.refId),
    );

  const activate = () => {
    if (!file.decisionNumber.trim()) {
      toast({
        title: "أدخل رقم القرار أولاً",
        body: "يُفعَّل الملف بقرار إداري يُذكر رقمه فيه.",
        tone: "warning",
        icon: "📄",
      });
      setEditInfo(true);
      return;
    }
    if (gaps.length) {
      toast({
        title: `بقي ${gaps.length} مناصب إلزامية شاغرة`,
        body: "لا يُفعَّل الملف قبل شغل كل منصب إلزامي.",
        tone: "warning",
        icon: "⚠️",
      });
      return;
    }
    opsActions.saveFile({
      ...file,
      status: "active",
      activatedAt: Date.now(),
      activatedBy: user.name,
    });
    logAs(user, {
      action: "تفعيل ملف تشغيلي",
      target: `${type.short} — ${file.season}`,
      detail: `القرار ${file.decisionNumber} — أُشعر ${stats.people} موظفاً بمواقعهم`,
    });
    toast({
      title: "فُعّل الملف",
      body: `وصل إشعار «تم إسنادك إلى ملف تشغيلي» إلى ${stats.people} موظفاً.`,
      tone: "success",
      icon: "🚀",
    });
  };

  const deactivate = () => {
    opsActions.saveFile({
      ...file,
      status: "draft",
      activatedAt: undefined,
      activatedBy: undefined,
    });
    logAs(user, {
      action: "إعادة ملف تشغيلي إلى مسودة",
      target: `${type.short} — ${file.season}`,
    });
  };

  // Search inside the file: an outer node stays when its name or its people match; an inner node when its place or its people match
  const view = useMemo(() => {
    const where = (id?: string) => (id ? index.get(id) : undefined);
    const who = (id: string) => {
      const e = employees.find((x) => x.id === id);
      return e ? fullName(e) : "";
    };
    const byOrder = [...file.nodes].sort((a, b) => (where(a.refId)?.order ?? 0) - (where(b.refId)?.order ?? 0));
    if (!q.trim()) return byOrder.map((o) => ({ o, children: o.children }));
    return byOrder
      .map((o) => {
        const hit = matches(q, [where(o.refId)?.name, ...o.members.map((m) => who(m.employeeId))]);
        const children = o.children.filter((c) => hit || matches(q, [where(c.refId)?.name, where(c.refId)?.sub, c.tent, ...c.members.map((m) => who(m.employeeId))]));
        return { o, children, hit };
      })
      .filter((x) => x.hit || x.children.length);
  }, [q, file, employees, index]);

  const openOuter = innerOpen ? file.nodes.find((o) => o.id === innerOpen.outer) : undefined;
  const openInner = openOuter?.children.find((c) => c.id === innerOpen?.inner);
  const fileRoles = rolesAt(type, "file");

  const main = (
    <>
      {state === "ended" && (
        <p className="flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15">
          <Lock className="size-4 shrink-0 text-gold" /> انتهى هذا الملف ({type.endCondition.replace("ينتهي العمل ", "").replace(/\.$/, "")}). يبقى للرجوع إليه، ويُبنى عليه ملف الموسم التالي.
        </p>
      )}
      {!editable && state !== "ended" && <p className="rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15">للاطلاع فقط: التعديل يحتاج صلاحيات الأماكن أو الإسناد في الملفات التشغيلية لهذا النوع.</p>}

      {gaps.length > 0 && state !== "ended" && (
        <section className="rounded-2xl bg-maroon/15 p-4 ring-1 ring-maroon/50">
          <h2 className="mb-3 flex items-center gap-2 font-bold text-white">
            <AlertTriangle className="size-4 text-gold" /> مناصب إلزامية شاغرة ({gaps.length})
          </h2>
          <ul className="flex flex-wrap gap-2">
            {gaps.map((g, i) => {
              const o = g.outerId ? file.nodes.find((x) => x.refId === g.outerId) : undefined;
              const c = g.innerId ? o?.children.find((x) => x.refId === g.innerId) : undefined;
              const target: Target = { outer: o?.id, inner: c?.id };
              return (
                <li key={i}>
                  <button disabled={!acts.assign} onClick={() => openPicker(target, g.role)} className="flex items-center gap-2 rounded-xl bg-maroon/30 px-3 py-1.5 text-sm text-white ring-1 ring-maroon/60 transition enabled:hover:bg-maroon/50">
                    <span className="font-bold">{g.role.name}</span>
                    <span className="text-white/70">— {targetName(target)}</span>
                    {acts.assign && <span className="text-xs font-bold text-gold">إسناد ←</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {fileRoles.length > 0 && (
        <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
          <h2 className="font-display text-lg font-bold text-white">{type.team ?? "فريق الملف"}</h2>
          <p className="mb-3 text-xs text-white/60">
            {type.outer ? `لا يتبع ${bare(outerOf(type).name)}اً بعينه — يخدم ${outerOf(type).plural} كلها.` : "يُسندون على الملف نفسه: لا أماكن فيه."}
          </p>
          <div className="grid gap-2.5 md:grid-cols-2">
            {fileRoles.map((r) => (
              <RoleBlock key={r.code} role={r} holders={file.members.filter((m) => m.role === r.code)} editable={acts.assign} removable={acts.unassign} contact={acts.contact} onAdd={() => openPicker({}, r)} onRemove={(id) => remove({}, r, id)} />
            ))}
          </div>
        </section>
      )}

      {/* ── Outer nodes: the flights' and the committee's files have no places, only their team ── */}
      {type.outer && (
      <div>
        <div className="mb-3 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-bold text-white">{outerOf(type).plural}</h2>
          {acts.addNode && (
            <AddButton onClick={() => setAddOuter(true)}>
              <Plus className="size-4" /> إضافة {bare(outerOf(type).name)}
            </AddButton>
          )}
        </div>
        <ListToolbar
          filters={
            <p className="text-sm text-white/65">
              {countsOf(type, stats)}
            </p>
          }
        >
          <SearchBox className="flex-1" value={q} onChange={setQ} label="بحث داخل الملف" placeholder={type.inner ? `موظف أو ${bare(type.inner.name)} أو ${bare(outerOf(type).name)}...` : `موظف أو ${bare(outerOf(type).name)}...`} />
        </ListToolbar>

        {file.nodes.length === 0 ? (
          <Empty icon={<MapPinned />} title={`الملف بلا ${outerOf(type).plural} بعد`} text={`ابدأ بإضافة ${bare(outerOf(type).name)} من ${outerOf(type).plural} الموسم في البيانات المرجعية.`} />
        ) : view.length === 0 ? (
          <Empty icon={<MapPinned />} title="لا شيء في الملف يطابق البحث" />
        ) : (
          <div className="space-y-5">
            {view.map(({ o, children }) => (
              <OuterSection
                key={o.id}
                type={type}
                file={file}
                node={o}
                shown={children}
                acts={acts}
                placeOf={placeOf}
                onPick={(role, inner) => openPicker({ outer: o.id, inner }, role)}
                onRemove={(role, id, inner) => remove({ outer: o.id, inner }, role, id)}
                onHousing={(employeeId, hotelId) => save(setHousing(file, o.id, employeeId, hotelId), "تغيير سكن موظف", name(o.refId), `${empName(employeeId)} ← ${name(hotelId)}`)}
                onOpenInner={(inner) => setInnerOpen({ outer: o.id, inner })}
                onRemoveInner={(inner) => removeInner(o.id, inner)}
                onAddInner={() => setAddInnerTo(o.id)}
                onRemoveOuter={() => {
                  save({ ...file, nodes: file.nodes.filter((x) => x.id !== o.id) }, "إزالة من ملف تشغيلي", name(o.refId));
                  toast({
                    title: `أُزيل ${name(o.refId)}`,
                    body: type.inner ? `مع ${type.inner.plural} التابعة له — صار موظفوه غير مُسندين.` : "صار موظفوه غير مُسندين.",
                    tone: "info",
                    icon: "🗑️",
                  });
                }}
              />
            ))}
          </div>
        )}
      </div>
      )}
    </>
  );

  const side = (
    <>
      <Box title="الملف">
        <div className="flex flex-wrap gap-1.5">
          <Tag tone={STATE_TONE[state]}>{FILE_STATE_LABEL[state]}</Tag>
          {file.decisionNumber ? <Tag>القرار رقم {file.decisionNumber}</Tag> : <Tag tone="maroon">بلا رقم قرار</Tag>}
          <Tag>{CADENCE_LABEL[file.reportCadence]}</Tag>
        </div>
        <p className="text-white/80">
          من {dateOf(file.startsOn)} إلى {dateOf(file.endsOn)}
        </p>
        {file.startNote && <p className="text-xs leading-6 text-white/65">بداية العمل: {file.startNote}</p>}
        {file.endNote && <p className="text-xs leading-6 text-white/65">نهاية العمل: {file.endNote}</p>}
        {open &&
          can(user, "opfiles.files.activate", file.type) &&
          (state === "draft" ? (
            <Button variant="gold" className="w-full" onClick={activate}>
              <Power className="size-4" /> تفعيل الملف
            </Button>
          ) : (
            <Button variant="glass" className="w-full" onClick={deactivate}>
              إعادته مسودة
            </Button>
          ))}
        {can(user, "opfiles.files.activate", file.type) && state === "draft" && <p className="text-xs leading-5 text-white/55">يُفعَّل بعد إدخال رقم القرار وشغل كل منصب إلزامي، فيصل إلى كل موظف إشعار بموقعه.</p>}
        {state === "active" && editable && <p className="text-xs leading-5 text-white/55">الملف مفعّل: كل تغيير في الإسناد يصل إشعاره إلى الموظف المعني.</p>}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs font-bold">
          {may("files.PUT") && (
            <button type="button" onClick={() => setEditInfo(true)} className="text-gold hover:underline">
              معلومات الملف
            </button>
          )}
          {can(user, "opfiles.files.export", file.type) && (
            <button
              type="button"
              onClick={() => {
                download(`${type.short.replace(/ /g, "-")}-${file.season}.csv`, toCsv(file, employees, index));
                logAs(user, { action: "تصدير ملف تشغيلي", target: `${type.short} — ${file.season}`, detail: "Excel (CSV)" });
              }}
              className="text-gold hover:underline"
            >
              تصدير Excel
            </button>
          )}
          {may("files.DELETE") && state === "draft" && (
            <button type="button" onClick={() => setConfirmDelete(true)} className="text-[#ffb4c8] hover:underline">
              حذف المسودة
            </button>
          )}
        </div>
        <p className="text-[11px] leading-5 text-white/45">
          أنشأه {file.createdBy} — {fmtDateTime(file.createdAt)}
          {file.activatedAt && ` · فعّله ${file.activatedBy} — ${fmtDateTime(file.activatedAt)}`}
        </p>
      </Box>
      <TypeBox type={type} />
    </>
  );

  return (
    <>
      <EditLayout main={main} side={side} />

      {/* ── Sheets ── */}
      <InnerDrawer
        open={!!innerOpen}
        onClose={() => setInnerOpen(null)}
        type={type}
        file={file}
        node={openInner}
        place={placeOf(openInner?.refId)}
        outerName={name(openOuter?.refId)}
        acts={acts}
        onPatch={(p) => innerOpen && patchInner(innerOpen.outer, innerOpen.inner, p)}
        onAdd={(role) => innerOpen && openPicker({ outer: innerOpen.outer, inner: innerOpen.inner }, role)}
        onRemove={(role, id) => innerOpen && remove({ outer: innerOpen.outer, inner: innerOpen.inner }, role, id)}
        onDelete={() => {
          if (!innerOpen || !openInner) return;
          removeInner(innerOpen.outer, openInner);
          setInnerOpen(null);
        }}
      />

      <EmployeePicker
        open={!!picking}
        onClose={() => setPicking(null)}
        file={file}
        role={picking?.role ?? null}
        place={picking?.place ?? ""}
        holders={
          picking
            ? membersAt(file, picking.target)
                .filter((m) => m.role === picking.role.code)
                .map((m) => m.employeeId)
            : []
        }
        onPick={pick}
      />

      <PlaceModal
        open={!!addInnerTo || addOuter}
        level={addOuter ? "outer" : "inner"}
        type={type}
        file={file}
        options={addOuter ? places.outer : places.inner}
        onClose={() => {
          setAddInnerTo(null);
          setAddOuter(false);
        }}
        onChoose={(id) => {
          if (addOuter) {
            const node: OuterNode = {
              id: newId("o"),
              refId: id,
              members: [],
              children: [],
            };
            save({ ...file, nodes: [...file.nodes, node] }, `إضافة ${bare(outerOf(type).name)} إلى ملف تشغيلي`, name(id));
            setAddOuter(false);
          } else if (addInnerTo && type.inner) {
            const node: InnerNode = {
              id: newId("n"),
              refId: id,
              pilgrims: 0,
              clusters: [],
              members: [],
            };
            const o = file.nodes.find((x) => x.id === addInnerTo)!;
            save(
              {
                ...file,
                nodes: file.nodes.map((x) => (x.id === addInnerTo ? { ...x, children: [...x.children, node] } : x)),
              },
              `إضافة ${bare(type.inner.name)} إلى ملف تشغيلي`,
              name(id),
              name(o.refId),
            );
            setAddInnerTo(null);
            setInnerOpen({ outer: addInnerTo, inner: node.id });
          }
        }}
      />

      <InfoModal open={editInfo} onClose={() => setEditInfo(false)} file={file} type={type} />

      <Modal open={confirmDelete} onClose={() => setConfirmDelete(false)}>
        <h3 className="font-display text-2xl font-bold text-maroon">حذف مسودة الملف؟</h3>
        <p className="mt-2 text-sm leading-7 text-ink-soft">
          يُحذف ملف {type.short} لموسم {file.season} بكل {outerOf(type).plural}{type.inner && ` و${type.inner.plural}`} وإسناداته ({stats.people} موظفاً). القوائم المرجعية والموظفون لا يتأثرون.
        </p>
        <div className="mt-5 flex justify-end gap-3">
          <Button variant="ghost" onClick={() => setConfirmDelete(false)}>
            إلغاء
          </Button>
          <Button
            variant="maroon"
            onClick={() => {
              opsActions.deleteFile(file.id);
              logAs(user, {
                action: "حذف مسودة ملف تشغيلي",
                target: `${type.short} — ${file.season}`,
              });
              setConfirmDelete(false);
            }}
          >
            <Trash2 className="size-4" /> حذف المسودة
          </Button>
        </div>
      </Modal>
    </>
  );
}

/** What he may do in one operational file, each its own permission for the file's type */
export type Acts = { addNode: boolean; editNode: boolean; removeNode: boolean; assign: boolean; unassign: boolean; contact: boolean };

/**
 * One sector / centre: its name with «إضافة برج | إزالة» under it, its own posts, then its towers / camps
 * as a table whose rows open their sheet on the name, with «تعديل | إزالة» under it.
 */
function OuterSection({
  type,
  file,
  node,
  shown,
  acts,
  placeOf,
  onPick,
  onRemove,
  onHousing,
  onOpenInner,
  onRemoveInner,
  onAddInner,
  onRemoveOuter,
}: {
  type: FileType;
  file: OpFile;
  node: OuterNode;
  /** The inner nodes to show (all of them, or those matching the search) */
  shown: InnerNode[];
  acts: Acts;
  placeOf: (id?: string) => Place | undefined;
  onPick: (role: Role, inner?: string) => void;
  onRemove: (role: Role, employeeId: string, inner?: string) => void;
  onHousing: (employeeId: string, hotelId: string) => void;
  onOpenInner: (inner: string) => void;
  onRemoveInner: (inner: InnerNode) => void;
  onAddInner: () => void;
  onRemoveOuter: () => void;
}) {
  const employees = useEmployees();
  const clusters = useClusters();
  const clusterName = (slug: string) => clusters.find((c) => c.slug === slug)?.name.replace(/ لخدمة الحجاج| للحج والعمرة/, "") ?? slug;
  const outer = placeOf(node.refId);
  const pilgrims = node.children.reduce((a, t) => a + t.pilgrims, 0);
  const people = new Set([...node.members, ...node.children.flatMap((t) => t.members)].map((m) => m.employeeId)).size;
  const housingOptions = node.children.map((t) => placeOf(t.refId)).filter((p): p is Place => !!p);
  const isCamp = type.inner?.ref === "camps";
  const innerWord = isCamp ? "مخيم" : "برج";
  const lead = rolesAt(type, "inner").find((r) => r.required);
  const name = (id?: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? fullName(e) : undefined;
  };

  return (
    <section className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-gold font-display text-lg font-bold text-ink">{outerOf(type).ref === "hotels" ? <HotelIcon className="size-5" /> : (outer?.order ?? "؟")}</span>
        <div className="min-w-0">
          <h3 className="font-display text-xl font-bold text-white">{outer?.name}</h3>
          <p className="text-xs text-white/65">
            {outer?.sub}{type.inner ? ` · ${node.children.length} ${type.inner.plural} · ${formatNumber(pilgrims)} حاجاً` : ""} · {people} موظفاً
          </p>
          {(acts.addNode || acts.removeNode) && (
            <RowActions>
              {acts.addNode && type.inner && <RowLink onClick={onAddInner}>إضافة {innerWord}</RowLink>}
              {acts.removeNode && (
                <RowLink danger onClick={onRemoveOuter}>
                  إزالة من الملف
                </RowLink>
              )}
            </RowActions>
          )}
        </div>
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-2">
        {rolesAt(type, "outer").map((r) => (
          <RoleBlock
            key={r.code}
            role={r}
            holders={node.members.filter((m) => m.role === r.code)}
            editable={acts.assign}
            removable={acts.unassign}
            contact={acts.contact}
            onAdd={() => onPick(r)}
            onRemove={(id) => onRemove(r, id)}
            extra={
              type.housing
                ? (m) =>
                    acts.assign && housingOptions.length ? (
                      <label className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                        يسكن في
                        <select value={m.housingHotelId ?? ""} onChange={(e) => onHousing(m.employeeId, e.target.value)} className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[11px] text-white outline-none ring-1 ring-white/15 [&>option]:text-ink">
                          {!m.housingHotelId && <option value="">— اختر —</option>}
                          {housingOptions.map((h) => (
                            <option key={h.id} value={h.id}>
                              {h.name}
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : (
                      m.housingHotelId && <p className="text-[11px] text-white/50">يسكن في {placeOf(m.housingHotelId)?.name}</p>
                    )
                : undefined
            }
          />
        ))}
      </div>

      {type.inner && (
      <div className="mt-4">
        <ListTable head={[type.inner.name, isCamp ? "أعضاء المخيم" : roleIn(type, "tower-supervisor").name, "الحجاج والإشغال"]} minWidth="40rem">
          {shown.length === 0 ? (
            <EmptyRow cols={3}>لا {type.inner.plural} هنا بعد.</EmptyRow>
          ) : (
            shown.map((c) => {
              const p = placeOf(c.refId);
              if (!p) return null;
              const leadHolders = lead ? c.members.filter((m) => m.role === lead.code) : c.members;
              const ok = leadHolders.length > 0;
              return (
                <tr key={c.id} className={cn("align-top", !ok && "bg-maroon/10")}>
                  <td className="p-3">
                    <button type="button" onClick={() => onOpenInner(c.id)} className="text-right font-bold text-white hover:text-gold">
                      {p.name}
                    </button>
                    <p className="text-[11px] text-white/60">{p.sub}</p>
                    {(c.clusters.length > 0 || c.tent || c.bodies) && (
                      <p className="mt-1 flex flex-wrap gap-1">
                        {c.clusters.map((s) => (
                          <Tag key={s} tone="gold">
                            {clusterName(s)}
                          </Tag>
                        ))}
                        {c.tent && <Tag>{c.tent}</Tag>}
                        {c.bodies && <Tag>جهات: {c.bodies}</Tag>}
                      </p>
                    )}
                    <RowActions>
                      <RowLink onClick={() => onOpenInner(c.id)}>{acts.editNode || acts.assign ? "تعديل" : "عرض"}</RowLink>
                      {acts.removeNode && (
                        <RowLink danger onClick={() => onRemoveInner(c)}>
                          إزالة
                        </RowLink>
                      )}
                    </RowActions>
                  </td>
                  <td className="p-3 text-xs">
                    {isCamp ? (
                      ok ? (
                        <span className="font-bold text-white">
                          {leadHolders
                            .slice(0, 2)
                            .map((m) => name(m.employeeId)?.split(" ")[0])
                            .join("، ")}
                          {leadHolders.length > 2 && ` +${leadHolders.length - 2}`}
                        </span>
                      ) : (
                        <span className="font-bold text-[#ffc9d8]">لا أحد بعد</span>
                      )
                    ) : (
                      <>
                        {ok ? <span className="font-bold text-white">{name(leadHolders[0].employeeId)}</span> : <span className="font-bold text-[#ffc9d8]">شاغر</span>}
                        <p className="mt-0.5 text-white/60">
                          المعاونون: {c.members.filter((m) => m.role === "tower-deputy").length} · أعضاء البعثة: {c.members.filter((m) => m.role === "mission-member").length}
                        </p>
                      </>
                    )}
                  </td>
                  <td className="w-64 p-3">
                    <Occupancy file={file} node={c} place={p} />
                  </td>
                </tr>
              );
            })
          )}
        </ListTable>
      </div>
      )}
    </section>
  );
}

/** Choose a sector / centre, or a hotel / camp, from this season's reference lists */
function PlaceModal({
  open,
  level,
  type,
  file,
  options,
  onClose,
  onChoose,
}: {
  open: boolean;
  level: "outer" | "inner";
  type: FileType;
  file: OpFile;
  options: Place[];
  onClose: () => void;
  onChoose: (id: string) => void;
}) {
  const used = new Set(level === "outer" ? file.nodes.map((o) => o.refId) : file.nodes.flatMap((o) => o.children.map((c) => c.refId)));
  const free = options.filter((p) => !used.has(p.id));
  // The Madinah file has no inner level: the modal is never opened for it, but it is still drawn
  const what = (level === "outer" ? outerOf(type) : type.inner) ?? outerOf(type);
  return (
    <Modal open={open} onClose={onClose} className="max-w-xl">
      <h3 className="font-display text-2xl font-bold text-green-dark">إضافة إلى الملف: {what.plural}</h3>
      <p className="mt-1 text-sm leading-6 text-ink-soft">
        {what.plural} موسم {file.season}
        {type.mashaer ? ` في ${type.where}` : ""} من البيانات المرجعية، غير المستعملة في هذا الملف. كل عنصر يظهر في الملف مرة واحدة.
      </p>
      {free.length === 0 ? (
        <div className="mt-5 rounded-2xl bg-sand p-4 text-center text-sm text-ink-soft">
          لا {what.plural} متاحة.{" "}
          <Link href="/staff/reference" className="font-bold text-green-dark underline">
            أضفها من البيانات المرجعية
          </Link>
        </div>
      ) : (
        <ul className="mt-4 max-h-96 space-y-2 overflow-y-auto">
          {free.map((o) => (
            <li key={o.id}>
              <button onClick={() => onChoose(o.id)} className="w-full rounded-2xl border-2 border-gold/40 p-3 text-right transition hover:border-green-dark hover:bg-green-dark/5">
                <span className="block font-bold text-ink">{o.name}</span>
                <span className="block text-xs text-hint">
                  {o.sub}
                  {o.capacity ? ` · الطاقة ${formatNumber(o.capacity)}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </Modal>
  );
}

function InfoModal({ open, onClose, file, type }: { open: boolean; onClose: () => void; file: OpFile; type: FileType }) {
  const user = useStaffUser()!;
  const [d, setD] = useState(file);
  const [lastOpen, setLastOpen] = useState(open);
  if (open !== lastOpen) {
    setLastOpen(open);
    if (open) setD(file);
  }
  const valid = d.startsOn && d.endsOn && d.endsOn >= d.startsOn;
  return (
    <Modal open={open} onClose={onClose} className="max-w-2xl bg-gradient-to-b from-[#004a42] to-[#00352f] text-white">
      <h3 className="font-display text-2xl font-bold text-white">معلومات الملف</h3>
      <form
        className="mt-4 space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid) return;
          opsActions.saveFile(d);
          logAs(user, {
            action: "تعديل معلومات ملف تشغيلي",
            target: `${type.short} — ${file.season}`,
            before: file.decisionNumber || "—",
            after: d.decisionNumber || "—",
          });
          onClose();
        }}
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <Field label="رقم القرار">
            <input value={d.decisionNumber} onChange={(e) => setD({ ...d, decisionNumber: e.target.value })} className={cn(fieldClass, "tabular-nums")} dir="ltr" autoFocus />
          </Field>
          <Field label="بداية العمل">
            <input type="date" value={d.startsOn} onChange={(e) => setD({ ...d, startsOn: e.target.value })} className={fieldClass} dir="ltr" />
          </Field>
          <Field label="نهاية العمل">
            <input type="date" value={d.endsOn} onChange={(e) => setD({ ...d, endsOn: e.target.value })} className={fieldClass} dir="ltr" />
          </Field>
        </div>
        {d.startsOn && d.endsOn && (
          <p className="-mt-2 text-xs text-white/60">
            {dateOf(d.startsOn)} ← {dateOf(d.endsOn)}
            {!valid && <span className="font-bold text-[#ffc9d8]"> — النهاية قبل البداية</span>}
          </p>
        )}
        <Field label="التقارير الدورية" hint={`${type.inner ? `يرفع المسؤولون في ${type.inner.plural} تقاريرهم إلى ${outerOf(type).plural}` : `يرفع المسؤولون في ${outerOf(type).plural} تقاريرهم`} بهذا الإيقاع.`}>
          <select value={d.reportCadence} onChange={(e) => setD({ ...d, reportCadence: e.target.value as ReportCadence })} className={selectClass}>
            {(Object.keys(CADENCE_LABEL) as ReportCadence[]).map((c) => (
              <option key={c} value={c}>
                {CADENCE_LABEL[c]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="ملاحظة بداية العمل">
          <textarea rows={2} value={d.startNote ?? ""} onChange={(e) => setD({ ...d, startNote: e.target.value || undefined })} className={textareaClass} />
        </Field>
        <Field label="ملاحظة نهاية العمل">
          <textarea rows={2} value={d.endNote ?? ""} onChange={(e) => setD({ ...d, endNote: e.target.value || undefined })} className={textareaClass} />
        </Field>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="glass" onClick={onClose}>
            إلغاء
          </Button>
          <Button type="submit" variant="gold" disabled={!valid}>
            <Save className="size-4" /> حفظ
          </Button>
        </div>
      </form>
    </Modal>
  );
}
