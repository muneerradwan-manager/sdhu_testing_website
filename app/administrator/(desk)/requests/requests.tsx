"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Accessibility,
  ArrowUpDown,
  BellRing,
  Check,
  CircleCheck,
  CircleX,
  Clock3,
  Inbox,
  Radio,
  TriangleAlert,
  UserRound,
  UsersRound,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Card } from "@/components/portal/shell";
import { Button } from "@/components/ui/button";
import { Badge, Modal, useToast } from "@/components/ui/widgets";
import { actions, useStore } from "@/lib/store";
import { cn } from "@/lib/utils";
import { logAdmin, nowMs, useAdmin } from "../../_lib/admin";
import { LIFT_NEEDS, SEED_REQUESTS, activeCount, memberCountOf, pendingRealRequests, requestFromApplication, type JoinRequest } from "../../_lib/group";
import { AdminShell, LockedCard } from "../../_components/ui";

const REJECT_REASONS = ["طلب صاحب الطلب الانتقال إلى مجموعة أخرى", "اكتملت سعة المجموعة", "الاحتياجات الخاصة تتطلب مجموعة مهيأة أكثر", "سبب آخر"];

function needsLift(r: JoinRequest) {
  return r.members.some((m) => m.needs.some((n) => LIFT_NEEDS.includes(n)));
}

export function AdminRequests() {
  const admin = useAdmin()!;
  const toast = useToast();
  const p = admin.profile;
  const g = p?.group;
  const post = useStore((s) => s.post);
  const applications = useStore((s) => s.applications);
  const decisions = useMemo(() => p?.joinDecisions ?? {}, [p?.joinDecisions]);
  const [filter, setFilter] = useState<"all" | "real" | "assignment">("all");
  const [rejecting, setRejecting] = useState<JoinRequest | null>(null);
  const [reason, setReason] = useState(REJECT_REASONS[0]);
  const [other, setOther] = useState("");
  const [shake, setShake] = useState<string | null>(null);

  const pending = useMemo(() => {
    if (!g) return [];
    const real = pendingRealRequests(g.number, post, applications, decisions);
    const seeds = SEED_REQUESTS.filter((r) => !decisions[r.id]);
    return [...real, ...seeds];
  }, [g, post, applications, decisions]);

  const decided = useMemo(
    () =>
      Object.entries(decisions)
        .map(([id, d]) => {
          const seed = SEED_REQUESTS.find((r) => r.id === id);
          const app = applications[id];
          const req = seed ?? (app ? requestFromApplication(id, app, post[id] ?? { documents: {}, payments: {}, ratings: {} }) : null);
          return req ? { req, d } : null;
        })
        .filter(Boolean) as { req: JoinRequest; d: "accepted" | "rejected" }[],
    [decisions, applications, post],
  );

  if (!g?.approvedAt) {
    return (
      <AdminShell title="طلبات الانتساب" subtitle="يصل إلى رئيس المجموعة كل طلب انتساب من الحجاج المقبولين، ويقبله أو يرفضه مع السبب.">
        <LockedCard title="لا مجموعة معتمدة بعد" text="تظهر طلبات الانتساب بعد اعتماد مجموعتك من مدير المكتب." href="/administrator/group" cta="مجموعتي" />
      </AdminShell>
    );
  }

  const active = activeCount(p, applications);
  const shown = pending.filter((r) => (filter === "all" ? true : filter === "real" ? r.real : r.kind === "assignment"));
  const realCount = pending.filter((r) => r.real).length;

  const accept = (r: JoinRequest) => {
    const n = r.members.length;
    if (active + n > g.capacity) {
      setShake(r.id);
      setTimeout(() => setShake(null), 600);
      toast({ title: "لا يمكن التفعيل — تجاوز السعة", body: `الأعضاء الفعّالون ${active} + ${n} = ${active + n} من ${g.capacity}. الطلب العائلي يُقبل كاملاً أو يُرفض.`, icon: "⛔", tone: "warning" });
      logAdmin(admin.id, "محاولة قبول طلب انتساب رُفضت آلياً (تجاوز السعة)", `الطلب ${r.number}`, `${active} + ${n} > ${g.capacity}`);
      return;
    }
    actions.upsertAdmin(admin.id, { joinDecisions: { ...decisions, [r.id]: "accepted" } });
    if (r.real) actions.setPost(r.id, { groupApprovedAt: nowMs() });
    logAdmin(admin.id, `قبول طلب انتساب إلى المجموعة ${g.number}`, `${r.applicant} — الطلب ${r.number}`, `${n} أفراد — الأعضاء الفعّالون: ${active} ← ${active + n} من ${g.capacity}${r.real ? " — من بوابة الحاج" : ""}`);
    if (needsLift(r)) {
      logAdmin(admin.id, "إحالة احتياج خاص إلى مشرف البرج تلقائياً", "وسام خوري — البرج (ب)", `${r.applicant}: غرفة قريبة من المصعد`);
    }
    toast({ title: `أصبح ${n === 1 ? "الحاج عضواً فعّالاً" : `أفراد الطلب ${r.number} أعضاء فعّالين`}`, body: `المجموعة ${g.number}: ${active + n} من ${g.capacity}. يصل إشعار القبول إلى الحاج.`, icon: "🤝", tone: "success" });
  };

  const reject = () => {
    if (!rejecting) return;
    const why = reason === "سبب آخر" ? other.trim() : reason;
    if (!why) return;
    actions.upsertAdmin(admin.id, { joinDecisions: { ...decisions, [rejecting.id]: "rejected" } });
    logAdmin(admin.id, `رفض طلب انتساب إلى المجموعة ${g.number}`, `${rejecting.applicant} — الطلب ${rejecting.number}`, `السبب: ${why}`);
    toast({ title: "رُفض الطلب مع السبب", body: `يصل إلى ${rejecting.applicant} إشعار بالسبب، ويمكنه اختيار مجموعة أخرى.`, icon: "📩", tone: "info" });
    setRejecting(null);
    setOther("");
  };

  return (
    <AdminShell title="طلبات الانتساب" subtitle={`المجموعة ${g.number} — تكتل النور. قبول الطلب العائلي كاملاً أو رفضه مع السبب، وتتحقق المنصة من السعة لحظة التفعيل.`}>
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="space-y-5">
          {/* capacity */}
          <Card className="md:p-7">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div>
                <p className="text-sm text-hint">سعة المجموعة</p>
                <p className="font-display text-4xl font-bold text-green-dark">
                  <motion.span key={active} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} className="inline-block tabular-nums">{active}</motion.span>
                  <span className="text-2xl text-hint"> / {g.capacity}</span>
                </p>
              </div>
              <div className="flex gap-2 text-sm">
                <Badge tone="gold"><Inbox className="size-3.5" /> {pending.length} بانتظار القرار</Badge>
                <Badge tone="green"><Clock3 className="size-3.5" /> متوسط الرد: 3 ساعات</Badge>
              </div>
            </div>
            <CapacityGrid active={active} capacity={g.capacity} />
          </Card>

          <div className="flex flex-wrap items-center gap-2">
            {([
              ["all", `الكل (${pending.length})`],
              ["real", `من بوابة الحاج (${realCount})`],
              ["assignment", "إسناد من الموظفين"],
            ] as const).map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)} className={cn("relative rounded-full px-4 py-2 text-sm font-bold transition", filter === k ? "text-white" : "bg-white text-ink-soft hover:text-ink")}>
                {filter === k && <motion.span layoutId="req-filter" className="absolute inset-0 rounded-full bg-green-dark" />}
                <span className="relative">{l}</span>
              </button>
            ))}
            <span className="mr-auto flex items-center gap-1.5 text-xs text-hint">
              <Radio className="size-3.5 animate-pulse text-green-light" /> تُحدَّث مباشرة عند وصول طلب من بوابة الحاج
            </span>
          </div>

          <AnimatePresence mode="popLayout">
            {shown.length === 0 && (
              <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <Card className="text-center">
                  <Inbox className="mx-auto size-12 text-gold-dark" />
                  <p className="mt-3 font-display text-xl font-bold text-green-dark">لا طلبات بانتظار قرارك</p>
                  <p className="mt-1 text-sm leading-7 text-ink-soft">حين يختار حاج مقبول «المجموعة {g.number}» من بوابة الحاج يظهر طلبه هنا مباشرة.</p>
                </Card>
              </motion.div>
            )}
            {shown.map((r) => {
              const n = r.members.length;
              const after = active + n;
              const over = after > g.capacity;
              return (
                <motion.article
                  layout
                  key={r.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={shake === r.id ? { opacity: 1, y: 0, x: [0, -12, 12, -8, 8, 0] } : { opacity: 1, y: 0, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95, x: -60 }}
                  transition={{ duration: 0.4 }}
                  className={cn("overflow-hidden rounded-[2rem] border bg-white shadow-[0_30px_80px_-50px_rgba(2,21,38,.5)]", r.real ? "border-gold-dark/60 ring-2 ring-gold/40" : "border-gold/30")}
                >
                  <header className={cn("flex flex-wrap items-center justify-between gap-3 px-6 py-4", r.real ? "bg-gradient-to-l from-gold/40 to-gold/10" : "bg-sand")}>
                    <div className="flex items-center gap-3">
                      <span className={cn("grid size-11 place-items-center rounded-xl", r.kind === "assignment" ? "bg-white text-maroon" : "bg-green-dark text-gold")}>
                        {r.kind === "assignment" ? <ArrowUpDown className="size-5" /> : n > 1 ? <UsersRound className="size-5" /> : <UserRound className="size-5" />}
                      </span>
                      <div>
                        <p className="font-bold text-ink">
                          {r.kind === "assignment" ? "إسناد: " : "طلب من: "}
                          {r.applicant}
                        </p>
                        <p className="text-xs text-ink-soft">{r.receivedLabel}</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {r.real && <Badge tone="gold"><BellRing className="size-3.5" /> طلب حقيقي من بوابة الحاج</Badge>}
                      <Badge tone="ink">الطلب {r.number}</Badge>
                      <Badge tone="green">{n === 1 ? "فرد واحد" : `طلب عائلي ${n} أفراد`}</Badge>
                    </div>
                  </header>

                  <div className="p-6">
                    <ul className="grid gap-2 sm:grid-cols-2">
                      {r.members.map((m) => (
                        <li key={m.id} className="flex items-start gap-3 rounded-2xl bg-sand p-3">
                          <span className={cn("grid size-10 shrink-0 place-items-center rounded-xl font-display font-bold", m.gender === "F" ? "bg-maroon/10 text-maroon" : "bg-green-dark/10 text-green-dark")}>{m.name[0]}</span>
                          <div className="min-w-0">
                            <p className="font-bold">
                              {m.name.split(" ")[0]} <span className="font-display text-maroon">{m.age}</span>
                            </p>
                            <p className="text-xs text-ink-soft">{m.relation}</p>
                            {m.needs.length > 0 && (
                              <p className="mt-1 flex flex-wrap gap-1">
                                {m.needs.map((x) => (
                                  <span key={x} className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-bold", LIFT_NEEDS.includes(x) ? "bg-maroon text-white" : "bg-white text-maroon ring-1 ring-maroon/20")}>
                                    {LIFT_NEEDS.includes(x) && <Accessibility className="size-3" />} {x}
                                  </span>
                                ))}
                              </p>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                    {r.note && <p className="mt-3 rounded-xl border-r-4 border-gold-dark bg-gold/10 px-3 py-2 text-sm text-ink-soft">{r.note}</p>}

                    <div className="mt-5 rounded-2xl border border-gold/40 p-4">
                      <p className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
                        <span>سعة المجموعة: <b>{g.capacity}</b></span>
                        <span>الأعضاء الفعّالون: <b>{active}</b></span>
                        <span className={cn(over ? "text-maroon" : "text-green")}>بعد القبول: <b>{after}</b></span>
                      </p>
                      <div className="relative mt-3 h-3 overflow-hidden rounded-full bg-sand">
                        <motion.div className="absolute inset-y-0 right-0 rounded-full bg-green-dark" initial={false} animate={{ width: `${Math.min(100, (active / g.capacity) * 100)}%` }} />
                        <motion.div
                          className={cn("absolute inset-y-0 rounded-full", over ? "bg-maroon" : "bg-gold-dark")}
                          style={{ right: `${Math.min(100, (active / g.capacity) * 100)}%` }}
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.max(0, Math.min(100, (after / g.capacity) * 100) - Math.min(100, (active / g.capacity) * 100))}%`, opacity: [1, 0.55, 1] }}
                          transition={{ opacity: { repeat: Infinity, duration: 1.6 } }}
                        />
                      </div>
                      {over && <p className="mt-2 flex items-center gap-1.5 text-xs font-bold text-maroon"><TriangleAlert className="size-4" /> القبول سيتجاوز السعة — سترفضه المنصة لحظة التفعيل</p>}
                    </div>

                    {needsLift(r) && (
                      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 flex items-start gap-2 rounded-2xl bg-maroon/6 p-3 text-sm leading-7 text-maroon">
                        <Accessibility className="mt-1 size-5 shrink-0" />
                        الطلب يتضمن حاجة تحتاج غرفة قريبة من المصعد — سيُنقل هذا إلى مشرف البرج تلقائياً.
                      </motion.p>
                    )}

                    <div className="mt-5 flex flex-wrap justify-end gap-3">
                      <Button variant="outline" onClick={() => { setRejecting(r); setReason(r.note ? REJECT_REASONS[0] : REJECT_REASONS[1]); }}>
                        <X className="size-4" /> رفض مع السبب
                      </Button>
                      <Button onClick={() => accept(r)}>
                        <Check className="size-4" /> قبول {n > 1 ? `الأفراد ${n}` : ""}
                      </Button>
                    </div>
                  </div>
                </motion.article>
              );
            })}
          </AnimatePresence>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-28">
          <div className="rounded-3xl border border-gold/30 bg-white p-5">
            <p className="font-bold text-green-dark">القرارات المتخذة</p>
            {decided.length === 0 ? (
              <p className="mt-2 text-sm text-hint">لا قرارات بعد.</p>
            ) : (
              <ul className="mt-3 space-y-2">
                {decided.map(({ req, d }) => (
                  <motion.li layout key={req.id} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="flex items-center gap-2 rounded-xl bg-sand px-3 py-2 text-sm">
                    {d === "accepted" ? <CircleCheck className="size-5 shrink-0 text-green-light" /> : <CircleX className="size-5 shrink-0 text-maroon" />}
                    <span className="min-w-0 flex-1 truncate">{req.applicant}</span>
                    <span className="text-xs text-hint">{d === "accepted" ? `+${memberCountOf(req.id, applications)}` : "مرفوض"}</span>
                  </motion.li>
                ))}
              </ul>
            )}
          </div>
          <div className="rounded-3xl bg-green-dark p-5 text-sm leading-7 text-white/85">
            <p className="font-bold text-gold">قواعد الانتساب</p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>الطلب العائلي يُقبل كاملاً أو يُرفض.</li>
              <li>لكل حاج مجموعة فعّالة واحدة فقط في الموسم.</li>
              <li>لا يُسند أحد إلى مجموعة دون موافقته.</li>
              <li>الرفض يتطلب سبباً يصل إلى الحاج.</li>
            </ul>
          </div>
          <p className="rounded-3xl bg-gold/20 p-4 text-xs leading-6 text-ink">
            تقييم الموظف: ترى رنا حداد مؤشر «سرعة الرد على طلبات الانتساب» لكل رئيس مجموعة.
          </p>
        </aside>
      </div>

      <Modal open={!!rejecting} onClose={() => setRejecting(null)}>
        {rejecting && (
          <div>
            <h3 className="font-display text-2xl font-bold text-green-dark">رفض طلب {rejecting.applicant}</h3>
            <p className="mt-1 text-sm text-ink-soft">السبب إلزامي، ويصل إلى الحاج مع الإشعار.</p>
            <div className="mt-5 space-y-2" role="radiogroup">
              {REJECT_REASONS.map((x) => (
                <label key={x} className={cn("flex cursor-pointer items-center gap-3 rounded-2xl border-2 p-3 text-sm font-semibold transition", reason === x ? "border-maroon bg-maroon/5" : "border-gold/40")}>
                  <input type="radio" name="reason" checked={reason === x} onChange={() => setReason(x)} className="accent-maroon" />
                  {x}
                </label>
              ))}
            </div>
            {reason === "سبب آخر" && (
              <textarea value={other} onChange={(e) => setOther(e.target.value)} rows={3} placeholder="اكتب السبب بوضوح" className="mt-3 w-full rounded-2xl border-2 border-gold/50 p-3 outline-none focus:border-green-light" />
            )}
            <div className="mt-6 flex justify-end gap-3">
              <Button variant="ghost" onClick={() => setRejecting(null)}>إلغاء</Button>
              <Button variant="maroon" onClick={reject} disabled={reason === "سبب آخر" && !other.trim()}>
                تأكيد الرفض
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </AdminShell>
  );
}

function CapacityGrid({ active, capacity }: { active: number; capacity: number }) {
  return (
    <div className="mt-5 grid grid-cols-10 gap-1.5 sm:gap-2" aria-label={`${active} من ${capacity} مقعداً مشغولاً`}>
      {Array.from({ length: capacity }, (_, i) => {
        const filled = i < active;
        return (
          <motion.span
            key={i}
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1, backgroundColor: filled ? "#00594F" : "#F7F4EF" }}
            transition={{ delay: i * 0.012, duration: 0.3 }}
            className={cn("aspect-square rounded-md border", filled ? "border-green-dark" : "border-gold/50")}
          />
        );
      })}
    </div>
  );
}
