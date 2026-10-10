"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { FilterX, UserPlus } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { CURRENT_SEASON, GOVERNORATES, JOB_TITLES, MISSIONS, employeeHaystack, fullName, inSeason, matches, type Employee } from "@/lib/ops";
import { cn } from "@/lib/utils";
import { Avatar, FilterSelect, SearchBox } from "../_components/ops-ui";
import { AddButton, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { missingOf, useEmployeesDesk } from "./desk";
import { FilterLinks, HowTo, ListToolbar, MoreRows } from "./list-ui";
import { useSuspend } from "./sheet";

type View = "all" | "active" | "suspended" | "incomplete";
const PAGE = 40;
const inView = (v: View, e: Employee) => (v === "all" ? true : v === "suspended" ? !!e.suspended : v === "incomplete" ? missingOf(e).length > 0 : !e.suspended);

/**
 * The register, the first operation of the employees file, as a site's users list: its views with their
 * counts, a search, and a table whose rows open each employee's own screen (`/manage/edit?id=`), with
 * «تعديل | إيقاف» under his name. A link from the summary may ask for a view (`?f=incomplete`); an older
 * link to one employee (`?e=`) goes on to his screen. The records of this part wait closed at the end.
 */
export function Register() {
  const params = useSearchParams();
  const router = useRouter();
  const desk = useEmployeesDesk();
  const suspend = useSuspend();
  const { employees, postings } = desk;
  const asked = params.get("e");
  useEffect(() => {
    if (asked) router.replace(`/staff/employees/manage/edit?id=${asked}`);
  }, [asked, router]);

  const [view, setView] = useState<View>(params.get("f") === "incomplete" ? "incomplete" : "all");
  const [q, setQ] = useState("");
  const [kind, setKind] = useState("");
  const [mission, setMission] = useState("");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [shown, setShown] = useState(PAGE);

  const filtersOn = [kind, mission, title, city, gender, q].some(Boolean);
  const clear = () => [setKind, setMission, setTitle, setCity, setGender, setQ].forEach((f) => f(""));

  const rows = useMemo(
    () =>
      employees
        .filter((e) => inView(view, e))
        .filter((e) => !kind || e.kind === kind)
        .filter((e) => !mission || e.mission === mission)
        .filter((e) => !title || e.jobTitle === title)
        .filter((e) => !city || e.city === city)
        .filter((e) => !gender || e.gender === gender)
        .filter((e) => matches(q, employeeHaystack(e)))
        .sort((a, b) => fullName(a).localeCompare(fullName(b), "ar")),
    [employees, view, kind, mission, title, city, gender, q],
  );

  const usedTitles = JOB_TITLES.filter((t) => employees.some((e) => e.jobTitle === t));
  const usedCities = GOVERNORATES.filter((t) => employees.some((e) => e.city === t));
  const pick = (f: (v: string) => void) => (v: string) => {
    f(v);
    setShown(PAGE);
  };

  return (
    <div className="space-y-4">
      <Title
        action={
          <AddButton href="/staff/employees/manage/edit">
            <UserPlus className="size-4" /> إضافة موظف
          </AddButton>
        }
      />

      <ListToolbar
        filters={
          <FilterLinks<View>
            label="عرض السجل"
            value={view}
            onChange={(v) => {
              setView(v);
              setShown(PAGE);
            }}
            items={[
              { value: "all", label: "الكل", count: employees.length },
              { value: "active", label: "على رأس العمل", count: employees.length - desk.suspended.length },
              { value: "suspended", label: "موقوفون", count: desk.suspended.length },
              { value: "incomplete", label: "سجلات ناقصة", count: desk.incomplete.length, alert: true },
            ]}
          />
        }
      >
        <SearchBox className="flex-1" value={q} onChange={pick(setQ)} label="بحث في الموظفين" placeholder="اسم، مسمى، محافظة، هاتف، رقم وطني..." />
      </ListToolbar>

      <div className="flex flex-wrap items-center gap-2">
        <div className="grid flex-1 grid-cols-2 gap-2 md:grid-cols-5">
          <FilterSelect label="نوع الموظف" all="الدائمون والمنتدبون" value={kind} onChange={pick(setKind)} options={[{ value: "permanent", label: `الدائمون (${desk.permanent})` }, { value: "external", label: `المنتدبون (${desk.external})` }]} />
          <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={pick(setMission)} options={MISSIONS} />
          <FilterSelect label="المسمى الوظيفي" all="كل المسميات" value={title} onChange={pick(setTitle)} options={usedTitles} />
          <FilterSelect label="المحافظة" all="كل المحافظات" value={city} onChange={pick(setCity)} options={usedCities} />
          <FilterSelect label="الجنس" all="الجنسان" value={gender} onChange={pick(setGender)} options={[{ value: "male", label: "ذكور" }, { value: "female", label: "إناث" }]} />
        </div>
        {filtersOn && (
          <button onClick={clear} className="flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-bold text-gold hover:bg-white/10">
            <FilterX className="size-3.5" /> مسح ({rows.length})
          </button>
        )}
      </div>

      <ListTable head={["الموظف", "المحافظة", "البعثة", "الهاتف", `موسم ${CURRENT_SEASON}`]} minWidth="48rem">
        {rows.length === 0 ? (
          <EmptyRow cols={5}>لا أحد يطابق هذا البحث. جرّب كلمة أقصر، أو امسح التصفية.</EmptyRow>
        ) : (
          rows.slice(0, shown).map((e) => {
            const missing = missingOf(e);
            const href = `/staff/employees/manage/edit?id=${e.id}`;
            return (
              <tr key={e.id} className={cn("align-top", e.suspended && "opacity-60")}>
                <td className="p-3">
                  <div className="flex items-start gap-3">
                    <Avatar e={e} size="sm" />
                    <div className="min-w-0">
                      <Link href={href} className="font-bold text-white hover:text-gold">
                        {fullName(e)}
                      </Link>
                      <p className="text-xs text-white/65">
                        {e.jobTitle}
                        {e.kind === "external" && <span className="text-gold/90"> · منتدب من {e.organization}</span>}
                      </p>
                      {(e.staffId || e.suspended || missing.length > 0) && (
                        <p className="mt-1 flex flex-wrap gap-1">
                          {e.staffId && <Tag tone="gold">حساب بوابة</Tag>}
                          {e.suspended && <Tag tone="maroon">موقوف</Tag>}
                          {missing.length > 0 && <Tag tone="maroon">ناقص: {missing.join("، ")}</Tag>}
                        </p>
                      )}
                      <RowActions>
                        <RowLink href={href}>{missing.length ? "أكمل سجله" : "تعديل"}</RowLink>
                        <RowLink danger={!e.suspended} onClick={() => suspend.toggle(e)}>
                          {e.suspended ? "إعادته إلى العمل" : "إيقاف"}
                        </RowLink>
                      </RowActions>
                    </div>
                  </div>
                </td>
                <td className="p-3 text-white/85">{e.city}</td>
                <td className="p-3 text-white/85">{e.mission.replace("البعثة ", "")}</td>
                <td className="p-3 tabular-nums text-white/85" dir="ltr">
                  <span className="block text-right">{e.phoneSy || "—"}</span>
                </td>
                <td className="p-3">{postings.has(e.id) ? <Tag tone="gold">مُسند</Tag> : inSeason(e) ? <Tag tone="green">مشارك</Tag> : <span className="text-xs text-white/45">غير مشارك</span>}</td>
              </tr>
            );
          })
        )}
      </ListTable>
      <MoreRows left={rows.length - shown} step={PAGE} onMore={() => setShown((s) => s + PAGE)} />

      <HowTo>
        <p>موظفو الإدارة الدائمون ومن تنتدبهم الجهات الأخرى للموسم. افتح أي موظف باسمه لتعديل سجله، أو أضف موظفاً من الزر في الأعلى.</p>
        <p>البحث بأي جزء من الاسم أو المسمى أو المحافظة أو الهاتف أو آخر أرقام الرقم الوطني، ويتجاهل الهمزات والتشكيل.</p>
        <p>من المشاركين في الموسم وحدهم يُختار من يُسند إلى الملفات التشغيلية. وإيقاف من له موقع يصل إلى مديرة الموسم.</p>
      </HowTo>
      <RecordsBox system="staff" area="register" title="سجل الإضافة والتعديل والإيقاف" />
      {suspend.node}
    </div>
  );
}
