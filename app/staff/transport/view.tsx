"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Bus } from "lucide-react";
import { useMemo } from "react";
import { groupName } from "@/lib/groups";
import { ageOf, fullName } from "@/lib/registry";
import { useStore } from "@/lib/store";
import { useAllEvents, useTicketQueue } from "../_components/data";
import { can, Gate, PageHeader, useStaffUser } from "../_components/kit";
import { EmptyRow, ListTable, Tag } from "../_components/wp";
import { Segments } from "../exam/_components/ui";
import { Reports } from "../medical/view";
import { ClusterBuses } from "./buses";
import { viewKeys } from "@/lib/permissions";

type View = "reports" | "needs" | "buses";

/** Needs recorded in a health file that a bus has to be ready for */
const MOBILITY = ["كرسي متحرك", "صعوبة في المشي", "أكسجين ليلي"];

/**
 * «المواصلات»: the transport team's work. Its reports from the field (a late bus, a driver who did not come);
 * the pilgrims a bus must be ready for — a wheelchair, difficulty walking, oxygen, or 75 and over — by group,
 * from the coordinators' health files; and the buses it gives each cluster for each list before the rites (and the
 * Rawdah's slots), which the clusters' coordinators fill in «القوائم» — with the extra buses the operations room planned.
 */
export function TransportView() {
  return (
    <Gate perms={viewKeys("transport")}>
      <Transport />
    </Gate>
  );
}

/** The resource each part shows: viewing it opens the part */
const VIEW_RESOURCE: Record<View, string> = { reports: "tickets", needs: "needs", buses: "buses" };

function Transport() {
  const params = useSearchParams();
  const router = useRouter();
  const user = useStaffUser()!;
  const allowed = (["reports", "needs", "buses"] as const).filter((v) => can(user, `transport.${VIEW_RESOURCE[v]}.GET`) || (v === "buses" && can(user, "transport.bus-requests.GET")));
  const asked = (params.get("view") as View) ?? "reports";
  const view = allowed.includes(asked) ? asked : allowed[0];
  const applications = useStore((s) => s.applications);
  const post = useStore((s) => s.post);
  const tickets = useTicketQueue();
  const events = useAllEvents();
  const reports = tickets.filter((t) => t.kind === "transport");
  const extraBus = events.some((e) => e.action === "اعتماد حافلة إضافية");

  const needs = useMemo(
    () =>
      Object.values(applications).flatMap((app) => {
        const p = post[app.applicantId];
        return app.members.flatMap((m) => {
          const rec = p?.health?.members[m.person.id];
          const mobility = rec ? rec.needs.filter((n) => MOBILITY.includes(n)) : [];
          const elderly = ageOf(m.person) >= 75;
          if (!mobility.length && !elderly) return [];
          return [{ app, name: fullName(m.person), age: ageOf(m.person), mobility, group: p?.groupNumber, companion: app.members.find((x) => x.companionId === m.person.id || m.companionId === x.person.id)?.person.firstName }];
        });
      }),
    [applications, post],
  );

  return (
    <div className="space-y-5">
      <PageHeader eyebrow="فريق المواصلات" title="المواصلات" icon={<Bus />} description="بلاغات النقل من الميدان، ومن تحتاج حافلاتهم تجهيزاً خاصاً، وحافلات كل تكتل لقوائم المناسك." />
      <Segments
        value={view}
        onChange={(v) => router.replace(v === "reports" ? "/staff/transport" : `/staff/transport?view=${v}`)}
        label="القسم"
        items={[
          { value: "reports" as const, label: "بلاغات النقل", count: reports.filter((t) => t.status !== "resolved").length, tone: "maroon" as const },
          { value: "needs" as const, label: "حجاج يحتاجون تجهيزاً", count: needs.length },
          { value: "buses" as const, label: "حافلات التكتلات" },
        ].filter((x) => allowed.includes(x.value))}
      />
      {view === "reports" && <Reports tickets={reports} empty="لا بلاغات نقل." system="transport" />}
      {view === "needs" && (
        <ListTable head={["الحاج", "المجموعة", "ما تحتاجه الحافلة", "مرافقه"]}>
          {needs.length === 0 && <EmptyRow cols={4}>لا أحد بعد. يظهر هنا من سجّل له منسق مجموعته كرسياً متحركاً أو صعوبة في المشي أو أكسجيناً، ومن بلغ 75 عاماً.</EmptyRow>}
          {needs.map((n, i) => (
            <tr key={i} className="align-top">
              <td className="p-3 font-bold">
                {n.name}
                <span className="block text-xs font-normal text-white/55">
                  {n.age} عاماً — طلب {n.app.number}
                </span>
              </td>
              <td className="p-3 text-white/80">{n.group ? groupName(n.group) : "لم يُلحق بمجموعة بعد"}</td>
              <td className="p-3">
                <span className="flex flex-wrap gap-1">
                  {n.mobility.map((x) => (
                    <Tag key={x} tone="gold">
                      {x}
                    </Tag>
                  ))}
                  {n.age >= 75 && <Tag>مقعد قريب من الباب</Tag>}
                </span>
              </td>
              <td className="p-3 text-white/80">{n.companion ?? "—"}</td>
            </tr>
          ))}
        </ListTable>
      )}
      {view === "buses" && <ClusterBuses />}
      {view === "buses" && (
        <ListTable head={["المسار", "الحافلات", "المقاعد", "المسجّلون", "الحالة"]}>
          <tr>
            <td className="p-3 font-bold">
              عرفة ← مزدلفة: الحافلات المبكرة لكبار السن
              <span className="block text-xs font-normal text-white/55">تقررها غرفة العمليات، وينفّذها فريق المواصلات</span>
            </td>
            <td className="p-3 tabular-nums">{extraBus ? 9 : 8}</td>
            <td className="p-3 tabular-nums">{extraBus ? 450 : 400}</td>
            <td className="p-3 tabular-nums">430</td>
            <td className="p-3">{extraBus ? <Tag tone="green">اعتُمدت الحافلة التاسعة</Tag> : <Tag tone="maroon">المقاعد أقل من المسجّلين — بانتظار غرفة العمليات</Tag>}</td>
          </tr>
        </ListTable>
      )}
    </div>
  );
}
