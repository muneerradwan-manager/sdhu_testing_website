"use client";

import { AlertTriangle, BedDouble, Info, Trash2, UserPlus, X } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { useClusters } from "@/lib/cms/content";
import { fullName, rolesAt, staffIn, useEmployees, type Assignment, type FileType, type InnerNode, type OpFile, type Place, type Role } from "@/lib/ops";
import { cn, formatNumber } from "@/lib/utils";
import { Drawer, Meter } from "../_components/kit";
import { Avatar, Chip, Field, InfoGrid, fieldClass } from "../_components/ops-ui";

/** One role's holders with add / replace / remove — used on the file, on sectors / centres and in the tower / camp sheet */
export function RoleBlock({
  role,
  holders,
  editable,
  onAdd,
  onRemove,
  extra,
  dense,
}: {
  role: Role;
  holders: Assignment[];
  editable: boolean;
  onAdd: () => void;
  onRemove: (employeeId: string) => void;
  extra?: (m: Assignment) => ReactNode;
  dense?: boolean;
}) {
  const employees = useEmployees();
  const missing = role.required && holders.length === 0;
  const canAdd = holders.length === 0 || (role.multiple && holders.length < (role.max ?? Infinity));
  return (
    <div className={cn("rounded-2xl ring-1", dense ? "p-2.5" : "p-3", missing ? "bg-maroon/25 ring-maroon/60" : "bg-white/5 ring-white/10")}>
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-1.5 text-xs font-bold text-gold">
          {role.multiple ? role.plural : role.name}
          {role.multiple && holders.length > 0 && (
            <span className="rounded-full bg-white/10 px-1.5 text-[11px] tabular-nums text-white">
              {holders.length}
              {role.max ? `/${role.max}` : ""}
            </span>
          )}
          <span className="group relative">
            <Info className="size-3.5 text-white/40" aria-label="الوصف الوظيفي" />
            <span className="pointer-events-none absolute right-0 top-5 z-10 hidden w-72 rounded-xl bg-[#00211d] p-3 text-[11px] font-normal leading-5 text-white/85 shadow-xl ring-1 ring-gold/30 group-hover:block">
              {role.description}
            </span>
          </span>
        </p>
        {editable && canAdd && (
          <button onClick={onAdd} className="flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-bold text-gold hover:bg-white/10">
            <UserPlus className="size-3.5" /> {holders.length === 0 ? "إسناد" : "إضافة"}
          </button>
        )}
      </div>
      {missing ? (
        <p className="mt-1.5 flex items-center gap-1.5 text-xs font-bold text-[#ffc9d8]">
          <AlertTriangle className="size-3.5" /> شاغر — منصب إلزامي
        </p>
      ) : holders.length === 0 ? (
        <p className="mt-1.5 text-xs text-white/45">لا أحد بعد</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {holders.map((m) => {
            const e = employees.find((x) => x.id === m.employeeId);
            if (!e) return null;
            return (
              <li key={m.employeeId} className="flex items-center gap-2.5">
                <Avatar e={e} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className={cn("truncate text-sm font-bold", e.suspended ? "text-[#ffc9d8] line-through" : "text-white")}>{fullName(e)}</p>
                  <p className="truncate text-[11px] text-white/60">
                    {e.jobTitle} · <span dir="ltr">{e.phoneSa ?? e.phoneSy}</span>
                    {e.suspended && <span className="font-bold text-[#ffc9d8]"> · موقوف — استبدله</span>}
                  </p>
                  {extra?.(m)}
                </div>
                {editable && !role.multiple && (
                  <button onClick={onAdd} className="rounded-lg px-2 py-1 text-[11px] font-bold text-white/60 hover:bg-white/10 hover:text-white">
                    تغيير
                  </button>
                )}
                {editable && (
                  <button onClick={() => onRemove(m.employeeId)} className="rounded-lg p-1 text-white/45 hover:bg-maroon/40 hover:text-white" aria-label={`إزالة ${fullName(e)}`}>
                    <X className="size-4" />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

/** Pilgrims + mission staff against the contracted capacity of a hotel or camp */
export function Occupancy({ file, node, place }: { file: OpFile; node: InnerNode; place: Place }) {
  const staff = staffIn(file, place.id);
  const total = node.pilgrims + staff;
  const cap = place.capacity ?? 0;
  const over = cap > 0 && total > cap;
  return (
    <div>
      <div className="mb-1 flex items-center justify-between gap-2 text-[11px]">
        <span className="flex items-center gap-1 text-white/65">
          <BedDouble className="size-3.5" /> {formatNumber(node.pilgrims)} حاجاً + {staff} من البعثة
        </span>
        <span className={cn("font-bold tabular-nums", over ? "text-[#ffc9d8]" : "text-white/80")}>
          {formatNumber(total)} / {formatNumber(cap)}
        </span>
      </div>
      <Meter value={total} max={cap || 1} tone={over ? "maroon" : cap && total / cap > 0.9 ? "gold" : "teal"} />
      {over && <p className="mt-1 text-[11px] font-bold text-[#ffc9d8]">يتجاوز الطاقة الاستيعابية بـ {formatNumber(total - cap)}</p>}
    </div>
  );
}

/** The tower / camp sheet: the place, who serves in it, its pilgrims and how full it is */
export function InnerDrawer({
  open,
  onClose,
  type,
  file,
  node,
  place,
  outerName,
  editable,
  onPatch,
  onAdd,
  onRemove,
  onDelete,
}: {
  open: boolean;
  onClose: () => void;
  type: FileType;
  file: OpFile;
  node: InnerNode | undefined;
  place: Place | undefined;
  outerName: string;
  editable: boolean;
  onPatch: (patch: Partial<InnerNode>) => void;
  onAdd: (role: Role) => void;
  onRemove: (role: Role, employeeId: string) => void;
  onDelete: () => void;
}) {
  const clusters = useClusters();
  const isCamp = type.inner.ref === "camps";
  return (
    <Drawer open={open && !!node && !!place} onClose={onClose} title={place ? `${place.name} — ${outerName}` : ""} width="max-w-xl">
      {node && place && (
        <div className="space-y-5">
          <InfoGrid
            rows={[
              [isCamp ? "الموقع" : "الحي والمسافة", place.sub],
              ["الطاقة الاستيعابية", `${formatNumber(place.capacity ?? 0)} ${isCamp ? "حاج" : "سرير"}`],
            ]}
          />
          <Occupancy file={file} node={node} place={place} />

          <div className="space-y-2.5">
            {rolesAt(type, "inner").map((r) => (
              <RoleBlock key={r.code} role={r} holders={node.members.filter((m) => m.role === r.code)} editable={editable} onAdd={() => onAdd(r)} onRemove={(id) => onRemove(r, id)} />
            ))}
          </div>

          <div className="space-y-3 rounded-2xl bg-white/5 p-4 ring-1 ring-white/10">
            <p className="text-xs font-bold text-gold">حجاج {isCamp ? "المخيم" : "البرج"}</p>
            <div>
              <p className="mb-1.5 text-xs text-white/70">التكتلات {isCamp ? "في المخيم" : "الساكنة في البرج"}</p>
              <div className="flex flex-wrap gap-1.5">
                {clusters.map((c) => {
                  const on = node.clusters.includes(c.slug);
                  const elsewhere = !on && file.nodes.some((o) => o.children.some((t) => t.id !== node.id && t.clusters.includes(c.slug)));
                  return (
                    <button
                      key={c.slug}
                      disabled={!editable || elsewhere}
                      onClick={() => {
                        const next = on ? node.clusters.filter((x) => x !== c.slug) : [...node.clusters, c.slug];
                        onPatch({
                          clusters: next,
                          pilgrims: clusters.filter((x) => next.includes(x.slug)).reduce((a, x) => a + x.pilgrims, 0) || node.pilgrims,
                        });
                      }}
                      title={elsewhere ? `في ${type.inner.name} آخر من هذا الملف` : undefined}
                      className={cn(
                        "rounded-full px-3 py-1 text-xs font-bold ring-1 transition disabled:cursor-not-allowed",
                        on ? "bg-gold text-ink ring-gold" : elsewhere ? "text-white/30 ring-white/10" : "text-white/80 ring-white/20 hover:ring-gold/50",
                      )}
                    >
                      {c.name.replace(/ لخدمة الحجاج| للحج والعمرة/, "")} · {c.pilgrims}
                    </button>
                  );
                })}
              </div>
            </div>
            <Field label="عدد الحجاج" hint="يُحسب تلقائياً من التكتلات المختارة، ويمكن تعديله يدوياً.">
              <input
                type="number"
                min={0}
                disabled={!editable}
                value={node.pilgrims}
                onChange={(e) => onPatch({ pilgrims: Math.max(0, Number(e.target.value)) })}
                className={cn(fieldClass, "tabular-nums")}
                dir="ltr"
              />
            </Field>
            {type.campFields && (
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="رقم الخيمة" hint="خيمة البعثة أو نقطة التجمّع">
                  <input disabled={!editable} value={node.tent ?? ""} onChange={(e) => onPatch({ tent: e.target.value || undefined })} className={fieldClass} placeholder="مثل: الخيمة 12" />
                </Field>
                <Field label="جهات مخصّصة" hint="جهات لها مكان في المخيم">
                  <input disabled={!editable} value={node.bodies ?? ""} onChange={(e) => onPatch({ bodies: e.target.value || undefined })} className={fieldClass} placeholder="مثل: الإدارة الصحية" />
                </Field>
              </div>
            )}
            <Field label="ملاحظة">
              <input
                disabled={!editable}
                value={node.note ?? ""}
                onChange={(e) => onPatch({ note: e.target.value || undefined })}
                className={fieldClass}
                placeholder={isCamp ? "مثل: خيام النساء في الجهة الشمالية" : "مثل: الطابقان 11 و12 للنساء"}
              />
            </Field>
          </div>

          {editable && (
            <div className="border-t border-white/10 pt-4">
              <Button size="sm" variant="glass" className="hover:bg-maroon/50" onClick={onDelete}>
                <Trash2 className="size-4" /> إزالة {isCamp ? "المخيم" : "البرج"} من الملف
              </Button>
              <p className="mt-2 text-[11px] text-white/50">يعود متاحاً في القائمة، ويصبح من فيه غير مُسندين.</p>
            </div>
          )}
          {!editable && <Chip>للاطلاع فقط</Chip>}
        </div>
      )}
    </Drawer>
  );
}
