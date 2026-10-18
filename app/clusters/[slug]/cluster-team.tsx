"use client";

import { motion } from "motion/react";
import { Award, BookOpen, Calculator, Crown, Laptop, Medal, PhoneCall, Star, Timer, UserRound, Users, UsersRound } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Card } from "@/components/portal/shell";
import { Badge, Modal } from "@/components/ui/widgets";
import type { Cluster, ClusterTeam, TeamGroup, TeamMember } from "@/lib/data/clusters";
import { groupName } from "@/lib/groups";
import { useT } from "@/lib/i18n";
import { cn, formatNumber } from "@/lib/utils";
import { CmsImage } from "@/components/cms/image";
import { useGroupProfile } from "@/lib/group-profile";
import { Gallery } from "../_components/gallery";
import { PhoneLink } from "../_components/phone";

/** The roles and posts in English; the names stay Arabic */
const EN: Record<string, string> = {
  "رئيس تكتل": "Cluster head",
  "رئيس مجموعة": "Group head",
  "معاون": "Assistant",
  "منسق تقني": "Technical coordinator",
  "معاون ومنسق تقني": "Assistant and technical coordinator",
  "معاون بعدد": "Assistant (adds pilgrims)",
  "موجّه ديني أ": "Religious guide, grade A",
  "موجّه ديني ب": "Religious guide, grade B",
  "موجّه ديني ج": "Religious guide, grade C",
  "موجّهة دينية أ": "Female religious guide, grade A",
  "موجّهة دينية ب": "Female religious guide, grade B",
  "موجّهة دينية ج": "Female religious guide, grade C",
  "رئيس التكتل": "Head of the cluster",
  "رئيس التكتل ورئيس مجموعته": "Head of the cluster and of his own group",
  "رئيس المجموعة": "Head of the group",
  "نائب رئيس التكتل": "Deputy head of the cluster",
  "محاسب التكتل": "Accountant of the cluster",
  "معاون التكتل": "Assistant of the cluster",
  "المنسق التقني": "Technical coordinator",
  "موجّهة التكتل": "Female guide of the cluster",
  "موجّه المجموعة": "Guide of the group",
  "معاون المجموعة": "Assistant of the group",
};

function useWord() {
  const t = useT();
  return (ar: string) => t(ar, EN[ar] ?? ar);
}

/** «4 مواسم · تقييم آخر موسم 4.8» — or a first season on the platform */
function Experience({ m }: { m: TeamMember }) {
  const t = useT();
  if (!m.seasons) return <span className="text-xs text-hint">{t("أول موسم له على المنصة", "First season on the platform")}</span>;
  const seasons = m.seasons === 1 ? t("موسم واحد", "one season") : m.seasons === 2 ? t("موسمان", "two seasons") : t(`${m.seasons} مواسم`, `${m.seasons} seasons`);
  return (
    <span className="inline-flex flex-wrap items-center gap-x-2 text-xs text-ink-soft">
      <span>{t(`خبرة ${seasons}`, `Experience: ${seasons}`)}</span>
      {m.rating !== null && (
        <span className="inline-flex items-center gap-0.5 font-bold text-gold-dark">
          <Star className="size-3 fill-gold-dark" /> {m.rating.toFixed(1)}
          <span className="font-normal text-hint">{t(" آخر موسم", " last season")}</span>
        </span>
      )}
    </span>
  );
}

/** A female religious guide: a woman in a headscarf, in place of her photo */
function FemaleIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={className} aria-hidden>
      <path
        fill="currentColor"
        d="M20 4.5c-6.6 0-11.5 5.1-11.5 11.6 0 3.5 1.4 6.6 3.6 8.7C7.4 26.7 4 30.9 3.4 36c-.1.8.5 1.5 1.3 1.5h30.6c.8 0 1.4-.7 1.3-1.5-.6-5.1-4-9.3-8.7-11.2 2.2-2.1 3.6-5.2 3.6-8.7C31.5 9.6 26.6 4.5 20 4.5Z"
      />
      <ellipse cx="20" cy="16.8" rx="5.6" ry="6.6" fill="#fff" opacity=".92" />
    </svg>
  );
}

/**
 * A person's picture: his photo when the platform holds one, else the first letter of his name; a female religious
 * guide is never shown by her photo, only by the icon. `badge`: his place in the cluster, small in the corner.
 */
export function Avatar({ m, size = "md", badge }: { m: Pick<TeamMember, "name" | "photo" | "female">; size?: "sm" | "md" | "lg"; badge?: ReactNode }) {
  const box = size === "lg" ? "size-14 text-2xl" : size === "sm" ? "size-9 text-base" : "size-11 text-lg";
  return (
    <span className="relative shrink-0">
      {m.female ? (
        <span className={cn("grid place-items-center overflow-hidden rounded-xl bg-maroon/10 text-maroon", box)}>
          <FemaleIcon className="size-[80%] translate-y-[8%]" />
        </span>
      ) : m.photo ? (
        <span className={cn("relative block overflow-hidden rounded-xl", box)}>
          <CmsImage src={m.photo} alt="" fill sizes="56px" className="object-cover" />
        </span>
      ) : (
        <span className={cn("grid place-items-center rounded-xl font-display font-bold", box, size === "lg" ? "bg-green-dark text-gold" : "bg-gradient-to-br from-gold to-gold-dark text-ink")}>
          {m.name.replace(/^الشيخ\s+/, "")[0]}
        </span>
      )}
      {badge && <span className="absolute -bottom-1 -end-1 grid size-6 place-items-center rounded-full bg-white text-gold-dark shadow ring-2 ring-white [&>svg]:size-3.5">{badge}</span>}
    </span>
  );
}

/** One of the cluster's people: picture, name, post and role, experience, branch, and his phone */
function Person({ m, icon, big }: { m: TeamMember; icon?: ReactNode; big?: boolean }) {
  const t = useT();
  const word = useWord();
  return (
    <div className={cn("flex items-start gap-3 rounded-2xl bg-sand/60 p-3", big && "bg-gradient-to-l from-gold/25 to-sand/60 p-4")}>
      <Avatar m={m} size={big ? "lg" : "md"} badge={icon} />
      <span className="min-w-0 flex-1">
        <span className={cn("block font-bold leading-6 text-green-dark", big && "font-display text-xl")}>
          <bdi>{m.name}</bdi>
        </span>
        <span className="block text-xs font-semibold text-maroon">
          {word(m.post)}
          {m.role && m.role !== m.post && <span className="font-normal text-ink-soft"> · {word(m.role)}</span>}
        </span>
        <span className="mt-0.5 block">
          <Experience m={m} />
        </span>
        {m.branch && <span className="block text-[11px] text-hint">{t(`فرع ${m.branch}`, `${m.branch} branch`)}</span>}
        <PhoneLink phone={m.phone} className="mt-1.5" />
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-sm font-bold text-green-dark">{title}</p>
      <div className="grid gap-2 sm:grid-cols-2">{children}</div>
    </div>
  );
}

const BADGES = [
  { key: "guidance", icon: BookOpen, ar: "شارة التميّز في التوجيه الديني", en: "Excellence in religious guidance", hintAr: "في فريقه موجّه أو موجّهة من الدرجة «أ»", hintEn: "A grade-A guide serves in its team" },
  { key: "age", icon: Medal, ar: "شارة العمر", en: "Youthful team", hintAr: "متوسط أعمار فريقه 40 سنة أو أقل", hintEn: "Its team's average age is 40 or under" },
  { key: "timeliness", icon: Timer, ar: "شارة الالتزام بالمواعيد", en: "On time", hintAr: "قدّم طلب تشكيله قبل الموعد الأول", hintEn: "It filed its request before the early deadline" },
] as const;

/**
 * Who serves the cluster's pilgrims, from its approved request in the administrators' platform: its head, deputy
 * and accountant, its assistants, technical coordinators and female guides, and the badges its team earned.
 */
export function ClusterTeamCard({ team }: { team: ClusterTeam }) {
  const t = useT();
  const earned = BADGES.filter((b) => team.badges[b.key]);
  const groupsOf = (name: string, pick: (g: TeamGroup) => string | undefined) =>
    team.groups
      .filter((g) => pick(g) === name)
      .map((g) => groupName(g.no))
      .join("، ");
  return (
    <Card className="md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <UsersRound className="size-6 text-gold-dark" /> {t("فريق التكتل", "The cluster's team")}
      </h2>
      <p className="mt-2 text-sm leading-7 text-ink-soft">
        {t(
          `${team.size} إدارياً يخدمون حجاج التكتل، كلٌّ في مكانه من طلب التكتل الذي اعتمدته الإدارة: الخبرة عدد مواسمهم على المنصة، والتقييم ما ناله كلٌّ في آخر موسم شارك فيه.`,
          `${team.size} administrators serve the cluster's pilgrims, each in his place in the cluster's request as the Administration approved it: experience is their seasons on the platform, and the rating is what each earned in his last season.`,
        )}
      </p>

      {earned.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {earned.map((b) => (
            <span key={b.key} title={t(b.hintAr, b.hintEn)} className="inline-flex items-center gap-1.5 rounded-full bg-green-dark px-3 py-1.5 text-xs font-bold text-white">
              <b.icon className="size-3.5 text-gold" /> {t(b.ar, b.en)}
            </span>
          ))}
        </div>
      )}

      <div className="mt-5 grid gap-2">
        <Person m={team.head} icon={<Crown className="size-6" />} big />
      </div>
      {(team.deputy || team.accountant) && (
        <Section title={t("قيادة التكتل", "The cluster's leadership")}>
          {team.deputy && <Person m={team.deputy} icon={<Award className="size-5" />} />}
          {team.accountant && <Person m={team.accountant} icon={<Calculator className="size-5" />} />}
        </Section>
      )}
      {team.assistants.length > 0 && (
        <Section title={t("معاونو التكتل — للمطارات والمخيمات والطوارئ", "The cluster's assistants — airports, camps and emergencies")}>
          {team.assistants.map((m) => (
            <Person key={m.id} m={m} icon={<UserRound className="size-5" />} />
          ))}
        </Section>
      )}
      {team.coordinators.length > 0 && (
        <Section title={t("المنسقون التقنيون — بيانات الحجاج وأوراقهم، كلٌّ لمجموعاته", "Technical coordinators — the pilgrims' records and papers, each for his groups")}>
          {team.coordinators.map((m) => (
            <div key={m.id}>
              <Person m={m} icon={<Laptop className="size-5" />} />
              {groupsOf(m.name, (g) => g.coordinator) && <p className="mt-1 px-3 text-[11px] text-ink-soft">{t(`مجموعاته: ${groupsOf(m.name, (g) => g.coordinator)}`, `His groups: ${groupsOf(m.name, (g) => g.coordinator)}`)}</p>}
            </div>
          ))}
        </Section>
      )}
      {team.femaleGuides.length > 0 && (
        <Section title={t("الموجّهات الدينيات — لحاجّات التكتل", "Female religious guides — for the cluster's women pilgrims")}>
          {team.femaleGuides.map((m) => (
            <div key={m.id}>
              <Person m={m} icon={<BookOpen className="size-5" />} />
              {groupsOf(m.name, (g) => g.femaleGuide) && <p className="mt-1 px-3 text-[11px] text-ink-soft">{t(`حاجّات: ${groupsOf(m.name, (g) => g.femaleGuide)}`, `Women of: ${groupsOf(m.name, (g) => g.femaleGuide)}`)}</p>}
            </div>
          ))}
        </Section>
      )}
      <p className="mt-5 text-xs leading-6 text-hint">
        {t(`مستوى التكتل في طلبه المعتمد: ${team.tier}.`, `The cluster's tier in its approved request: ${team.tier}.`)}
      </p>
    </Card>
  );
}

/**
 * Whom the pilgrims call about the cluster: its assistants (airports, camps, emergencies) and its technical
 * coordinators (records and papers). A group is reached through its head, in «مجموعات التكتل وفرقها».
 */
export function ClusterContactCard({ team }: { team: ClusterTeam }) {
  const t = useT();
  const word = useWord();
  const people = [...team.assistants, ...team.coordinators].filter((m) => m.phone);
  if (!people.length) return null;
  return (
    <div id="contact" className="scroll-mt-28 rounded-[2rem] border-2 border-green-dark/15 bg-white p-6">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
        <PhoneCall className="size-5 text-gold-dark" /> {t("التواصل مع التكتل", "Contacting the cluster")}
      </p>
      <p className="mt-1 text-xs leading-6 text-ink-soft">
        {t("معاون رئيس التكتل والمنسق التقني. وللتواصل مع مجموعة اتصل برئيسها.", "The cluster head's assistant and the technical coordinator. To reach a group, call its head.")}
      </p>
      <ul className="mt-3 space-y-2">
        {people.map((m) => (
          <li key={m.id} className="rounded-2xl bg-sand/70 p-3">
            <p className="font-bold leading-6 text-ink">
              <bdi>{m.name}</bdi>
            </p>
            <p className="text-xs font-semibold text-maroon">{word(m.post)}</p>
            <PhoneLink phone={m.phone} className="mt-2" />
          </li>
        ))}
      </ul>
    </div>
  );
}

/** The cluster at a glance, beside its programme: who leads it, its tier and office, its groups, pilgrims and team, its badges */
export function ClusterFactsCard({ cluster, team }: { cluster: Cluster; team: ClusterTeam }) {
  const t = useT();
  const earned = BADGES.filter((b) => team.badges[b.key]);
  const rows: { k: string; v: ReactNode }[] = [
    { k: t("رئيس التكتل", "Head"), v: <bdi>{team.head.name}</bdi> },
    ...(team.deputy ? [{ k: t("نائبه", "Deputy"), v: <bdi>{team.deputy.name}</bdi> }] : []),
    ...(team.accountant ? [{ k: t("محاسبه", "Accountant"), v: <bdi>{team.accountant.name}</bdi> }] : []),
    { k: t("المستوى", "Tier"), v: team.tier },
    { k: t("المكتب", "Office"), v: cluster.office },
    { k: t("المجموعات", "Groups"), v: formatNumber(cluster.groupsCount) },
    { k: t("الحجاج", "Pilgrims"), v: formatNumber(cluster.pilgrims) },
    { k: t("الإداريون", "Administrators"), v: formatNumber(team.size) },
    { k: t("المنسقون والموجّهات", "Coordinators and female guides"), v: `${formatNumber(team.coordinators.length)} · ${formatNumber(team.femaleGuides.length)}` },
  ];
  return (
    <div className="rounded-[2rem] border border-gold/30 bg-white p-6">
      <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
        <Crown className="size-5 text-gold-dark" /> {t("بطاقة التكتل", "The cluster at a glance")}
      </p>
      <dl className="mt-3 space-y-2 text-sm">
        {rows.map((r) => (
          <div key={r.k} className="flex justify-between gap-3 rounded-xl bg-sand px-3 py-2">
            <dt className="text-ink-soft">{r.k}</dt>
            <dd className="text-end font-bold text-ink">{r.v}</dd>
          </div>
        ))}
      </dl>
      {earned.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {earned.map((b) => (
            <span key={b.key} title={t(b.hintAr, b.hintEn)} className="inline-flex items-center gap-1 rounded-full bg-green-dark px-2.5 py-1 text-[11px] font-bold text-white">
              <b.icon className="size-3 text-gold" /> {t(b.ar, b.en)}
            </span>
          ))}
        </div>
      )}
      <p className="mt-3 text-xs leading-6 text-hint">{t("من طلب التكتل الذي اعتمدته الإدارة في منصة الإداريين.", "From the cluster's request as the Administration approved it on the administrators' platform.")}</p>
    </div>
  );
}

function seatsLeft(n: number, t: (ar: string, en: string) => string) {
  if (n === 0) return t("مكتملة", "Full");
  if (n === 1) return t("بقي مقعد واحد", "1 place left");
  if (n === 2) return t("بقي مقعدان", "2 places left");
  return t(`بقي ${n} ${n <= 10 ? "مقاعد" : "مقعداً"}`, `${n} places left`);
}

/** Someone known to the group only by name (not found in the cluster's lists): no phone, no record */
const byName = (name: string, post: string, female?: boolean): TeamMember => ({ id: name, name, post, role: "", seasons: 0, rating: null, branch: "", female });

/** The group's people, in the order the dialog lists them: its head, its seats, and the cluster's people sorted to it */
function peopleOf(g: TeamGroup, team: ClusterTeam) {
  const coordinator = g.coordinator ? (team.coordinators.find((m) => m.name === g.coordinator) ?? byName(g.coordinator, "المنسق التقني")) : undefined;
  const femaleGuide = g.femaleGuide ? (team.femaleGuides.find((m) => m.name === g.femaleGuide) ?? byName(g.femaleGuide, "موجّهة التكتل", true)) : undefined;
  return { coordinator, femaleGuide, count: 1 + g.guides.length + g.assistants.length + (coordinator ? 1 : 0) + (femaleGuide ? 1 : 0) };
}

/**
 * A group in full, opened from its card: its head, the guides and assistants in its seats, the technical coordinator
 * and the female guide the cluster sorted to it — each with his picture and his phone (never the female guides').
 */
export function GroupDialog({ group: g, team, clusterName, level, open, onClose }: { group: TeamGroup; team: ClusterTeam; clusterName: string; level?: string; open: boolean; onClose: () => void }) {
  const t = useT();
  const page = useGroupProfile(g.no);
  const { coordinator, femaleGuide, count } = peopleOf(g, team);
  const remaining = Math.max(0, g.capacity - g.pilgrims);
  const pct = Math.min(100, Math.round((g.pilgrims / Math.max(1, g.capacity)) * 100));
  return (
    <Modal open={open} onClose={onClose} className="max-w-3xl md:p-8">
      {page?.cover && (
        <div className="relative -mx-6 -mt-6 mb-5 h-44 overflow-hidden rounded-t-3xl md:-mx-8 md:-mt-8 md:h-56">
          <CmsImage src={page.cover} alt={groupName(g.no)} fill sizes="768px" quality={75} className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-ink/50 to-transparent" />
        </div>
      )}
      <p className="text-xs font-bold text-gold-dark">
        <bdi>{clusterName}</bdi>
      </p>
      <h2 className="mt-1 pe-8 font-display text-3xl font-bold text-green-dark">{groupName(g.no)}</h2>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Badge tone="ink">{g.category}</Badge>
        {level && <Badge tone="gold">{level}</Badge>}
        {g.own && <Badge tone="maroon">{t("مجموعة رئيس التكتل", "The head's own group")}</Badge>}
        <Badge tone={remaining === 0 ? "maroon" : remaining <= 5 ? "gold" : "green"}>{seatsLeft(remaining, t)}</Badge>
      </div>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-sand">
        <div className={cn("h-full", remaining === 0 ? "bg-maroon" : "bg-green-light")} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-xs text-hint">
        {t(`${g.pilgrims} من ${g.capacity} مقعداً مشغولة · فريق من ${count} أشخاص`, `${g.pilgrims} of ${g.capacity} places taken · a team of ${count}`)}
      </p>
      {page?.about && <p className="mt-4 leading-8 text-ink-soft">{page.about}</p>}

      <div className="mt-5 grid gap-2">
        <Person m={g.head} icon={<Crown />} big />
      </div>
      {g.guides.length > 0 && (
        <Section title={t("الموجّه الديني", "Religious guide")}>
          {g.guides.map((m) => (
            <Person key={m.id} m={m} icon={<BookOpen />} />
          ))}
        </Section>
      )}
      {g.assistants.length > 0 && (
        <Section title={t("المعاون", "Assistant")}>
          {g.assistants.map((m) => (
            <Person key={m.id} m={m} icon={<UserRound />} />
          ))}
        </Section>
      )}
      {(coordinator || femaleGuide) && (
        <Section title={t("من فريق التكتل لهذه المجموعة", "From the cluster's team, for this group")}>
          {coordinator && <Person m={coordinator} icon={<Laptop />} />}
          {femaleGuide && <Person m={femaleGuide} icon={<BookOpen />} />}
        </Section>
      )}
      {!!page?.gallery.length && (
        <div className="mt-6">
          <p className="mb-2 text-sm font-bold text-green-dark">{t("معرض صور المجموعة", "The group's gallery")}</p>
          <Gallery images={page.gallery} title={groupName(g.no)} compact />
        </div>
      )}
      <p className="mt-6 rounded-2xl bg-gold/15 p-3 text-xs leading-6 text-ink-soft">
        {t(
          "للتواصل مع المجموعة اتصل برئيسها. والالتحاق بها لا يكون من المنصة: تتفق معها، وتوقّع عقدك في المكتب، فيلحقك موظف المكتب بها.",
          "To reach the group, call its head. You do not join it through the platform: you agree with it, sign your contract at the office, and the office staff add you to it.",
        )}
      </p>
    </Modal>
  );
}

/** A group's card: its name and category, its head only, and the seats left; pressed, the whole group opens */
export function GroupTile({ group: g, team, clusterName, level, i }: { group: TeamGroup; team: ClusterTeam; clusterName: string; level?: string; i: number }) {
  const t = useT();
  const [open, setOpen] = useState(false);
  const page = useGroupProfile(g.no);
  const remaining = Math.max(0, g.capacity - g.pilgrims);
  const pct = Math.min(100, Math.round((g.pilgrims / Math.max(1, g.capacity)) * 100));
  const { count } = peopleOf(g, team);
  return (
    <>
      <motion.li
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: Math.min(i, 8) * 0.05 }}
        onClick={() => setOpen(true)}
        className="group/tile flex cursor-pointer flex-col overflow-hidden rounded-2xl border-2 border-gold/30 bg-white p-4 transition hover:-translate-y-0.5 hover:border-green-dark/40 hover:shadow-[0_20px_40px_-30px_rgba(0,89,79,.6)]"
      >
        {page?.cover && (
          <div className="relative -mx-4 -mt-4 mb-4 h-32 overflow-hidden">
            <CmsImage src={page.cover} alt="" fill sizes="(min-width: 1280px) 30vw, (min-width: 768px) 45vw, 100vw" quality={65} className="object-cover transition duration-700 group-hover/tile:scale-105" />
          </div>
        )}
        <div className="flex flex-wrap items-start justify-between gap-3">
          <p className="font-bold text-ink">
            {groupName(g.no)} <span className="text-xs font-semibold text-gold-dark">· {g.category}</span>
            {g.own && <span className="ms-1 text-xs font-semibold text-maroon">· {t("مجموعة رئيس التكتل", "the head's own group")}</span>}
          </p>
          <Badge tone={remaining === 0 ? "maroon" : remaining <= 5 ? "gold" : "green"}>{seatsLeft(remaining, t)}</Badge>
        </div>
        <div className="mt-3 flex items-start gap-3">
          <Avatar m={g.head} badge={<Crown />} />
          <div className="min-w-0">
            <p className="text-xs text-hint">{t("رئيس المجموعة", "Head of the group")}</p>
            <p className="font-bold leading-6 text-green-dark">
              <bdi>{g.head.name}</bdi>
            </p>
            <Experience m={g.head} />
            <PhoneLink phone={g.head.phone} className="mt-1.5 flex w-fit" />
          </div>
        </div>
        <div className="mt-auto pt-4">
          <div className="h-2.5 overflow-hidden rounded-full bg-sand">
            <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: Math.min(i, 8) * 0.05 }} className={cn("h-full", remaining === 0 ? "bg-maroon" : "bg-green-light")} />
          </div>
          <div className="mt-1.5 flex items-center justify-between gap-2 text-xs">
            <span className="text-hint">{t(`${g.pilgrims} من ${g.capacity} مقعداً مشغولة`, `${g.pilgrims} of ${g.capacity} places taken`)}</span>
            <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-bold text-green-dark group-hover/tile:underline">
              <Users className="size-3.5" /> {t(`الفريق (${count})`, `The team (${count})`)}
            </button>
          </div>
        </div>
      </motion.li>
      <GroupDialog group={g} team={team} clusterName={clusterName} level={level} open={open} onClose={() => setOpen(false)} />
    </>
  );
}

/** Every group of the cluster, each card its head and seats; pressed, the group opens with all its people */
export function ClusterGroupsCard({ team, clusterName, level }: { team: ClusterTeam; clusterName: string; level?: string }) {
  const t = useT();
  return (
    <Card className="md:p-7">
      <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
        <Users className="size-6 text-gold-dark" /> {t("مجموعات التكتل وفرقها", "The cluster's groups and their teams")}
      </h2>
      <p className="mt-2 max-w-4xl text-sm leading-7 text-ink-soft">
        {t(
          "اضغط أي مجموعة لترى فريقها كله: رئيسها وموجّهها ومعاونها، والمنسق التقني وموجّهة الحاجّات. للتواصل مع مجموعة اتصل برئيسها. والالتحاق بها لا يكون من المنصة: تتفق مع المجموعة، وتوقّع عقدك معها في المكتب، فيلحقك موظف المكتب بها.",
          "Press any group to see its whole team: its head, guide and assistant, the technical coordinator and the female guide. To reach a group, call its head. You do not join it through the platform: you agree with the group and sign your contract with it at the office, and the office staff add you to it.",
        )}
      </p>
      {/* Side by side as the screen allows, each card's seats bar at its foot so a row's bars line up */}
      <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {team.groups.map((g, i) => (
          <GroupTile key={g.no} group={g} team={team} clusterName={clusterName} level={level} i={i} />
        ))}
      </ul>
    </Card>
  );
}
