"use client";

import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { createElement, useMemo } from "react";
import { useHalls, type ExamCenter } from "@/app/administrator/_lib/halls";
import { itineraryOf, useAirportReps, useFlightsData, type Airport, type Flight, type TravelStatus } from "@/lib/flights";
import { CURRENT_SEASON, MISSIONS, fullName, inSeason, postingLabel, postingsOf, shortName, useEmployees, useOpFiles, usePlaces, type Employee, type Posting } from "@/lib/ops";
import { can, holdsAll, MANAGEMENT_PERMISSIONS, type Permission, type StaffUser } from "@/lib/staff";
import { useStaffAccounts } from "@/lib/systems";
import { digitsOnly, formatNumber } from "@/lib/utils";
import type { Alert, SystemStatus } from "../_components/system";

/**
 * The employees file seen whole, for its owner and for the director: the register and what its records
 * lack, the portal accounts and whose they are, and the season's participants — where each is posted and
 * on which flights. Every screen of the file reads from here, so a number is the same on the owner's
 * summary, his tabs and the director's board.
 */

/** What a record lacks to reach him and post him: the fields the form requires, for records that came in without them */
export function missingOf(e: Employee): string[] {
  return [digitsOnly(e.phoneSy).length < 10 && "هاتف سوريا", !/^\d{11}$/.test(e.nationalId) && "الرقم الوطني", e.kind === "external" && !e.organization?.trim() && "الجهة المنتدِبة"].filter((x): x is string => !!x);
}

/** Why he cannot leave the current season, when he cannot: he holds a post in one of its operational files */
export function seasonLock(posts: Posting[]) {
  return posts.length ? `مُسند في ${posts.map((p) => postingLabel(p, true)).join("، ")}. لا تُلغى مشاركته قبل أن يُزال من الملفات التشغيلية.` : null;
}

/** His seats this season, each way, as the flights file holds them */
export type Trip = { out?: Flight; back?: Flight; status: TravelStatus };
/** A participant in the current season, with his posts in its operational files and his flights */
export type Participant = { e: Employee; posts: Posting[]; trip: Trip };
/** A portal account: what it may open, the field posts other files gave it, and the record it belongs to */
export type AccountRow = { account: StaffUser; employee?: Employee; managed: Permission[]; halls: ExamCenter[]; airports: Airport[] };

export function useEmployeesDesk() {
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const accounts = useStaffAccounts();
  const halls = useHalls();
  const { airportsOf } = useAirportReps();
  const flights = useFlightsData();

  return useMemo(() => {
    const byName = (a: Employee, b: Employee) => fullName(a).localeCompare(fullName(b), "ar");
    const seasonFiles = files.filter((f) => f.season === CURRENT_SEASON);
    const postings = new Map<string, Posting[]>();
    for (const e of employees) {
      const p = postingsOf(e.id, seasonFiles, places);
      if (p.length) postings.set(e.id, p);
    }
    const postsOf = (id: string) => postings.get(id) ?? [];

    // Employees' seats only: the pilgrims' thousands are no concern of this file
    const seats = { flights: flights.flights, otherMeans: flights.otherMeans, assignments: flights.assignments.filter((a) => a.travelerKind === "employee") };
    const flightById = new Map(flights.flights.map((f) => [f.id, f]));
    const tripOf = (id: string): Trip => {
      const it = itineraryOf(id, seats);
      return { out: flightById.get(it.outbound?.flightId ?? ""), back: flightById.get(it.return?.flightId ?? ""), status: it.status };
    };

    // The register
    const permanent = employees.filter((e) => e.kind === "permanent").length;
    const suspended = employees.filter((e) => e.suspended);
    const incomplete = employees.filter((e) => missingOf(e).length > 0).sort(byName);
    const suspendedPosted = suspended.filter((e) => postings.has(e.id)).sort(byName);
    const titles = [...new Set(employees.map((e) => e.jobTitle))].map((t) => ({ title: t, n: employees.filter((e) => e.jobTitle === t).length })).sort((a, b) => b.n - a.n);

    // The accounts, each with the one record that names it
    const recordOf = new Map(employees.filter((e) => e.staffId).map((e) => [e.staffId!, e]));
    const accountRows: AccountRow[] = accounts.map((account) => ({
      account,
      employee: recordOf.get(account.id),
      managed: account.permissions.filter((p) => MANAGEMENT_PERMISSIONS.includes(p)),
      halls: halls.centersOf(account.id),
      airports: airportsOf(account.id).flatMap((id) => flights.airports.filter((a) => a.id === id)),
    }));
    const linked = accountRows.filter((r) => r.employee);
    const unlinked = accountRows.filter((r) => !r.employee);
    const withoutAccount = employees.filter((e) => !e.staffId).sort(byName);

    // The season
    const participants: Participant[] = employees
      .filter((e) => inSeason(e))
      .sort(byName)
      .map((e) => ({ e, posts: postsOf(e.id), trip: tripOf(e.id) }));
    const posted = participants.filter((p) => p.posts.length > 0);
    const free = participants.filter((p) => !p.e.suspended && !p.posts.length);
    const noOutbound = participants.filter((p) => !p.e.suspended && !p.trip.out && p.trip.status !== "otherMeans");
    const suspendedIn = participants.filter((p) => p.e.suspended);
    const outside = employees.filter((e) => !inSeason(e)).sort(byName);
    // Who posts them: the holders of the operational files, the director aside
    const posters = accounts.filter((a) => can(a, "ops.files") && !holdsAll(a)).map((a) => a.name);

    const missions = MISSIONS.map((m) => {
      const ps = participants.filter((p) => p.e.mission === m);
      return {
        mission: m,
        total: employees.filter((e) => e.mission === m).length,
        external: employees.filter((e) => e.mission === m && e.kind === "external").length,
        participants: ps.length,
        posted: ps.filter((p) => p.posts.length).length,
        free: ps.filter((p) => !p.e.suspended && !p.posts.length).length,
        noOutbound: ps.filter((p) => !p.e.suspended && !p.trip.out && p.trip.status !== "otherMeans").length,
        suspended: ps.filter((p) => p.e.suspended).length,
      };
    });

    // Blockers first, then the rest; each group in the order the work is done: register, accounts, season
    const alerts: Alert[] = [
      ...suspendedPosted.map((e) => ({
        id: `susp-${e.id}`,
        level: "high" as const,
        title: `${fullName(e)} موقوف وما زال مُسنداً`,
        hint: `${postsOf(e.id).map((p) => postingLabel(p, true)).join("، ")}: موقع ميداني يشغله من لا يعمل. أعده إلى العمل، أو يستبدله صاحب «الملفات التشغيلية».`,
        href: `/staff/employees/manage?e=${e.id}`,
        action: "افتح ملفه",
      })),
      ...(incomplete.length
        ? [{ id: "incomplete", level: "work" as const, title: `${incomplete.length} سجلات ناقصة البيانات`, hint: incomplete.slice(0, 3).map((e) => `${shortName(e)}: ${missingOf(e).join("، ")}`).join(" · "), href: "/staff/employees/manage?f=incomplete", action: "أكملها" }]
        : []),
      ...(unlinked.length
        ? [{ id: "unlinked", level: "work" as const, title: `${unlinked.length} حسابات دخول بلا سجل موظف`, hint: `${unlinked.map((r) => r.account.name).join("، ")}: لا تُعرف بياناتهم، ولا تصلهم كلمة مرور مؤقتة حتى تُربط حساباتهم بسجلاتهم.`, href: "/staff/employees/manage/accounts?f=unlinked", action: "اربطها" }]
        : []),
      ...(free.length
        ? [{ id: "free", level: "work" as const, title: `${free.length} مشاركين بلا موقع بعد`, hint: `مسجّلون في موسم ${CURRENT_SEASON} وليس لهم منصب في ملفاته التشغيلية. يسندهم ${posters.length ? posters.join(" و") : "صاحب «الملفات التشغيلية»"} من «الملفات التشغيلية»، وعليك أن تكون سجلاتهم مكتملة.`, href: "/staff/employees/manage/season?f=free", action: "اعرضهم" }]
        : []),
    ];

    return {
      employees,
      permanent,
      external: employees.length - permanent,
      suspended,
      incomplete,
      suspendedPosted,
      titles,
      postings,
      postsOf,
      accounts: accountRows,
      linked,
      unlinked,
      withoutAccount,
      participants,
      posted,
      free,
      noOutbound,
      suspendedIn,
      outside,
      posters,
      missions,
      alerts,
      high: alerts.filter((a) => a.level === "high"),
      badges: { register: suspendedPosted.length + incomplete.length, accounts: unlinked.length, season: free.length },
    };
  }, [employees, files, places, accounts, halls, airportsOf, flights]);
}

export type EmployeesDesk = ReturnType<typeof useEmployeesDesk>;

/** How the employees file stands on the director's page: its state, four numbers in work order, its blockers */
export function useEmployeesStatus(): SystemStatus {
  const desk = useEmployeesDesk();
  return {
    state: desk.high.length
      ? { label: `تحتاج متابعة (${desk.high.length})`, tone: "maroon", icon: createElement(AlertTriangle, { className: "size-4" }) }
      : { label: "تسير بانتظام", tone: "green", icon: createElement(CheckCircle2, { className: "size-4" }) },
    numbers: [
      { k: "سجل الموظفين", v: formatNumber(desk.employees.length), hint: `${desk.permanent} دائمون · ${desk.external} منتدبون` },
      { k: "حسابات مربوطة بسجلاتها", v: `${desk.linked.length} من ${desk.accounts.length}` },
      { k: `مشاركون في موسم ${CURRENT_SEASON}`, v: desk.participants.length, hint: desk.suspendedIn.length ? `${desk.suspendedIn.length} موقوفون منهم` : undefined },
      { k: "مُسندون في الملفات", v: desk.posted.length, hint: `${desk.free.length} متاحون للإسناد` },
    ],
    high: desk.high,
  };
}
