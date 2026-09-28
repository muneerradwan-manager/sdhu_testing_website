"use client";

import { motion } from "motion/react";
import { Briefcase, ChevronLeft, Eye, FilterX, Plane, UserCheck, UserPlus, UsersRound, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import {
  CURRENT_SEASON,
  GOVERNORATES,
  JOB_TITLES,
  MISSIONS,
  employeeHaystack,
  fullName,
  inSeason,
  matches,
  newId,
  opsActions,
  postingLabel,
  postingsOf,
  useEmployees,
  usePlaces,
  useOpFiles,
  type Employee,
} from "@/lib/ops";
import { SEASON } from "@/lib/season";
import { can, getStaff, PERMISSION_LABELS } from "@/lib/staff";
import { cn, formatNumber } from "@/lib/utils";
import { Drawer, Empty, Gate, Kpi, PageHeader, Panel, Tabs, logAs, useStaffUser } from "../_components/kit";
import { Avatar, Chip, FilterSelect, InfoGrid, SearchBox, SectionTitle } from "../_components/ops-ui";
import { MyFiles } from "../my-files/my-files";
import { EmployeeForm, emptyDraft, type Draft } from "./employee-form";

export function EmployeesView() {
  return (
    <Gate perms={["staff.create", "ops.files"]}>
      <Employees />
    </Gate>
  );
}

type Kind = "all" | "permanent" | "external";
const PAGE = 40;

function Employees() {
  const user = useStaffUser()!;
  const toast = useToast();
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const canEdit = can(user, "staff.create");

  const [kind, setKind] = useState<Kind>("all");
  const [q, setQ] = useState("");
  const [mission, setMission] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [season, setSeason] = useState("");
  const [posted, setPosted] = useState("");
  const [status, setStatus] = useState("");
  const [shown, setShown] = useState(PAGE);
  const [openId, setOpenId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Draft | null>(null);

  const currentFiles = useMemo(() => files.filter((f) => f.season === CURRENT_SEASON), [files]);
  const postings = useMemo(() => {
    const m = new Map<string, ReturnType<typeof postingsOf>>();
    for (const e of employees) {
      const p = postingsOf(e.id, currentFiles, places);
      if (p.length) m.set(e.id, p);
    }
    return m;
  }, [employees, currentFiles, places]);

  const filtersOn = [mission, title, city, gender, season, posted, status].some(Boolean);
  const clear = () => {
    [setMission, setTitle, setCity, setGender, setSeason, setPosted, setStatus].forEach((f) => f(""));
    setQ("");
  };

  const rows = useMemo(
    () =>
      employees
        .filter((e) => kind === "all" || e.kind === kind)
        .filter((e) => !mission || e.mission === mission)
        .filter((e) => !title || e.jobTitle === title)
        .filter((e) => !city || e.city === city)
        .filter((e) => !gender || e.gender === gender)
        .filter((e) => !season || (season === "in" ? inSeason(e) : !inSeason(e)))
        .filter((e) => !posted || (posted === "yes" ? postings.has(e.id) : inSeason(e) && !e.suspended && !postings.has(e.id)))
        .filter((e) => !status || (status === "suspended" ? e.suspended : !e.suspended))
        .filter((e) => matches(q, employeeHaystack(e)))
        .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar")),
    [employees, kind, mission, title, city, gender, season, posted, status, q, postings],
  );

  const participants = employees.filter((e) => inSeason(e) && !e.suspended);
  const free = participants.filter((e) => !postings.has(e.id)).length;
  const usedTitles = JOB_TITLES.filter((t) => employees.some((e) => e.jobTitle === t));
  const usedCities = GOVERNORATES.filter((t) => employees.some((e) => e.city === t));
  const open = employees.find((e) => e.id === openId) ?? null;

  const save = (d: Draft) => {
    const before = d.id ? employees.find((e) => e.id === d.id) : undefined;
    const e: Employee = { ...d, id: d.id ?? newId("E") };
    opsActions.saveEmployee(e);
    logAs(user, before ? { action: "تعديل بيانات موظف", target: fullName(e), before: fullName(before), after: fullName(e) } : { action: "إضافة موظف", target: fullName(e), detail: `${e.jobTitle} — ${e.mission}` });
    toast({ title: before ? "حُفظت التعديلات" : "أُضيف الموظف", body: fullName(e), tone: "success", icon: "✅" });
    setEditing(null);
    setOpenId(e.id);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="الموارد البشرية"
        icon={<UsersRound />}
        title="الموظفون"
        description="سجل موظفي الإدارة ومن تنتدبهم الجهات الأخرى للموسم. ابحث بأي جزء من الاسم أو المسمى أو المحافظة أو الهاتف أو آخر أرقام الرقم الوطني. ومن هذه القائمة يُختار من يُسند إلى الملفات التشغيلية."
        actions={
          canEdit && (
            <Button variant="gold" onClick={() => setEditing(emptyDraft())}>
              <UserPlus className="size-4" /> إضافة موظف
            </Button>
          )
        }
      />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi label="كل الموظفين" value={employees.length} icon={<UsersRound />} hint={`${employees.filter((e) => e.kind === "permanent").length} دائمون · ${employees.filter((e) => e.kind === "external").length} منتدبون`} />
        <Kpi label={`مشاركون في موسم ${CURRENT_SEASON}`} value={participants.length} icon={<Plane />} tone="teal" delay={0.05} hint="يسافرون مع البعثة هذا الموسم" />
        <Kpi label="مُسندون في الملفات" value={postings.size} icon={<Briefcase />} tone="gold" delay={0.1} hint={`في ملفات موسم ${CURRENT_SEASON}`} />
        <Kpi label="متاحون للإسناد" value={free} icon={<UserCheck />} tone="maroon" delay={0.15} hint="مشاركون بلا موقع بعد" />
      </div>

      <Panel bodyClass="space-y-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <Tabs<Kind>
            id="emp-kind"
            value={kind}
            onChange={(v) => {
              setKind(v);
              setShown(PAGE);
            }}
            tabs={[
              { value: "all", label: "الكل", count: employees.length },
              { value: "permanent", label: "الدائمون", count: employees.filter((e) => e.kind === "permanent").length },
              { value: "external", label: "المنتدبون", count: employees.filter((e) => e.kind === "external").length },
            ]}
          />
          <SearchBox
            className="flex-1"
            value={q}
            onChange={(v) => {
              setQ(v);
              setShown(PAGE);
            }}
            label="بحث في الموظفين"
            placeholder="اسم، مسمى وظيفي، محافظة، هاتف، رقم وطني..."
          />
        </div>
        <div className="grid grid-cols-2 gap-2 lg:grid-cols-4 xl:grid-cols-7">
          <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={setMission} options={MISSIONS} />
          <FilterSelect label="المسمى الوظيفي" all="كل المسميات" value={title} onChange={setTitle} options={usedTitles} />
          <FilterSelect label="المحافظة" all="كل المحافظات" value={city} onChange={setCity} options={usedCities} />
          <FilterSelect label="الجنس" all="الجنسان" value={gender} onChange={setGender} options={[{ value: "male", label: "ذكور" }, { value: "female", label: "إناث" }]} />
          <FilterSelect label="الموسم" all={`موسم ${CURRENT_SEASON}: الكل`} value={season} onChange={setSeason} options={[{ value: "in", label: "مشاركون" }, { value: "out", label: "غير مشاركين" }]} />
          <FilterSelect label="الإسناد" all="الإسناد: الكل" value={posted} onChange={setPosted} options={[{ value: "yes", label: "مُسندون" }, { value: "free", label: "متاحون للإسناد" }]} />
          <FilterSelect label="الحالة" all="الحالة: الكل" value={status} onChange={setStatus} options={[{ value: "active", label: "على رأس العمل" }, { value: "suspended", label: "موقوفون" }]} />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
          <p className="text-white/75">
            <span className="font-bold text-white tabular-nums">{formatNumber(rows.length)}</span> موظفاً
            {(q || filtersOn) && " يطابقون البحث"}
          </p>
          {(q || filtersOn) && (
            <button onClick={clear} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
              <FilterX className="size-3.5" /> مسح البحث والتصفية
            </button>
          )}
        </div>
      </Panel>

      <Panel bodyClass="-mx-5 md:-mx-6" delay={0.05}>
        {rows.length === 0 ? (
          <div className="px-5 md:px-6">
            <Empty icon={<UserX />} title="لا أحد يطابق هذا البحث" text="جرّب كلمة أقصر، أو امسح التصفية. البحث يتجاهل الهمزات والتشكيل." />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[52rem] text-sm">
              <thead>
                <tr className="border-b border-white/10 text-right text-xs text-gold">
                  <th className="px-5 pb-3 font-bold md:px-6">الموظف</th>
                  <th className="pb-3 font-bold">المحافظة</th>
                  <th className="pb-3 font-bold">البعثة</th>
                  <th className="pb-3 font-bold">الهاتف</th>
                  <th className="pb-3 font-bold">موسم {CURRENT_SEASON}</th>
                  <th className="pb-3 font-bold">الإسناد</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody className="divide-y divide-white/10">
                {rows.slice(0, shown).map((e, i) => {
                  const p = postings.get(e.id);
                  return (
                    <motion.tr
                      key={e.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: Math.min(i, 20) * 0.015 }}
                      onClick={() => setOpenId(e.id)}
                      className={cn("cursor-pointer transition hover:bg-white/[.05]", e.suspended && "opacity-60")}
                    >
                      <td className="px-5 py-2.5 md:px-6">
                        <div className="flex items-center gap-3">
                          <Avatar e={e} />
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 font-bold text-white">
                              {fullName(e)}
                              {e.staffId && <Chip tone="gold">حساب بوابة</Chip>}
                              {e.suspended && <Chip tone="maroon">موقوف</Chip>}
                            </p>
                            <p className="text-xs text-white/65">
                              {e.jobTitle}
                              {e.kind === "external" && <span className="text-gold/90"> · منتدب من {e.organization}</span>}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="py-2.5 text-white/85">{e.city}</td>
                      <td className="py-2.5 text-white/85">{e.mission.replace("البعثة ", "")}</td>
                      <td className="py-2.5 tabular-nums text-white/85" dir="ltr">
                        <span className="block text-right">{e.phoneSy}</span>
                      </td>
                      <td className="py-2.5">{inSeason(e) ? <Chip tone="green">مشارك</Chip> : <span className="text-xs text-white/45">غير مشارك</span>}</td>
                      <td className="py-2.5">
                        {p ? (
                          <span className="block max-w-[15rem] truncate text-xs font-semibold text-gold" title={p.map((x) => postingLabel(x, true)).join("، ")}>
                            {postingLabel(p[0], true)}
                            {p.length > 1 && ` +${p.length - 1}`}
                          </span>
                        ) : inSeason(e) && !e.suspended ? (
                          <span className="flex items-center gap-1.5 text-xs font-bold text-white/85"><span className="size-1.5 rounded-full bg-green-light" />متاح</span>
                        ) : (
                          <span className="text-xs text-white/40">—</span>
                        )}
                      </td>
                      <td className="py-2.5 pl-4 text-white/40">
                        <ChevronLeft className="size-4" />
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
            {rows.length > shown && (
              <div className="mt-4 text-center">
                <Button variant="glass" size="sm" onClick={() => setShown((s) => s + PAGE)}>
                  عرض {Math.min(PAGE, rows.length - shown)} آخرين — بقي {rows.length - shown}
                </Button>
              </div>
            )}
          </div>
        )}
      </Panel>

      <Drawer open={!!open && !editing} onClose={() => setOpenId(null)} title="ملف الموظف" width="max-w-xl">
        {open && <Detail e={open} canEdit={canEdit} onEdit={() => setEditing({ ...open })} />}
      </Drawer>

      <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing?.id ? `تعديل: ${fullName(editing)}` : "إضافة موظف"} width="max-w-2xl">
        {editing && <EmployeeForm key={editing.id ?? "new"} initial={editing} all={employees} onSave={save} onCancel={() => setEditing(null)} />}
      </Drawer>
    </div>
  );
}

function Detail({ e, canEdit, onEdit }: { e: Employee; canEdit: boolean; onEdit: () => void }) {
  const user = useStaffUser()!;
  const toast = useToast();
  const files = useOpFiles();
  const places = usePlaces();
  const all = postingsOf(e.id, files, places).sort((a, b) => b.file.season - a.file.season);
  const current = all.filter((p) => p.file.season === CURRENT_SEASON);
  const account = getStaff(e.staffId);
  const [preview, setPreview] = useState(false);

  const toggleSuspend = () => {
    const next = { ...e, suspended: !e.suspended || undefined };
    opsActions.saveEmployee(next);
    logAs(user, { action: e.suspended ? "إعادة موظف إلى العمل" : "إيقاف موظف", target: fullName(e) });
    toast({ title: e.suspended ? "عاد إلى العمل" : "أُوقف الموظف", body: e.suspended ? undefined : current.length ? "ما زال مُسنداً في ملف التسكين — استبدله من صفحة الملف." : undefined, tone: e.suspended ? "success" : "warning", icon: e.suspended ? "✅" : "⏸️" });
  };

  const toggleSeason = () => {
    if (inSeason(e) && current.length) {
      toast({ title: "لا يمكن إلغاء مشاركته الآن", body: `مُسند في ${current.map((x) => postingLabel(x, true)).join("، ")}. أزله من الملفات أولاً.`, tone: "warning", icon: "⚠️" });
      return;
    }
    const seasons = inSeason(e) ? e.seasons.filter((y) => y !== CURRENT_SEASON) : [...e.seasons, CURRENT_SEASON].sort();
    opsActions.saveEmployee({ ...e, seasons });
    logAs(user, { action: inSeason(e) ? `إلغاء مشاركة موظف في موسم ${CURRENT_SEASON}` : `تسجيل موظف في موسم ${CURRENT_SEASON}`, target: fullName(e) });
  };

  return (
    <div>
      <div className="flex items-start gap-4">
        <Avatar e={e} size="lg" />
        <div className="min-w-0 flex-1">
          <p className="font-display text-2xl font-bold text-white">{fullName(e)}</p>
          <p className="text-sm text-white/70">
            {e.jobTitle} · {e.mission}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Chip tone={e.kind === "permanent" ? "muted" : "gold"}>{e.kind === "permanent" ? "موظف دائم" : `منتدب — ${e.organization}`}</Chip>
            {inSeason(e) ? <Chip tone="green">مشارك في {CURRENT_SEASON}</Chip> : <Chip>غير مشارك في {CURRENT_SEASON}</Chip>}
            {e.suspended && <Chip tone="maroon">موقوف</Chip>}
          </div>
        </div>
      </div>

      {canEdit && (
        <div className="mt-4 flex flex-wrap gap-2">
          <Button size="sm" variant="gold" onClick={onEdit}>
            تعديل البيانات
          </Button>
          <Button size="sm" variant="glass" onClick={toggleSeason}>
            {inSeason(e) ? `إلغاء المشاركة في ${CURRENT_SEASON}` : `تسجيله في موسم ${CURRENT_SEASON}`}
          </Button>
          <Button size="sm" variant="glass" className={e.suspended ? "" : "hover:bg-maroon/50"} onClick={toggleSuspend}>
            {e.suspended ? "إعادته إلى العمل" : "إيقاف"}
          </Button>
        </div>
      )}
      {e.notes && <p className="mt-4 rounded-2xl bg-gold/10 p-3 text-sm leading-6 text-gold ring-1 ring-gold/25">{e.notes}</p>}

      <SectionTitle
        action={
          all.length > 0 && (
            <button onClick={() => setPreview(true)} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
              <Eye className="size-3.5" /> صفحته كما يراها
            </button>
          )
        }
      >
        المواقع في الملفات التشغيلية
      </SectionTitle>
      <Drawer open={preview} onClose={() => setPreview(false)} title={`ملفات ${fullName(e)} التشغيلية — كما تظهر له`} width="max-w-5xl">
        <MyFiles employee={e} />
      </Drawer>
      {all.length === 0 ? (
        <p className="text-sm text-white/60">لم يُسند إلى أي ملف تشغيلي بعد.</p>
      ) : (
        <ul className="space-y-2">
          {all.map((p, i) => (
            <li key={i} className={cn("rounded-2xl p-3 ring-1", p.file.season === CURRENT_SEASON ? "bg-gold/10 ring-gold/30" : "bg-white/5 ring-white/10")}>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-bold text-white">{p.role.name}</p>
                <Chip tone={p.file.season === CURRENT_SEASON ? "gold" : "muted"}>موسم {p.file.season}</Chip>
              </div>
              <p className="mt-0.5 text-xs text-white/70">
                {p.type.short}
                {p.outer && ` · ${p.outer.name}`}
                {p.inner && ` · ${p.inner.name}`}
              </p>
              {p.housing && <p className="text-xs text-white/55">يسكن في: {p.housing.name}</p>}
            </li>
          ))}
        </ul>
      )}

      <SectionTitle>البيانات الشخصية</SectionTitle>
      <InfoGrid
        rows={[
          ["الاسم الأول", e.firstName],
          ["اسم الأب", e.fatherName],
          ["الكنية", e.surname],
          ["الجنس", e.gender === "male" ? "ذكر" : "أنثى"],
          ["سنة الميلاد", `${e.birthYear} (${SEASON.gregorianYear - e.birthYear} سنة في موسم الحج)`],
          ["الرقم الوطني", <span key="n" dir="ltr" className="tabular-nums">{e.nationalId}</span>],
          ["المحافظة", e.city],
          ["اللغات", e.languages.join("، ")],
        ]}
      />

      <SectionTitle>التواصل</SectionTitle>
      <InfoGrid
        rows={[
          ["هاتف سوريا", <span key="s" dir="ltr" className="tabular-nums">{e.phoneSy}</span>],
          ["هاتف السعودية", e.phoneSa && <span key="a" dir="ltr" className="tabular-nums">{e.phoneSa}</span>],
          ["البريد الإلكتروني", e.email && <span key="m" dir="ltr">{e.email}</span>],
        ]}
      />

      <SectionTitle>المواسم التي شارك فيها</SectionTitle>
      <div className="flex flex-wrap gap-1.5">
        {[1443, 1444, 1445, 1446, 1447, CURRENT_SEASON].map((y) => (
          <span key={y} className={cn("rounded-xl px-3 py-1.5 text-sm font-bold tabular-nums ring-1", e.seasons.includes(y) ? "bg-green-light/20 text-white ring-green-light/40" : "text-white/30 ring-white/10")}>
            {y}
          </span>
        ))}
      </div>
      <p className="mt-2 text-xs text-white/55">مواسم سابقة مع البعثة: {e.seasons.filter((y) => y < CURRENT_SEASON).length}</p>

      {account && (
        <>
          <SectionTitle>حساب بوابة الموظفين</SectionTitle>
          <p className="text-sm text-white/80">
            اسم الدخول <span className="font-bold text-gold">{account.username}</span> — {account.title}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {account.permissions.map((p) => (
              <Chip key={p}>{PERMISSION_LABELS[p]}</Chip>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
