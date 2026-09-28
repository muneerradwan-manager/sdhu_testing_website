"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertTriangle,
  BedDouble,
  CalendarRange,
  CheckCircle2,
  ChevronDown,
  CopyPlus,
  Download,
  FilePlus2,
  FileStack,
  FileText,
  Hotel as HotelIcon,
  Lock,
  MapPinned,
  Pencil,
  Plus,
  Power,
  Save,
  Tent,
  Trash2,
  UsersRound,
} from "lucide-react";
import Link from "next/link";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Modal, useToast } from "@/components/ui/widgets";
import { useClusters } from "@/lib/cms/content";
import {
  CADENCE_LABEL,
  CURRENT_SEASON,
  FILE_STATE_LABEL,
  FILE_TYPES,
  copyFile,
  fileState,
  fileStats,
  fileTypeOf,
  fullName,
  gapsOf,
  matches,
  newId,
  opsActions,
  optionsFor,
  roleIn,
  rolesAt,
  useEmployees,
  useOpFiles,
  useRefs,
  type FileType,
  type FileTypeCode,
  type InnerNode,
  type OpFile,
  type OuterNode,
  type Place,
  type ReportCadence,
  type Role,
} from "@/lib/ops";
import { can } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";
import { Empty, Gate, Kpi, PageHeader, Panel, Tabs, fmtDate, fmtDateTime, logAs, textareaClass, useStaffUser } from "../_components/kit";
import { Chip, Field, SearchBox, fieldClass, selectClass, type ChipTone } from "../_components/ops-ui";
import { InnerDrawer, Occupancy, RoleBlock } from "./inner";
import { assign, download, membersAt, setHousing, toCsv, unassign, type Target } from "./model";
import { EmployeePicker } from "./picker";

export function OperationalFilesView() {
  return (
    <Gate perms={["ops.files", "operations.room"]}>
      <OperationalFiles />
    </Gate>
  );
}

const STATE_TONE: Record<string, ChipTone> = {
  draft: "gold",
  active: "green",
  ended: "muted",
};
const dateOf = (iso: string) => fmtDate(new Date(`${iso}T12:00:00`).getTime());
const TYPE_ICON: Record<FileTypeCode, typeof HotelIcon> = {
  "makkah-housing": HotelIcon,
  "mina-camps": Tent,
  "arafat-camps": Tent,
};
/** "القطاع" → "قطاع", for "إضافة قطاع" */
const bare = (s: string) => s.split(" ")[0].replace(/^ال/, "");

function OperationalFiles() {
  const user = useStaffUser()!;
  const files = useOpFiles();
  const [season, setSeason] = useState(CURRENT_SEASON);
  const [typeCode, setTypeCode] = useState<FileTypeCode>("makkah-housing");
  const type = fileTypeOf(typeCode);
  const file = files.find((f) => f.type === typeCode && f.season === season);
  const previous = files.find((f) => f.type === typeCode && f.season === season - 1);

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="بناء العمل للموسم"
        icon={<FileStack />}
        title="الملفات التشغيلية"
        description="الملف التشغيلي يحدد هيكل العمل الميداني وتوزيع الموظفين عليه. يُفتح لكل نوع ملف واحد في كل موسم، ويُختار كل مكان فيه من البيانات المرجعية للموسم، ثم يُسند كل منصب إلى موظف."
        actions={
          <Tabs
            id="files-season"
            value={String(season)}
            onChange={(v) => setSeason(Number(v))}
            tabs={[CURRENT_SEASON, CURRENT_SEASON - 1].map((y) => ({
              value: String(y),
              label: `موسم ${y}`,
            }))}
          />
        }
      />

      {/* The season's files at a glance — one card per type */}
      <div className="grid gap-3 md:grid-cols-3">
        {FILE_TYPES.map((t, i) => {
          const f = files.find((x) => x.type === t.code && x.season === season);
          const st = f ? fileStats(f) : undefined;
          const Icon = TYPE_ICON[t.code];
          const active = t.code === typeCode;
          return (
            <motion.button
              key={t.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => setTypeCode(t.code)}
              aria-pressed={active}
              className={cn(
                "rounded-3xl border p-4 text-right transition",
                active ? "border-gold bg-gradient-to-br from-gold/25 to-gold/5 shadow-[0_18px_40px_-24px_rgba(217,200,158,.7)]" : "border-white/15 bg-white/[.05] hover:border-gold/50",
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className={cn("grid size-10 place-items-center rounded-2xl", active ? "bg-gold text-ink" : "bg-white/10 text-gold")}>
                  <Icon className="size-5" />
                </span>
                {f ? <Chip tone={STATE_TONE[fileState(f)]}>{FILE_STATE_LABEL[fileState(f)]}</Chip> : <Chip tone="maroon">لم يُنشأ</Chip>}
              </div>
              <p className="mt-3 font-display text-lg font-bold text-white">{t.short}</p>
              <p className="mt-0.5 text-xs text-white/65">{st ? `${st.outer} ${t.outer.plural} · ${st.inner} ${t.inner.plural} · ${st.people} موظفاً` : `لا ملف لموسم ${season} بعد`}</p>
              {f && st && st.gaps > 0 && fileState(f) !== "ended" && <p className="mt-1 text-xs font-bold text-[#ffc9d8]">{st.gaps} مناصب إلزامية شاغرة</p>}
              {st && st.gaps === 0 && <p className="mt-1 text-xs font-bold text-green-light">كل المناصب الإلزامية مشغولة</p>}
            </motion.button>
          );
        })}
      </div>

      <TypeCard key={type.code} type={type} />

      {file ? <FileView key={file.id} file={file} /> : <CreateFile type={type} season={season} previous={previous} canCreate={can(user, "ops.files") && season === CURRENT_SEASON} />}
    </div>
  );
}

/** What the file type is: its levels, roles and job descriptions — the same for every season */
function TypeCard({ type }: { type: FileType }) {
  const [open, setOpen] = useState(false);
  return (
    <Panel>
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-start justify-between gap-4 text-right" aria-expanded={open}>
        <div className="min-w-0">
          <p className="text-xs font-bold text-gold">نوع الملف</p>
          <p className="font-display text-xl font-bold text-white">{type.name}</p>
          <p className="mt-1 max-w-3xl text-sm leading-7 text-white/70">{type.description}</p>
        </div>
        <span className="mt-1 flex shrink-0 items-center gap-1 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-white/85">
          الأدوار والوصف الوظيفي <ChevronDown className={cn("size-4 transition", open && "rotate-180")} />
        </span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-5 grid gap-4 lg:grid-cols-[14rem_1fr]">
              <div className="space-y-2 text-sm">
                <p className="text-xs font-bold text-gold">الهيكل</p>
                <div className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                  {type.team && (
                    <p className="mb-2 flex items-center gap-2 font-bold text-white">
                      <UsersRound className="size-4 text-gold" /> {type.team} <span className="text-xs font-normal text-white/55">(على الملف)</span>
                    </p>
                  )}
                  <p className="flex items-center gap-2 font-bold text-white">
                    <MapPinned className="size-4 text-gold" /> {type.outer.name}
                  </p>
                  <p className="mr-6 mt-2 flex items-center gap-2 border-r-2 border-gold/40 pr-3 font-bold text-white">
                    {type.inner.ref === "camps" ? <Tent className="size-4 text-gold" /> : <HotelIcon className="size-4 text-gold" />} {type.inner.name}
                  </p>
                </div>
                <p className="text-xs leading-6 text-white/65">
                  <span className="font-bold text-white/85">بداية العمل: </span>
                  {type.startCondition}
                </p>
                <p className="text-xs leading-6 text-white/65">
                  <span className="font-bold text-white/85">نهاية العمل: </span>
                  {type.endCondition}
                </p>
              </div>
              <ul className="grid gap-2 md:grid-cols-2">
                {type.roles.map((r) => (
                  <li key={r.code} className="rounded-2xl bg-white/5 p-3 ring-1 ring-white/10">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <p className="font-bold text-white">{r.name}</p>
                      <Chip>{r.level === "file" ? (type.team ?? "على الملف") : r.level === "outer" ? `على ${type.outer.name}` : `في ${type.inner.name}`}</Chip>
                      {r.required && <Chip tone="maroon">إلزامي</Chip>}
                      {r.multiple && <Chip tone="gold">{r.max ? `حتى ${r.max}` : "أكثر من شخص"}</Chip>}
                    </div>
                    <p className="mt-1.5 text-xs leading-6 text-white/70">{r.description}</p>
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Panel>
  );
}

// ───────────────────────── Creating a season's file ─────────────────────────

function CreateFile({ type, season, previous, canCreate }: { type: FileType; season: number; previous?: OpFile; canCreate: boolean }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const refs = useRefs();
  const employees = useEmployees();
  const [withPeople, setWithPeople] = useState(true);

  if (!canCreate) return <Empty icon={<FileText />} title={`لا يوجد ملف «${type.short}» لموسم ${season}`} text={season === CURRENT_SEASON ? "يُنشئه من يملك صلاحية الملفات التشغيلية." : undefined} />;

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
        detail: `${file.nodes.length} ${type.outer.plural} · ${file.nodes.reduce((a, s) => a + s.children.length, 0)} ${type.inner.plural}${withPeople ? " مع الموظفين" : ""}`,
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
        body: `أضف ${type.outer.plural} ثم ${type.inner.plural}.`,
        tone: "success",
        icon: "📁",
      });
    }
  };

  return (
    <Panel icon={<FilePlus2 />} title={`إنشاء ملف «${type.short}» لموسم ${season}`}>
      <p className="max-w-3xl text-sm leading-7 text-white/75">
        لا يوجد بعد ملف {type.short} لهذا الموسم. يمكنك البدء من الصفر، أو بناؤه على ملف موسم {season - 1}: تُنقل {type.outer.plural} و{type.inner.plural} الموجودة في قوائم هذا الموسم (بمطابقة الاسم)،
        ويُبلَّغ عمّا لم يعد موجوداً.
      </p>
      <div className="mt-5 grid gap-4 md:grid-cols-2">
        {previous && (
          <div className="rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
            <p className="font-bold text-white">بناءً على ملف موسم {season - 1}</p>
            <p className="mt-1 text-xs text-white/70">
              {previous.nodes.length} {type.outer.plural} · {previous.nodes.reduce((a, s) => a + s.children.length, 0)} {type.inner.plural} · {fileStats(previous).people} موظفاً
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
            تبدأ من {type.outer.plural}، ثم تضيف {type.inner.plural} إلى كل {bare(type.outer.name)}، ثم تسند المناصب.
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
  const editable = can(user, "ops.files") && state !== "ended";
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
    if (!picking) return;
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

  return (
    <>
      {/* ── File header ── */}
      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Chip tone={STATE_TONE[state]}>{FILE_STATE_LABEL[state]}</Chip>
              <Chip>موسم {file.season}</Chip>
              {file.decisionNumber ? <Chip>القرار رقم {file.decisionNumber}</Chip> : <Chip tone="maroon">بلا رقم قرار</Chip>}
              <Chip>{CADENCE_LABEL[file.reportCadence]}</Chip>
            </div>
            <p className="mt-2 font-display text-2xl font-bold text-white">{type.short}</p>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-sm text-white/75">
              <CalendarRange className="size-4 text-gold" /> من {dateOf(file.startsOn)} إلى {dateOf(file.endsOn)}
            </p>
            {file.startNote && <p className="mt-2 max-w-3xl text-xs leading-6 text-white/65">بداية العمل: {file.startNote}</p>}
            {file.endNote && <p className="max-w-3xl text-xs leading-6 text-white/65">نهاية العمل: {file.endNote}</p>}
            <p className="mt-2 text-[11px] text-white/45">
              أنشأه {file.createdBy} — {fmtDateTime(file.createdAt)}
              {file.activatedAt && ` · فعّله ${file.activatedBy} — ${fmtDateTime(file.activatedAt)}`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="glass" onClick={() => download(`${type.short.replace(/ /g, "-")}-${file.season}.csv`, toCsv(file, employees, index))}>
              <Download className="size-4" /> تصدير Excel
            </Button>
            {editable && (
              <>
                <Button size="sm" variant="glass" onClick={() => setEditInfo(true)}>
                  <Pencil className="size-4" /> معلومات الملف
                </Button>
                {state === "draft" ? (
                  <Button size="sm" variant="gold" onClick={activate}>
                    <Power className="size-4" /> تفعيل الملف
                  </Button>
                ) : (
                  <Button size="sm" variant="glass" onClick={deactivate}>
                    إعادته مسودة
                  </Button>
                )}
                {state === "draft" && (
                  <button
                    onClick={() => setConfirmDelete(true)}
                    className="grid size-9 place-items-center rounded-xl text-white/60 hover:bg-maroon/40 hover:text-white"
                    aria-label="حذف المسودة"
                    title="حذف المسودة"
                  >
                    <Trash2 className="size-4" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
        {state === "ended" && (
          <p className="mt-4 flex items-center gap-2 rounded-2xl bg-white/10 px-4 py-3 text-sm text-white/80 ring-1 ring-white/15">
            <Lock className="size-4 shrink-0 text-gold" /> انتهى هذا الملف ({type.endCondition.replace("ينتهي العمل ", "").replace(/\.$/, "")}). يبقى للرجوع إليه، ويُبنى عليه ملف الموسم التالي.
          </p>
        )}
        {state === "active" && editable && <p className="mt-4 text-xs leading-6 text-white/60">الملف مفعّل: كل تغيير في الإسناد يصل إشعاره إلى الموظف المعني ويُسجَّل في سجل الأحداث.</p>}
      </Panel>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        <Kpi label={type.outer.plural} value={stats.outer} icon={<MapPinned />} />
        <Kpi label={type.inner.plural} value={stats.inner} icon={type.inner.ref === "camps" ? <Tent /> : <HotelIcon />} tone="teal" delay={0.04} />
        <Kpi label="موظفون مُسندون" value={stats.people} icon={<UsersRound />} tone="gold" delay={0.08} />
        <Kpi label={`حجاج ${type.inner.plural}`} value={stats.pilgrims} icon={<BedDouble />} delay={0.12} />
        <Kpi
          label="مناصب إلزامية شاغرة"
          value={stats.gaps}
          icon={stats.gaps ? <AlertTriangle /> : <CheckCircle2 />}
          tone={stats.gaps ? "maroon" : "teal"}
          pulse={stats.gaps > 0}
          delay={0.16}
          hint={stats.gaps ? "تمنع تفعيل الملف" : "الملف مكتمل"}
        />
      </div>

      {gaps.length > 0 && state !== "ended" && (
        <Panel icon={<AlertTriangle />} title="مناصب إلزامية شاغرة" className="border-maroon/60">
          <ul className="flex flex-wrap gap-2">
            {gaps.map((g, i) => {
              const o = g.outerId ? file.nodes.find((x) => x.refId === g.outerId) : undefined;
              const c = g.innerId ? o?.children.find((x) => x.refId === g.innerId) : undefined;
              const target: Target = { outer: o?.id, inner: c?.id };
              return (
                <li key={i}>
                  <button
                    disabled={!editable}
                    onClick={() => openPicker(target, g.role)}
                    className="flex items-center gap-2 rounded-2xl bg-maroon/30 px-3 py-2 text-sm text-white ring-1 ring-maroon/60 transition enabled:hover:bg-maroon/50"
                  >
                    <span className="font-bold">{g.role.name}</span>
                    <span className="text-white/70">— {targetName(target)}</span>
                    {editable && <span className="text-xs font-bold text-gold">إسناد ←</span>}
                  </button>
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      {fileRoles.length > 0 && (
        <Panel
          icon={<UsersRound />}
          title={type.team ?? "فريق الملف"}
          action={
            <span className="text-xs text-white/60">
              لا يتبع {bare(type.outer.name)}اً بعينه — يخدم {type.outer.plural} كلها
            </span>
          }
        >
          <div className="grid gap-2.5 md:grid-cols-2">
            {fileRoles.map((r) => (
              <RoleBlock key={r.code} role={r} holders={file.members.filter((m) => m.role === r.code)} editable={editable} onAdd={() => openPicker({}, r)} onRemove={(id) => remove({}, r, id)} />
            ))}
          </div>
        </Panel>
      )}

      {/* ── Outer nodes ── */}
      <div className="flex flex-col gap-3 md:flex-row md:items-center">
        <SearchBox className="flex-1" value={q} onChange={setQ} label="بحث داخل الملف" placeholder={`ابحث عن موظف أو ${bare(type.inner.name)} أو ${bare(type.outer.name)} داخل الملف...`} />
        {editable && (
          <Button variant="gold" onClick={() => setAddOuter(true)}>
            <Plus className="size-4" /> إضافة {bare(type.outer.name)}
          </Button>
        )}
      </div>

      {file.nodes.length === 0 ? (
        <Empty icon={<MapPinned />} title={`الملف بلا ${type.outer.plural} بعد`} text={`ابدأ بإضافة ${bare(type.outer.name)} من ${type.outer.plural} الموسم في البيانات المرجعية.`} />
      ) : view.length === 0 ? (
        <Empty icon={<MapPinned />} title="لا شيء في الملف يطابق البحث" />
      ) : (
        <div className="space-y-6">
          {view.map(({ o, children }, i) => (
            <OuterCard
              key={o.id}
              type={type}
              file={file}
              node={o}
              shown={children}
              index={i}
              editable={editable}
              placeOf={placeOf}
              onPick={(role, inner) => openPicker({ outer: o.id, inner }, role)}
              onRemove={(role, id, inner) => remove({ outer: o.id, inner }, role, id)}
              onHousing={(employeeId, hotelId) => save(setHousing(file, o.id, employeeId, hotelId), "تغيير سكن موظف", name(o.refId), `${empName(employeeId)} ← ${name(hotelId)}`)}
              onOpenInner={(inner) => setInnerOpen({ outer: o.id, inner })}
              onAddInner={() => setAddInnerTo(o.id)}
              onRemoveOuter={() => {
                save({ ...file, nodes: file.nodes.filter((x) => x.id !== o.id) }, "إزالة من ملف تشغيلي", name(o.refId));
                toast({
                  title: `أُزيل ${name(o.refId)}`,
                  body: `مع ${type.inner.plural} التابعة له — صار موظفوه غير مُسندين.`,
                  tone: "info",
                  icon: "🗑️",
                });
              }}
            />
          ))}
        </div>
      )}

      {/* ── Sheets ── */}
      <InnerDrawer
        open={!!innerOpen}
        onClose={() => setInnerOpen(null)}
        type={type}
        file={file}
        node={openInner}
        place={placeOf(openInner?.refId)}
        outerName={name(openOuter?.refId)}
        editable={editable}
        onPatch={(p) => innerOpen && patchInner(innerOpen.outer, innerOpen.inner, p)}
        onAdd={(role) => innerOpen && openPicker({ outer: innerOpen.outer, inner: innerOpen.inner }, role)}
        onRemove={(role, id) => innerOpen && remove({ outer: innerOpen.outer, inner: innerOpen.inner }, role, id)}
        onDelete={() => {
          if (!innerOpen || !openInner) return;
          save(
            {
              ...file,
              nodes: file.nodes.map((o) =>
                o.id !== innerOpen.outer
                  ? o
                  : {
                      ...o,
                      children: o.children.filter((c) => c.id !== innerOpen.inner),
                      members: o.members.map((m) => (m.housingHotelId === openInner.refId ? { ...m, housingHotelId: undefined } : m)),
                    },
              ),
            },
            "إزالة من ملف تشغيلي",
            name(openInner.refId),
          );
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
            save({ ...file, nodes: [...file.nodes, node] }, `إضافة ${bare(type.outer.name)} إلى ملف تشغيلي`, name(id));
            setAddOuter(false);
          } else if (addInnerTo) {
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
          يُحذف ملف {type.short} لموسم {file.season} بكل {type.outer.plural} و{type.inner.plural} وإسناداته ({stats.people} موظفاً). القوائم المرجعية والموظفون لا يتأثرون.
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

function OuterCard({
  type,
  file,
  node,
  shown,
  index,
  editable,
  placeOf,
  onPick,
  onRemove,
  onHousing,
  onOpenInner,
  onAddInner,
  onRemoveOuter,
}: {
  type: FileType;
  file: OpFile;
  node: OuterNode;
  /** The inner nodes to show (all of them, or those matching the search) */
  shown: InnerNode[];
  index: number;
  editable: boolean;
  placeOf: (id?: string) => Place | undefined;
  onPick: (role: Role, inner?: string) => void;
  onRemove: (role: Role, employeeId: string, inner?: string) => void;
  onHousing: (employeeId: string, hotelId: string) => void;
  onOpenInner: (inner: string) => void;
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
  const isCamp = type.inner.ref === "camps";
  const lead = rolesAt(type, "inner").find((r) => r.required);
  const name = (id?: string) => {
    const e = employees.find((x) => x.id === id);
    return e ? fullName(e) : undefined;
  };

  return (
    <Panel delay={Math.min(index, 4) * 0.05}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gold font-display text-xl font-bold text-ink">{outer?.order ?? "؟"}</span>
          <div>
            <p className="font-display text-2xl font-bold text-white">{outer?.name}</p>
            <p className="text-xs text-white/65">
              {outer?.sub} · {node.children.length} {type.inner.plural} · {formatNumber(pilgrims)} حاجاً · {people} موظفاً
            </p>
          </div>
        </div>
        {editable && (
          <div className="flex gap-2">
            <Button size="sm" variant="glass" onClick={onAddInner}>
              <Plus className="size-4" /> إضافة {isCamp ? "مخيم" : "برج"}
            </Button>
            <button
              onClick={onRemoveOuter}
              className="grid size-9 place-items-center rounded-xl text-white/50 hover:bg-maroon/40 hover:text-white"
              aria-label={`إزالة ${outer?.name}`}
              title="إزالة من الملف"
            >
              <Trash2 className="size-4" />
            </button>
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2.5 md:grid-cols-2">
        {rolesAt(type, "outer").map((r) => (
          <RoleBlock
            key={r.code}
            role={r}
            holders={node.members.filter((m) => m.role === r.code)}
            editable={editable}
            onAdd={() => onPick(r)}
            onRemove={(id) => onRemove(r, id)}
            extra={
              type.housing
                ? (m) =>
                    editable && housingOptions.length ? (
                      <label className="mt-1 flex items-center gap-1.5 text-[11px] text-white/60">
                        يسكن في
                        <select
                          value={m.housingHotelId ?? ""}
                          onChange={(e) => onHousing(m.employeeId, e.target.value)}
                          className="rounded-lg bg-white/10 px-1.5 py-0.5 text-[11px] text-white outline-none ring-1 ring-white/15 [&>option]:text-ink"
                        >
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

      {shown.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-dashed border-white/20 p-4 text-center text-sm text-white/55">لا {type.inner.plural} هنا بعد.</p>
      ) : (
        <ul className="mt-4 grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
          {shown.map((c) => {
            const p = placeOf(c.refId);
            if (!p) return null;
            const leadHolders = lead ? c.members.filter((m) => m.role === lead.code) : c.members;
            const ok = leadHolders.length > 0;
            const Icon = isCamp ? Tent : HotelIcon;
            return (
              <li key={c.id}>
                <button
                  onClick={() => onOpenInner(c.id)}
                  className={cn(
                    "block h-full w-full rounded-2xl p-4 text-right ring-1 transition hover:-translate-y-0.5",
                    ok ? "bg-white/[.06] ring-white/15 hover:ring-gold/50" : "bg-maroon/20 ring-maroon/60 hover:ring-maroon",
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-bold text-white">{p.name}</p>
                      <p className="text-[11px] text-white/60">{p.sub}</p>
                    </div>
                    <Icon className="size-5 shrink-0 text-gold/70" />
                  </div>
                  {(c.clusters.length > 0 || c.tent) && (
                    <p className="mt-2 flex flex-wrap gap-1">
                      {c.clusters.map((s) => (
                        <Chip key={s} tone="gold">
                          {clusterName(s)}
                        </Chip>
                      ))}
                      {c.tent && <Chip>{c.tent}</Chip>}
                    </p>
                  )}
                  {isCamp ? (
                    <p className="mt-3 text-xs text-white/70">
                      أعضاء المخيم:{" "}
                      {ok ? (
                        <span className="font-bold text-white">
                          {leadHolders
                            .slice(0, 2)
                            .map((m) => name(m.employeeId)?.split(" ")[0])
                            .join("، ")}
                          {leadHolders.length > 2 && ` +${leadHolders.length - 2}`}
                        </span>
                      ) : (
                        <span className="font-bold text-[#ffc9d8]">لا أحد بعد</span>
                      )}
                    </p>
                  ) : (
                    <>
                      <p className="mt-3 text-xs text-white/70">
                        {roleIn(type, "tower-supervisor").name}:{" "}
                        {ok ? <span className="font-bold text-white">{name(leadHolders[0].employeeId)}</span> : <span className="font-bold text-[#ffc9d8]">شاغر</span>}
                      </p>
                      <p className="mt-0.5 text-xs text-white/60">
                        المعاونون: {c.members.filter((m) => m.role === "tower-deputy").length} · أعضاء البعثة: {c.members.filter((m) => m.role === "mission-member").length}
                      </p>
                    </>
                  )}
                  {c.bodies && <p className="mt-1 text-[11px] text-white/55">جهات مخصّصة: {c.bodies}</p>}
                  <div className="mt-3">
                    <Occupancy file={file} node={c} place={p} />
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Panel>
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
  const what = level === "outer" ? type.outer : type.inner;
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
        <Field label="التقارير الدورية" hint={`يرفع المسؤولون في ${type.inner.plural} تقاريرهم إلى ${type.outer.plural} بهذا الإيقاع.`}>
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
