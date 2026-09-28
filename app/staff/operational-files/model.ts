import { fileTypeOf, fullName, roleIn, type Assignment, type Employee, type OpFile, type Place } from "@/lib/ops";

/** Pure edits of an operational file; the view saves the result and logs it */

/** Where a post sits: the whole file (no ids), an outer node (sector / centre), or an inner node (tower / camp) */
export type Target = { outer?: string; inner?: string };

function mapTarget(file: OpFile, t: Target, fn: (members: Assignment[]) => Assignment[]): OpFile {
  if (!t.outer) return { ...file, members: fn(file.members) };
  return {
    ...file,
    nodes: file.nodes.map((o) =>
      o.id !== t.outer
        ? o
        : t.inner
          ? {
              ...o,
              children: o.children.map((c) => (c.id === t.inner ? { ...c, members: fn(c.members) } : c)),
            }
          : { ...o, members: fn(o.members) },
    ),
  };
}

export function membersAt(file: OpFile, t: Target): Assignment[] {
  if (!t.outer) return file.members;
  const o = file.nodes.find((x) => x.id === t.outer);
  if (!o) return [];
  return t.inner ? (o.children.find((x) => x.id === t.inner)?.members ?? []) : o.members;
}

/** Drop a person from every post he holds in the file (used when he is MOVED rather than added) */
export function removeEverywhere(file: OpFile, employeeId: string): OpFile {
  const drop = (ms: Assignment[]) => ms.filter((m) => m.employeeId !== employeeId);
  return {
    ...file,
    members: drop(file.members),
    nodes: file.nodes.map((o) => ({
      ...o,
      members: drop(o.members),
      children: o.children.map((c) => ({ ...c, members: drop(c.members) })),
    })),
  };
}

/**
 * Put people on a role. A single-holder role is replaced; a multi-holder role is appended to.
 * In the housing file, sector roles default to sleeping in the sector's first tower.
 */
export function assign(file: OpFile, t: Target, role: string, ids: string[], move: boolean): OpFile {
  let f = file;
  if (move) ids.forEach((id) => (f = removeEverywhere(f, id)));
  const type = fileTypeOf(file.type);
  const multiple = roleIn(type, role).multiple;
  const outer = f.nodes.find((o) => o.id === t.outer);
  const housingHotelId = type.housing && outer && !t.inner ? (outer.members.find((m) => m.role === role)?.housingHotelId ?? outer.children[0]?.refId) : undefined;
  return mapTarget(f, t, (ms) => {
    const kept = multiple ? ms : ms.filter((m) => m.role !== role);
    const add = ids.filter((id) => !kept.some((m) => m.role === role && m.employeeId === id)).map((employeeId) => ({ role, employeeId, housingHotelId }));
    return [...kept, ...add];
  });
}

export function unassign(file: OpFile, t: Target, role: string, employeeId: string): OpFile {
  return mapTarget(file, t, (ms) => ms.filter((m) => !(m.role === role && m.employeeId === employeeId)));
}

export function setHousing(file: OpFile, outer: string, employeeId: string, hotelId: string): OpFile {
  return mapTarget(file, { outer }, (ms) => ms.map((m) => (m.employeeId === employeeId ? { ...m, housingHotelId: hotelId } : m)));
}

/** One row per post, for Excel (UTF-8 with BOM so Arabic opens correctly) */
export function toCsv(file: OpFile, employees: Employee[], places: Map<string, Place>) {
  const type = fileTypeOf(file.type);
  const emp = (id: string) => employees.find((e) => e.id === id);
  const place = (id?: string) => (id ? (places.get(id)?.name ?? "") : "");
  const head = [type.outer.name, type.inner.name, "الدور", "الاسم", "المسمى الوظيفي", "البعثة", "هاتف سوريا", "هاتف السعودية"];
  if (type.housing) head.push("مكان السكن");
  if (type.campFields) head.push("الخيمة", "جهات مخصّصة");
  const rows: string[][] = [head];
  const line = (m: Assignment, outer: string, inner: string, extra: string[]) => {
    const e = emp(m.employeeId);
    rows.push([outer, inner, roleIn(type, m.role).name, e ? fullName(e) : m.employeeId, e?.jobTitle ?? "", e?.mission ?? "", e?.phoneSy ?? "", e?.phoneSa ?? "", ...extra]);
  };
  const blank = [type.housing ? [""] : [], type.campFields ? ["", ""] : []].flat();
  file.members.forEach((m) => line(m, type.team ?? "الملف", "—", blank));
  for (const o of file.nodes) {
    o.members.forEach((m) => line(m, place(o.refId), "—", [type.housing ? [place(m.housingHotelId)] : [], type.campFields ? ["", ""] : []].flat()));
    o.children.forEach((c) => c.members.forEach((m) => line(m, place(o.refId), place(c.refId), [type.housing ? [place(c.refId)] : [], type.campFields ? [c.tent ?? "", c.bodies ?? ""] : []].flat())));
  }
  const esc = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);
  return "﻿" + rows.map((r) => r.map(esc).join(",")).join("\r\n");
}

export function download(name: string, text: string) {
  const url = URL.createObjectURL(new Blob([text], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
