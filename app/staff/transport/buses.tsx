"use client";

import { Check, Inbox, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/widgets";
import { allClusterIds, clusterName } from "@/lib/flights";
import { LIST_KINDS, listKind, listsActions, plannedUnits, useClusterUnits, useLists, type ListKind } from "@/lib/rite-lists";
import { smallInputClass, useStaffUser } from "../_components/kit";
import { EmptyRow, ListTable, Tag } from "../_components/wp";

/**
 * The buses each cluster rides before each rite: the transport team gives them here; the cluster's technical
 * coordinators seat their groups' pilgrims and administrators on them in «القوائم». (The Rawdah's lists, of its men
 * and its women, need no bus.)
 */
export function ClusterBuses() {
  const user = useStaffUser();
  const toast = useToast();
  const clusters = allClusterIds();
  const [clusterId, setClusterId] = useState(clusters[0] ?? "");
  const [kind, setKind] = useState<ListKind>("tarwiya");
  const units = useClusterUnits(clusterId, kind);
  const lists = useLists();
  const k = LIST_KINDS.find((x) => x.key === kind)!;
  const [label, setLabel] = useState("");
  const [plate, setPlate] = useState("");
  const [driver, setDriver] = useState("");
  const [seats, setSeats] = useState("49");

  const add = () => {
    const n = Number(seats);
    if (!clusterId || !label.trim() || !(n > 0)) return;
    listsActions.addUnit({ clusterId, kind, label: label.trim(), plate: plate.trim() || undefined, driver: driver.trim() || undefined, seats: n, when: k.when, by: user?.name ?? "فريق المواصلات" });
    toast({ title: `أُسندت ${label.trim()}`, body: `${clusterName(clusterId)} — قائمة ${k.label}. يراها منسقو التكتل في «القوائم».`, tone: "success", icon: "🚌" });
    setLabel("");
    setPlate("");
    setDriver("");
  };

  return (
    <div className="space-y-4">
      <BusRequestsDesk />
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block text-sm text-white/75">
          التكتل
          <select value={clusterId} onChange={(e) => setClusterId(e.target.value)} className={`${smallInputClass} mt-1`} aria-label="التكتل">
            {clusters.map((id) => <option key={id} value={id} className="text-ink">{clusterName(id)}</option>)}
          </select>
        </label>
        <label className="block text-sm text-white/75">
          القائمة
          <select value={kind} onChange={(e) => setKind(e.target.value as ListKind)} className={`${smallInputClass} mt-1`} aria-label="القائمة">
            {LIST_KINDS.filter((x) => x.key !== "rawdah").map((x) => <option key={x.key} value={x.key} className="text-ink">{x.label} — {x.when}</option>)}
          </select>
        </label>
      </div>

      <ListTable head={["الحافلة", "اللوحة والسائق", "المقاعد", "عليها", ""]}>
        {units.length === 0 && <EmptyRow cols={5}>لا حافلات لهذا التكتل في هذه القائمة. أسندها من النموذج أدناه.</EmptyRow>}
        {units.map((u) => {
          const on = lists.seats[u.id]?.length ?? 0;
          return (
            <tr key={u.id}>
              <td className="p-3 font-bold">
                {u.label}
                <span className="block text-xs font-normal text-white/55">{u.when}</span>
              </td>
              <td className="p-3 text-white/80">{u.plate ?? "—"}{u.driver && <span className="block text-xs text-white/55">{u.driver}{u.driverPhone && <> — <span dir="ltr">{u.driverPhone}</span></>}</span>}</td>
              <td className="p-3 tabular-nums">{u.seats}</td>
              <td className="p-3">{on >= u.seats ? <Tag tone="gold">اكتملت {on}</Tag> : on ? <Tag tone="green">{on}</Tag> : <Tag>لا أحد</Tag>}</td>
              <td className="p-3 text-end">
                <button
                  type="button"
                  aria-label={`سحب ${u.label}`}
                  onClick={() => {
                    listsActions.removeUnit(u, user?.name ?? "فريق المواصلات");
                    toast({ title: `سُحبت ${u.label}`, body: on ? `ونُزل عنها ${on} — يعيد المنسق وضعهم على غيرها.` : undefined, tone: "info" });
                  }}
                  className="rounded-lg p-1.5 text-white/70 hover:bg-maroon hover:text-white"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          );
        })}
      </ListTable>

      <div className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
        <p className="mb-3 font-bold text-white">إسناد حافلة إلى {clusterName(clusterId)} — {k.label}</p>
        <div className="grid gap-3 md:grid-cols-4">
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="حافلة 9" aria-label="الاسم" className={smallInputClass} />
          <input value={plate} onChange={(e) => setPlate(e.target.value)} placeholder="اللوحة" aria-label="اللوحة" className={smallInputClass} />
          <input value={driver} onChange={(e) => setDriver(e.target.value)} placeholder="السائق" aria-label="السائق" className={smallInputClass} />
          <input value={seats} onChange={(e) => setSeats(e.target.value.replace(/\D/g, ""))} inputMode="numeric" aria-label="المقاعد" className={smallInputClass} />
        </div>
        <Button className="mt-3" onClick={add} disabled={!clusterId || !label.trim() || !(Number(seats) > 0)}>
          <Plus className="size-4" /> إسناد
        </Button>
      </div>
    </div>
  );
}

/**
 * The coordinators' requests for one more bus — like the flights' requests: approving gives the cluster a bus of 49
 * seats on that list (it appears to its coordinators at once); refusing says why.
 */
function BusRequestsDesk() {
  const user = useStaffUser();
  const toast = useToast();
  const lists = useLists();
  const [refusing, setRefusing] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const by = user?.name ?? "فريق المواصلات";
  const pending = lists.requests.filter((r) => r.status === "pending");
  const decided = lists.requests.filter((r) => r.status !== "pending").slice(0, 5);
  if (!lists.requests.length) return null;
  const approve = (r: (typeof pending)[number]) => {
    const n = lists.units.filter((u) => u.clusterId === r.clusterId && u.kind === r.kind).length + plannedUnits(r.clusterId).filter((u) => u.kind === r.kind).length + 1;
    listsActions.approveBus(r, by, { label: `حافلة ${n}`, plate: `${1000 + ((r.at / 1000) % 8999 | 0)} ح ج ع`, seats: 49 });
    toast({ title: `أُسندت حافلة ${n} إلى ${clusterName(r.clusterId)}`, body: `قائمة ${listKind(r.kind).label} — يراها ${r.by} في «القوائم».`, tone: "success", icon: "🚌" });
  };
  return (
    <div className="rounded-2xl bg-white/[.04] p-4 ring-1 ring-white/10">
      <p className="mb-3 flex items-center gap-2 font-bold text-white">
        <Inbox className="size-4 text-gold" /> طلبات الحافلات الإضافية من المنسقين {pending.length > 0 && <Tag tone="maroon">{pending.length} بانتظارك</Tag>}
      </p>
      <ul className="space-y-2">
        {[...pending, ...decided].map((r) => (
          <li key={r.id} className="rounded-xl bg-black/20 p-3 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                <b>{clusterName(r.clusterId)}</b> — قائمة {listKind(r.kind).label}: {r.count} بلا مقعد{r.note ? ` — ${r.note}` : ""}
                <span className="block text-xs text-white/55">{r.by}</span>
              </span>
              {r.status === "pending" ? (
                <span className="flex gap-2">
                  <Button size="sm" onClick={() => approve(r)}>
                    <Check className="size-4" /> إسناد حافلة
                  </Button>
                  <Button size="sm" variant="glass" onClick={() => { setRefusing(r.id); setReason(""); }}>
                    رفض
                  </Button>
                </span>
              ) : r.status === "approved" ? (
                <Tag tone="green">أُسندت{r.decidedBy ? ` — ${r.decidedBy}` : ""}</Tag>
              ) : (
                <Tag>رُفض: {r.reason}</Tag>
              )}
            </div>
            {refusing === r.id && (
              <div className="mt-2 flex flex-wrap gap-2">
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="سبب الرفض، مثل: تتسع لهم حافلات التكتل بعد إعادة التوزيع" aria-label="سبب الرفض" className={`${smallInputClass} min-w-0 flex-1`} />
                <Button size="sm" variant="maroon" disabled={!reason.trim()} onClick={() => { listsActions.rejectBus(r, by, reason.trim()); setRefusing(null); toast({ title: "رُفض الطلب", body: `يرى ${r.by} السبب في «القوائم».`, tone: "info" }); }}>
                  إرسال الرفض
                </Button>
              </div>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
