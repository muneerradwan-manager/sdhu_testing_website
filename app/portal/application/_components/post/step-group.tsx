"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  ArrowLeftRight,
  BedDouble,
  Building2,
  Check,
  FileSignature,
  ShieldCheck,
} from "lucide-react";
import { useState } from "react";
import { useToast } from "@/components/ui/widgets";
import { decideContract, demoContractFile, groupInfo, submitContract } from "@/lib/assignment";
import { groupName } from "@/lib/groups";
import { rangeLabel, useOperation } from "@/lib/operations";
import Link from "next/link";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { fullName, relationLabel } from "@/lib/registry";
import { RoomPicker } from "@/components/ui/room-picker";
import { GENERAL_DETAIL, GENERAL_LABEL, accommodationCost, bedsOf, costBreakdown, defaultRooms, describeRooms, formatRoomPrices, priceRange, readAccommodation, type Accommodation, type RoomCounts } from "@/lib/rooms";
import { actions } from "@/lib/store";
import { cn, formatUSD } from "@/lib/utils";
import { Question } from "../../../apply/_components/ui";
import { ROOM_NEEDS } from "./model";
import type { StepProps } from "./shared";


/** The demo's group: مجموعة اللطيف of تكتل النور (27 is only its key) */
const DEMO_GROUP = { clusterId: "al-nour", number: 27 };

/**
 * الخطوة 3: الإلحاق بمجموعة — عملية مستقلة عن التسجيل على الحج. لا يختار الحاج مجموعته على المنصة: يتفق مع
 * مجموعة خارجها، فيرفع العقد الموقّع من يملك صلاحية «إلحاق الحجاج بالمجموعة» فيها (رئيسها، أو المنسق أو المعاون
 * الموزَّعة عليه من رئيس التكتل)، ثم يعتمده موظف المكتب. بعدها فقط يظهر للحاج أنه في المجموعة، ومعه عقده.
 */
export function StepGroup({ app, post, sessionId }: StepProps) {
  const toast = useToast();
  const joining = useOperation("group-joining");
  if (post.groupApprovedAt && post.contract?.status !== "pending") return null;
  const c = post.contract;
  const upload = () => {
    const uploader = { id: "01033300871", name: "أحمد سليمان الحمصي", role: `رئيس ${groupName(DEMO_GROUP.number)}` };
    submitContract({ sessionId, app, post, group: DEMO_GROUP, uploader, file: demoContractFile(app, DEMO_GROUP.number), at: Date.now() });
    toast({ title: `رُفع عقدكم مع ${groupName(DEMO_GROUP.number)}`, body: "رفعه رئيسها، وينتظر اعتماد المكتب.", icon: "📄", tone: "info" });
  };
  const approve = () => {
    decideContract({ sessionId, app, post, status: "approved", by: { name: "رنا حداد (محاكاة)", role: "إدارة التسجيل" }, at: Date.now() });
    toast({ title: "اعتمد المكتب عقدكم", body: "أنتم الآن في المجموعة.", icon: "✅", tone: "success" });
  };
  return (
    <Question
      step="الخطوة 3 من 6"
      title="الإلحاق بمجموعة: بعقد بينكم وبين المجموعة"
      hint={`لا تختارون المجموعة من المنصة. تتفقون مع مجموعة، فيرفع رئيسها أو منسقها عقدكم الموقّع على المنصة، ويعتمده المكتب، فتظهر لكم هنا مجموعتكم وعقدكم. ${app.members.length > 1 ? `أفراد طلبكم (${app.members.length}) يُلحقون معاً بالمجموعة نفسها.` : ""}`}
      speak="لا تختار المجموعة من المنصة. تتفق مع مجموعة، فيرفع رئيسها أو منسقها العقد، ويعتمده المكتب."
    >
      {app.submittedBy && (
        <p className="mb-5 flex items-start gap-2 rounded-2xl bg-sand p-4 text-sm leading-7 text-ink-soft">
          <ShieldCheck className="mt-1 size-4 shrink-0 text-green-dark" />
          سجّلكم على الحج {app.submittedBy.name}، وهذا لا يضعكم في أي مجموعة ولا في مجموعته. الإلحاق بمجموعة بعقد مستقل.
        </p>
      )}
      <ol className="grid gap-3 md:grid-cols-3">
        {[
          { t: "تتفقون مع مجموعة", d: "خارج المنصة: مع رئيسها أو منسقها", done: !!c },
          { t: "يرفع العقد على المنصة", d: c ? `${c.uploadedBy.name} — ${c.uploadedBy.role}` : "رئيس المجموعة أو منسق التكتل الموزَّعة عليه", done: !!c && c.status !== "returned" },
          { t: "يعتمده المكتب", d: c?.status === "returned" ? `أُعيد: ${c.reason}` : "موظف إدارة التسجيل", done: c?.status === "approved" },
        ].map((x, i) => (
          <li key={x.t} className={cn("rounded-2xl border-2 p-4", x.done ? "border-green-light/50 bg-green-light/5" : "border-gold/30 bg-white")}>
            <span className={cn("grid size-8 place-items-center rounded-full text-sm font-bold", x.done ? "bg-green-light text-white" : "bg-sand text-green-dark")}>{x.done ? <Check className="size-4" /> : i + 1}</span>
            <p className="mt-2 font-bold">{x.t}</p>
            <p className="text-sm text-ink-soft">{x.d}</p>
          </li>
        ))}
      </ol>
      {c?.status === "pending" ? (
        <div className="mt-5 rounded-3xl border-2 border-gold-dark/40 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-green-dark">
            <FileSignature className="size-5" /> عقدكم مع {groupName(c.groupNumber)}{c.transferFrom ? ` (انتقال من ${groupName(c.transferFrom)})` : ""} عند المكتب
          </p>
          <p className="mt-1 text-sm text-ink-soft">
            رفعه {c.uploadedBy.name} ({c.uploadedBy.role}) — الملف «{c.file.name}». يصلكم إشعار حين يُعتمد.
          </p>
          <button type="button" onClick={approve} className="mt-3 rounded-full border border-dashed border-gold-dark px-3 py-1 text-sm font-semibold text-maroon">
            محاكاة: اعتمد المكتب العقد
          </button>
        </div>
      ) : c?.status === "returned" ? (
        <div className="mt-5 rounded-3xl border-2 border-maroon/30 bg-maroon/5 p-5">
          <p className="font-bold text-maroon">أعاد المكتب عقدكم مع {groupName(c.groupNumber)}: {c.reason}</p>
          <p className="mt-1 text-sm text-ink-soft">يرفعه {c.uploadedBy.name} من جديد بعد إصلاحه.</p>
        </div>
      ) : (
        <div className="mt-5 rounded-3xl bg-sand p-5">
          <p className="font-bold text-green-dark">{joining.open ? "لم يُرفع لكم عقد بعد" : joining.status === "upcoming" ? `يبدأ الإلحاق بالمجموعات ${rangeLabel(joining.start, joining.end)}` : "انتهت مدة الإلحاق بالمجموعات"}</p>
          <p className="mt-1 text-sm leading-7 text-ink-soft">
            يمكنكم الاطلاع على التكتلات المعتمدة ومجموعاتها في صفحة <Link href="/verify" className="font-bold text-green-dark underline">التحقق من الجهات</Link>، ثم الاتفاق مع المجموعة التي تناسبكم مباشرة.
          </p>
          {joining.open && (
            <button type="button" onClick={upload} className="mt-3 rounded-full border border-dashed border-gold-dark px-3 py-1 text-sm font-semibold text-maroon">
              محاكاة: اتفقنا مع {groupName(DEMO_GROUP.number)} ورفع رئيسها العقد
            </button>
          )}
        </div>
      )}
    </Question>
  );
}

/** "مجموعتي" once the office approved the contract — with the contract itself, and how a family moves */
export function MyGroup({ app, post, sessionId }: StepProps) {
  const info = groupInfo(post.clusterId, post.groupNumber);

  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-green-dark p-5 text-white">
          <p className="text-sm text-gold">مجموعتي</p>
          <p className="font-display text-2xl font-bold">
            {groupName(info.number)} — {info.clusterName.replace("تكتل ", "")}
          </p>
          <p className="mt-1 flex items-center gap-1.5 text-white/75">
            <Building2 className="size-4" /> {info.office} — مستوى الخدمة: {info.level}
          </p>
          {post.enrolledBy && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-white/75">
              <FileSignature className="size-4" /> رفع عقدكم {post.enrolledBy.name}، واعتمده المكتب
            </p>
          )}
          <ul className="mt-3 space-y-1 text-sm">
            {info.team.map((t) => (
              <li key={t.name}>
                <span className="text-white/60">{t.role === "المنسق التقني" ? "منسق التكتل المسند إلى المجموعة" : t.role}:</span> <b>{t.name}</b>
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-3xl bg-sand p-5">
          <p className="font-bold text-green-dark">أفراد الطلب في المجموعة</p>
          <ul className="mt-3 space-y-2">
            {app.members.map((m) => (
              <li key={m.person.id} className="rounded-2xl bg-white p-2.5 pr-3 font-semibold">
                {m.person.firstName} <span className="text-sm font-normal text-hint">— {m.relation === "self" ? "صاحب الطلب" : relationLabel(m.relation, m.person.gender)}</span>
              </li>
            ))}
          </ul>
          {post.transfers?.length ? (
            <p className="mt-3 text-sm text-hint">
              انتقلتم سابقاً: {post.transfers.map((t) => `${groupName(t.from)} ← ${groupName(t.to)}`).join("، ")}
            </p>
          ) : null}
        </div>
      </div>

      <AccommodationChoice app={app} post={post} sessionId={sessionId} />

      {post.contract && (
        <div className="rounded-3xl border border-gold/40 bg-white p-5">
          <p className="flex items-center gap-2 font-bold text-green-dark">
            <FileSignature className="size-5" /> عقدكم مع {groupName(post.contract.groupNumber)}
          </p>
          <ul className="mt-2 grid gap-1 text-sm text-ink-soft sm:grid-cols-3">
            <li>الملف: «{post.contract.file.name}»</li>
            <li>
              رفعه: {post.contract.uploadedBy.name} — {post.contract.uploadedBy.role}
            </li>
            <li>اعتمده: {post.contract.decidedBy ?? "المكتب"}</li>
          </ul>
          <p className="mt-3 flex items-start gap-2 text-sm leading-7 text-ink-soft">
            <ArrowLeftRight className="mt-1 size-4 shrink-0 text-gold-dark" /> الانتقال إلى مجموعة أخرى بعقد جديد ترفعه المجموعة الجديدة ويعتمده المكتب. {app.members.length > 1 ? "الطلب العائلي ينتقل كاملاً — كل الأفراد أو لا أحد." : ""}
          </p>
        </div>
      )}
    </div>
  );
}

/**
 * Where the request sleeps, chosen once the family is in a group: the shared accommodation (men and women
 * apart, no extra cost), or private rooms of its own spread as the family likes — one bed per member — at the
 * cluster's price per person for each room type. A split is kept as soon as every member has a bed. The price
 * joins the last payment; once paid the choice is settled.
 */
export function AccommodationChoice({ app, post, sessionId }: Omit<StepProps, "lines">) {
  const toast = useToast();
  const clusters = useClusterDirectory();
  const cluster = clusters.find((c) => c.slug === post.clusterId);
  const n = app.members.length;
  const current = readAccommodation(post.accommodation);
  const [draft, setDraft] = useState<RoomCounts>(current.kind === "private" ? current.rooms : defaultRooms(n));
  const [privateOpen, setPrivateOpen] = useState(current.kind === "private");
  const settled = !!post.payments.room || (current.kind === "general" && !!post.payments.hady);
  const needs = app.members.filter((m) => m.needs.some((x) => ROOM_NEEDS.includes(x)));
  if (!cluster) return null;

  const fits = bedsOf(draft) === n;
  const draftCost = accommodationCost({ kind: "private", rooms: draft }, cluster.rooms)!;
  const savedCost = accommodationCost(current, cluster.rooms);
  const draftSaved = current.kind === "private" && ([1, 2, 3, 4] as const).every((b) => current.rooms[b] === draft[b]);

  const save = (a: Accommodation) => {
    if (settled) return;
    const cost = accommodationCost(a, cluster.rooms);
    actions.setPost(sessionId, { accommodation: a });
    actions.logEvent({ actor: fullName(app.members[0].person), role: "حاج", action: "اختيار نوع السكن", target: `الطلب ${app.number}`, detail: a.kind === "general" || !cost ? GENERAL_LABEL : `${describeRooms(a.rooms)} — ${costBreakdown(cost.parts)}` });
    toast({ title: a.kind === "general" || !cost ? GENERAL_LABEL : describeRooms(a.rooms), body: a.kind === "general" || !cost ? GENERAL_DETAIL : `${formatUSD(cost.amount)} تُضاف إلى الدفعة الأخيرة.`, icon: "🛏️", tone: "success" });
  };
  const pickGeneral = () => {
    setPrivateOpen(false);
    if (current.kind !== "general") save({ kind: "general" });
  };
  const pickPrivate = () => {
    setPrivateOpen(true);
    if (fits && !draftSaved) save({ kind: "private", rooms: draft });
  };
  // Kept as soon as every member has a bed; until then the last complete choice stands
  const changeRooms = (r: RoomCounts) => {
    setDraft(r);
    if (bedsOf(r) === n) save({ kind: "private", rooms: r });
  };

  const card = (on: boolean, onClick: () => void, title: string, detail: string, price: string, priceTone: string) => (
    <button
      type="button"
      aria-pressed={on}
      disabled={settled && !on}
      onClick={onClick}
      className={cn("rounded-2xl border-2 p-4 text-right transition disabled:cursor-not-allowed disabled:opacity-50", on ? "border-green-dark bg-green-dark/5" : "border-gold/40 hover:border-gold-dark")}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="font-bold text-ink">{title}</span>
        {on && <Check className="size-5 shrink-0 text-green-dark" />}
      </span>
      <span className="mt-1 block text-sm text-ink-soft">{detail}</span>
      <span className={cn("mt-2 block font-display text-lg font-bold", priceTone)}>{price}</span>
    </button>
  );

  return (
    <div className="rounded-3xl border border-gold/40 bg-white p-5">
      <p className="flex items-center gap-2 font-bold text-green-dark">
        <BedDouble className="size-5" /> نوع السكن
      </p>
      <p className="mt-1 text-sm leading-7 text-ink-soft">
        السكن العام دون كلفة، أو غرف خاصة لكم وحدكم تتوزعون عليها كما تشاؤون، لكل فرد سرير: غرفة واحدة لكم جميعاً، أو غرفتان أو أكثر. كلما قلّت أسرّة الغرفة ارتفع سعر الفرد فيها، ويحدده التكتل.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        {card(!privateOpen && current.kind === "general", pickGeneral, GENERAL_LABEL, GENERAL_DETAIL, "دون كلفة", "text-green")}
        {card(
          privateOpen,
          pickPrivate,
          "غرف خاصة لكم",
          savedCost ? describeRooms(savedCost.rooms) : "تختارون عدد الغرف وأسرّة كل غرفة",
          savedCost ? `${costBreakdown(savedCost.parts)} = ${formatUSD(savedCost.amount)}` : `${formatUSD(priceRange(cluster.rooms).from)} – ${formatUSD(priceRange(cluster.rooms).to)} للفرد`,
          "text-maroon",
        )}
      </div>
      <AnimatePresence initial={false}>
        {privateOpen && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="mt-4 rounded-2xl bg-sand p-4">
              <p className="mb-3 text-sm font-bold text-green-dark">وزّعوا أفراد طلبكم ({n}) على الغرف</p>
              <RoomPicker people={n} prices={cluster.rooms} rooms={draft} onChange={changeRooms} disabled={settled} />
              {!settled && (
                <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-ink-soft">
                    {fits ? (
                      <>
                        {describeRooms(draft)}: <b className="text-ink" dir="ltr">{costBreakdown(draftCost.parts)}</b> = <b className="text-maroon">{formatUSD(draftCost.amount)}</b>
                      </>
                    ) : current.kind === "private" && savedCost ? (
                      `يُعتمد التوزيع حين يكون لكل فرد سرير؛ حتى ذلك يبقى المعتمد: ${describeRooms(savedCost.rooms)}.`
                    ) : (
                      "يُعتمد التوزيع حين يكون لكل فرد سرير؛ حتى ذلك يبقى السكن العام."
                    )}
                  </p>
                  {draftSaved && (
                    <span className="flex items-center gap-1.5 text-sm font-bold text-green">
                      <Check className="size-4" /> معتمد في كشف التكاليف
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      <p className="mt-3 text-xs leading-6 text-hint">
        أسعار {cluster.name} للفرد: {formatRoomPrices(cluster.rooms)}. من ينام في أي غرفة تتفقون عليه مع منسق المجموعة.
        {needs.length > 0 && ` تُراعى احتياجات ${needs.map((m) => m.person.firstName).join(" و")} (غرفة قريبة من المصعد، طابق مناسب) في التوزيع دون كلفة إضافية.`}
        {settled && " اختياركم مثبّت بعد تسديده."}
      </p>
    </div>
  );
}
