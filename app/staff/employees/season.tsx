"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { CURRENT_SEASON, MISSIONS, employeeHaystack, fullName, matches, postingLabel, type Employee } from "@/lib/ops";
import { cn } from "@/lib/utils";
import { useCan } from "../_components/kit";
import { Avatar, FilterSelect, SearchBox } from "../_components/ops-ui";
import { AddButton, EmptyRow, ListTable, RecordsBox, RowActions, RowLink, Tag, Title } from "../_components/wp";
import { useEmployeesDesk } from "./desk";
import { FilterLinks, HowTo, ListToolbar, MoreRows } from "./list-ui";
import { useEmployeeActions } from "./sheet";

/** The views of the list: the participants, those in one state, or those not taking part */
type View = "in" | "posted" | "free" | "noflight" | "suspended" | "out";
const VIEWS: View[] = ["posted", "free", "noflight", "suspended", "out"];
const PAGE = 40;

/**
 * Participation in the current season, the last operation of the employees file, as a list: its views with
 * their counts (participants, posted, free to post, without an outbound flight, suspended — and those not
 * taking part), a search, and a table whose rows open each employee's screen, with «إلغاء المشاركة» or
 * «تسجيله في الموسم» under his name. Leaving is barred to whoever holds a post, here and on his screen.
 * A link from the summary opens a view (`?f=free`). The records of this part wait closed at the end.
 */
export function Season() {
  const params = useSearchParams();
  const router = useRouter();
  const desk = useEmployeesDesk();
  const act = useEmployeeActions();
  const may = useCan();
  const asked = params.get("e");
  useEffect(() => {
    if (asked) router.replace(`/staff/employees/manage/edit?id=${asked}`);
  }, [asked, router]);
  const [view, setView] = useState<View>(VIEWS.find((v) => v === params.get("f")) ?? "in");
  const [mission, setMission] = useState("");
  const [q, setQ] = useState("");
  const [shown, setShown] = useState(PAGE);
  const go = (v: View) => {
    setView(v);
    setShown(PAGE);
  };

  const lists: Record<Exclude<View, "in" | "out">, { e: Employee }[]> = { posted: desk.posted, free: desk.free, noflight: desk.noOutbound, suspended: desk.suspendedIn };
  const only = view !== "in" && view !== "out" ? new Set(lists[view].map((p) => p.e.id)) : null;
  const participants = desk.participants.filter((p) => (!only || only.has(p.e.id)) && (!mission || p.e.mission === mission) && matches(q, employeeHaystack(p.e)));
  const outside = desk.outside.filter((e) => (!mission || e.mission === mission) && matches(q, employeeHaystack(e, may("staff.employees-pii.GET"))));
  const count = view === "out" ? outside.length : participants.length;
  const edit = (e: Employee) => `/staff/employees/manage/edit?id=${e.id}`;

  const who = (e: Employee) => (
    <div className="flex items-start gap-3">
      <Avatar e={e} size="sm" />
      <div className="min-w-0">
        <Link href={edit(e)} className="font-bold text-white hover:text-gold">
          {fullName(e)}
        </Link>
        {e.suspended && (
          <span className="ms-1.5">
            <Tag tone="maroon">موقوف</Tag>
          </span>
        )}
        <p className="text-xs text-white/65">
          {e.jobTitle} · {e.mission.replace("البعثة ", "")}
        </p>
        <RowActions>
          <RowLink href={edit(e)}>{may("staff.employees.PUT") ? "تعديل" : "عرض"}</RowLink>
          {view === "out"
            ? may("staff.season-participation.POST") && <RowLink onClick={() => act.setSeason(e, true)}>تسجيله في الموسم</RowLink>
            : may("staff.season-participation.DELETE") && (
                <RowLink danger onClick={() => act.setSeason(e, false)}>
                  إلغاء المشاركة
                </RowLink>
              )}
        </RowActions>
      </div>
    </div>
  );

  return (
    <div className="space-y-4">
      <Title
        action={
          view !== "out" &&
          may("staff.season-participation.POST") && (
            <AddButton onClick={() => go("out")}>
              <UserPlus className="size-4" /> تسجيل موظف في الموسم
            </AddButton>
          )
        }
      />

      <ListToolbar
        filters={
          <FilterLinks<View>
            label="عرض المشاركين"
            value={view}
            onChange={go}
            items={[
              { value: "in", label: "المشاركون", count: desk.participants.length },
              { value: "posted", label: "مُسندون", count: desk.posted.length },
              { value: "free", label: "متاحون للإسناد", count: desk.free.length },
              { value: "noflight", label: "بلا رحلة ذهاب", count: desk.noOutbound.length },
              { value: "suspended", label: "موقوفون", count: desk.suspendedIn.length, alert: true },
              { value: "out", label: "غير المشاركين", count: desk.outside.length },
            ]}
          />
        }
      >
        <SearchBox
          className="flex-1"
          value={q}
          onChange={(v) => {
            setQ(v);
            setShown(PAGE);
          }}
          label="بحث في المشاركين"
          placeholder="اسم، مسمى وظيفي، محافظة، هاتف..."
        />
        <div className="sm:w-44">
          <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={setMission} options={MISSIONS} />
        </div>
      </ListToolbar>

      {view === "out" ? (
        <ListTable head={["الموظف", "المواسم السابقة"]} minWidth="36rem">
          {outside.length === 0 ? (
            <EmptyRow cols={2}>{q || mission ? "لا أحد يطابق هذا البحث." : "كل الموظفين مشاركون في الموسم."}</EmptyRow>
          ) : (
            outside.slice(0, shown).map((e) => (
              <tr key={e.id} className={cn("align-top", e.suspended && "opacity-60")}>
                <td className="p-3">{who(e)}</td>
                <td className="p-3 text-xs tabular-nums text-white/75">{e.seasons.length ? e.seasons.join("، ") : "لم يشارك بعد"}</td>
              </tr>
            ))
          )}
        </ListTable>
      ) : (
        <ListTable head={["المشارك", "مواقعه في الملفات", "الذهاب", "العودة"]} minWidth="48rem">
          {participants.length === 0 ? (
            <EmptyRow cols={4}>{q || mission || view !== "in" ? "لا أحد هنا يطابق هذا البحث." : "لم يُسجَّل أحد في الموسم بعد."}</EmptyRow>
          ) : (
            participants.slice(0, shown).map(({ e, posts, trip }) => (
              <tr key={e.id} className={cn("align-top", e.suspended && "bg-maroon/10")}>
                <td className="p-3">{who(e)}</td>
                <td className="p-3">
                  {posts.length ? (
                    <span className="block max-w-[16rem] text-xs font-semibold leading-5 text-gold">{posts.map((p) => postingLabel(p, true)).join("، ")}</span>
                  ) : e.suspended ? (
                    <span className="text-xs text-white/40">—</span>
                  ) : (
                    <span className="flex items-center gap-1.5 text-xs font-bold text-white/85">
                      <span className="size-1.5 rounded-full bg-green-light" />
                      متاح للإسناد
                    </span>
                  )}
                </td>
                <td className="p-3">{trip.out ? <span className="font-mono text-xs font-bold text-white" dir="ltr">{trip.out.flightNo}</span> : <span className="text-xs text-white/45">{trip.status === "otherMeans" ? "وسيلة أخرى" : "—"}</span>}</td>
                <td className="p-3">{trip.back ? <span className="font-mono text-xs font-bold text-white" dir="ltr">{trip.back.flightNo}</span> : <span className="text-xs text-white/45">—</span>}</td>
              </tr>
            ))
          )}
        </ListTable>
      )}
      <MoreRows left={count - shown} step={PAGE} onMore={() => setShown((s) => s + PAGE)} />

      <HowTo>
        <p>
          المشارك في موسم {CURRENT_SEASON} وحده يظهر في قوائم الإسناد في الملفات التشغيلية وفي قوائم الطيران: يسنده {desk.posters.length ? desk.posters.join(" و") : "صاحب «الملفات التشغيلية»"} إلى موقعه، ويضعه صاحب «إدارة الطيران» على رحلتيه.
        </p>
        <p>لا تُلغى مشاركة من أُسند إلى موقع قبل أن يُزال منه، وإلغاء أي مشاركة يصل إلى مدير الموسم.</p>
      </HowTo>
      <RecordsBox system="staff" area="season" title="سجل المشاركة في الموسم" />
    </div>
  );
}
