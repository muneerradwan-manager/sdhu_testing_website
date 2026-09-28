"use client";

import { ArrowRightLeft, Check, History, Layers, UserPlus, UserX } from "lucide-react";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  GOVERNORATES,
  JOB_TITLES,
  MISSIONS,
  employeeHaystack,
  fileTypeOf,
  fullName,
  inSeason,
  matches,
  postingIndex,
  roleIn,
  useEmployees,
  useOpFiles,
  usePlaces,
  type OpFile,
  type Role,
  type Seat,
} from "@/lib/ops";
import { cn } from "@/lib/utils";
import { Drawer, Empty } from "../_components/kit";
import { Avatar, Chip, FilterSelect, SearchBox } from "../_components/ops-ui";

/**
 * Choosing who holds a post. Only employees registered for the file's season and not suspended are
 * offered. Each row says where the person already sits in this file, in the season's other files and
 * what he did last season, so the choice is made with the whole picture; somebody already posted in
 * this file can be MOVED here or ADDED here while keeping his other post.
 */
export function EmployeePicker({
  open,
  onClose,
  file,
  role,
  place,
  holders,
  onPick,
}: {
  open: boolean;
  onClose: () => void;
  file: OpFile;
  role: Role | null;
  place: string;
  holders: string[];
  onPick: (ids: string[], moveIds: string[]) => void;
}) {
  return (
    <Drawer open={open} onClose={onClose} title={role ? `${role.multiple ? "إضافة" : "اختيار"} ${role.name} — ${place}` : ""} width="max-w-2xl">
      {role && <PickerBody key={`${role.code}-${place}`} file={file} role={role} holders={holders} onPick={onPick} />}
    </Drawer>
  );
}

function PickerBody({ file, role, holders, onPick }: { file: OpFile; role: Role; holders: string[]; onPick: (ids: string[], moveIds: string[]) => void }) {
  const employees = useEmployees();
  const files = useOpFiles();
  const places = usePlaces();
  const type = fileTypeOf(file.type);
  const [q, setQ] = useState("");
  const [mission, setMission] = useState(role.code === "mission-member" || role.code === "camp-member" ? "" : "البعثة الإدارية");
  const [title, setTitle] = useState("");
  const [city, setCity] = useState("");
  const [gender, setGender] = useState("");
  const [freeOnly, setFreeOnly] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [moves, setMoves] = useState<string[]>([]);
  const [confirm, setConfirm] = useState<string | null>(null);
  const room = role.max ? role.max - holders.length : Infinity;

  const index = useMemo(() => postingIndex(file), [file]);
  const previous = useMemo(() => postingIndex(files.find((f) => f.type === file.type && f.season === file.season - 1)), [files, file]);
  const others = useMemo(() => files.filter((f) => f.season === file.season && f.id !== file.id).map((f) => ({ f, idx: postingIndex(f) })), [files, file]);
  const seatName = (s: Seat, t = type) => `${roleIn(t, s.role).name} — ${places.get(s.innerId ?? s.outerId ?? "")?.name ?? t.team ?? t.short}`;

  const rows = useMemo(
    () =>
      employees
        .filter((e) => inSeason(e, file.season) && !e.suspended && !holders.includes(e.id))
        .filter((e) => !mission || e.mission === mission)
        .filter((e) => !title || e.jobTitle === title)
        .filter((e) => !city || e.city === city)
        .filter((e) => !gender || e.gender === gender)
        .filter((e) => !freeOnly || !index.has(e.id))
        .filter((e) => matches(q, employeeHaystack(e)))
        // Free in this file first, then the most experienced
        .sort((a, b) => Number(index.has(a.id)) - Number(index.has(b.id)) || b.seasons.length - a.seasons.length || fullName(a).localeCompare(fullName(b), "ar")),
    [employees, file.season, holders, mission, title, city, gender, freeOnly, index, q],
  );

  const choose = (id: string, move: boolean) => {
    if (!role.multiple) onPick([id], move ? [id] : []);
    else if (picked.includes(id)) {
      setPicked((p) => p.filter((x) => x !== id));
      setMoves((m) => m.filter((x) => x !== id));
    } else if (picked.length < room) {
      setPicked((p) => [...p, id]);
      if (move) setMoves((m) => [...m, id]);
    }
    setConfirm(null);
  };
  const full = role.multiple && picked.length >= room;

  return (
    <div className="space-y-3">
      <p className="rounded-2xl bg-white/5 p-3 text-xs leading-6 text-white/75 ring-1 ring-white/10">{role.description}</p>
      {role.max && (
        <p className="text-xs font-bold text-gold">
          الحد الأعلى {role.max} — {room > 0 ? `بقي مكان لـ ${room}` : "اكتمل العدد"}
        </p>
      )}
      <SearchBox value={q} onChange={setQ} label="بحث عن موظف" placeholder="اسم، مسمى، محافظة، هاتف..." autoFocus />
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        <FilterSelect label="البعثة" all="كل البعثات" value={mission} onChange={setMission} options={MISSIONS} />
        <FilterSelect label="المسمى" all="كل المسميات" value={title} onChange={setTitle} options={JOB_TITLES.filter((t) => employees.some((e) => e.jobTitle === t))} />
        <FilterSelect label="المحافظة" all="كل المحافظات" value={city} onChange={setCity} options={GOVERNORATES.filter((t) => employees.some((e) => e.city === t))} />
        <FilterSelect
          label="الجنس"
          all="الجنسان"
          value={gender}
          onChange={setGender}
          options={[
            { value: "male", label: "ذكور" },
            { value: "female", label: "إناث" },
          ]}
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
        <label className="flex cursor-pointer items-center gap-2 text-white/85">
          <input type="checkbox" checked={freeOnly} onChange={(e) => setFreeOnly(e.target.checked)} className="size-4 accent-[#D9C89E]" />
          غير المُسندين في هذا الملف فقط
        </label>
        <span className="text-white/60">
          {rows.length} من المشاركين في موسم {file.season}
        </span>
      </div>

      {rows.length === 0 ? (
        <Empty icon={<UserX />} title="لا أحد يطابق" text={`يظهر هنا المشاركون في موسم ${file.season} فقط. سجّل الموظف في الموسم من صفحة الموظفين إن لم تجده.`} />
      ) : (
        <ul className={cn("space-y-2", role.multiple && picked.length > 0 && "pb-20")}>
          {rows.slice(0, 60).map((e) => {
            const here = index.get(e.id);
            const before = previous.get(e.id);
            const elsewhere = others.flatMap(({ f, idx }) => (idx.get(e.id) ?? []).map((s) => ({ s, t: fileTypeOf(f.type) })));
            const isPicked = picked.includes(e.id);
            return (
              <li key={e.id} className={cn("rounded-2xl p-3 ring-1 transition", isPicked ? "bg-gold/15 ring-gold/60" : "bg-white/5 ring-white/10 hover:ring-gold/40")}>
                <div className="flex items-center gap-3">
                  <Avatar e={e} />
                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-white">
                      {fullName(e)}
                      {moves.includes(e.id) && <span className="mr-2 text-xs font-bold text-gold">(نقل)</span>}
                    </p>
                    <p className="text-xs text-white/65">
                      {e.jobTitle} · {e.mission.replace("البعثة ", "")} · {e.city} · {e.seasons.filter((y) => y < file.season).length} مواسم
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {here ? (
                        here.map((s, i) => (
                          <Chip key={i} tone="gold">
                            {seatName(s)}
                          </Chip>
                        ))
                      ) : (
                        <Chip tone="green">غير مُسند هنا</Chip>
                      )}
                      {elsewhere.slice(0, 2).map(({ s, t }, i) => (
                        <Chip key={`o${i}`}>
                          <Layers className="size-3" /> {t.where}: {seatName(s, t)}
                        </Chip>
                      ))}
                      {before?.slice(0, 1).map((s, i) => (
                        <Chip key={`b${i}`}>
                          <History className="size-3" /> {file.season - 1}: {seatName(s)}
                        </Chip>
                      ))}
                    </div>
                  </div>
                  {role.multiple ? (
                    <button
                      disabled={full && !isPicked}
                      onClick={() => (here && !isPicked ? setConfirm(confirm === e.id ? null : e.id) : choose(e.id, false))}
                      aria-pressed={isPicked}
                      className={cn(
                        "grid size-10 shrink-0 place-items-center rounded-xl ring-1 transition disabled:opacity-30",
                        isPicked ? "bg-gold text-ink ring-gold" : "text-white/70 ring-white/25 hover:bg-white/10",
                      )}
                      aria-label={isPicked ? "إلغاء الاختيار" : "اختيار"}
                    >
                      {isPicked ? <Check className="size-5" /> : <UserPlus className="size-4" />}
                    </button>
                  ) : (
                    <Button size="sm" variant={here ? "glass" : "gold"} onClick={() => (here ? setConfirm(confirm === e.id ? null : e.id) : choose(e.id, false))}>
                      اختيار
                    </Button>
                  )}
                </div>
                {confirm === e.id && here && (
                  <div className="mt-3 rounded-xl bg-black/20 p-3 text-sm ring-1 ring-gold/30">
                    <p className="text-white/85">
                      {e.firstName} مُسند في هذا الملف: <span className="font-bold text-gold">{here.map((s) => seatName(s)).join("، ")}</span>
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <Button size="sm" variant="gold" onClick={() => choose(e.id, true)}>
                        <ArrowRightLeft className="size-4" /> نقله إلى هنا
                      </Button>
                      <Button size="sm" variant="glass" onClick={() => choose(e.id, false)}>
                        إضافته مع بقاء موقعه
                      </Button>
                    </div>
                  </div>
                )}
              </li>
            );
          })}
          {rows.length > 60 && <li className="py-2 text-center text-xs text-white/55">يظهر أول 60 — اكتب في البحث لتضييق القائمة.</li>}
        </ul>
      )}

      {role.multiple && picked.length > 0 && (
        <div className="sticky bottom-0 -mx-5 -mb-5 flex items-center justify-between gap-3 border-t border-gold/30 bg-[#00352f] p-4">
          <span className="text-sm text-white/85">
            اخترت <span className="font-bold text-gold">{picked.length}</span>
          </span>
          <Button variant="gold" onClick={() => onPick(picked, moves)}>
            <UserPlus className="size-4" /> إسناد {picked.length}
          </Button>
        </div>
      )}
    </div>
  );
}
