"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowLeft, BadgeCheck, BookOpen, Bus, CalendarCheck, Hotel, Images, MapPin, ShieldCheck, Sparkles, Star, Utensils, Wallet } from "lucide-react";
import { Card } from "@/components/portal/shell";
import { ClusterContactCard, ClusterFactsCard, ClusterGroupsCard, ClusterTeamCard } from "./cluster-team";
import { ButtonLink } from "@/components/ui/button";
import { Gallery } from "../_components/gallery";
import { useClusterDirectory } from "@/lib/cluster-profile";
import { ROOM_BEDS, ROOM_LABEL, priceRange } from "@/lib/rooms";
import { SEASON } from "@/lib/season";
import { HARAM, NABAWI, coverOf, type LatLng, type ServiceLevel } from "@/lib/data/clusters";
import { MapPicker, mapsLink } from "@/components/ui/map-picker";
import { CmsImage } from "@/components/cms/image";
import { levelEn } from "@/app/conditions/_lib/en";
import { useT } from "@/lib/i18n";
import { cn, formatNumber, formatUSD } from "@/lib/utils";

const ROOM_LABEL_EN = { 1: "single room with one bed and its own bathroom", 2: "two-bed room", 3: "three-bed room", 4: "four-bed room" } as const;


const LEVEL_STYLE: Record<ServiceLevel, string> = {
  "اقتصادي": "bg-white/90 text-green-dark",
  "اقتصادي محسن": "bg-green-light text-white",
  "خمس نجوم": "bg-gradient-to-l from-gold-dark to-gold text-ink",
};

/** A hotel on the map beside its mosque, and the way to open it in the maps */
function HotelMap({ at, mosque, label }: { at: LatLng; mosque: { at: LatLng; label: string }; label: string }) {
  const t = useT();
  // Zoomed out enough to show both the hotel and the mosque
  const far = Math.max(Math.abs(at.lat - mosque.at.lat), Math.abs(at.lng - mosque.at.lng));
  const zoom = far > 0.04 ? 12 : far > 0.015 ? 13 : far > 0.006 ? 14 : 15;
  const mid = { lat: (at.lat + mosque.at.lat) / 2, lng: (at.lng + mosque.at.lng) / 2 };
  return (
    <div className="mt-3">
      <MapPicker readOnly label={label} value={at} center={mid} zoom={zoom} landmark={mosque} className="h-48" key={`${at.lat},${at.lng}`} />
      <a href={mapsLink(at)} target="_blank" rel="noreferrer" className="mt-1 inline-block text-xs font-semibold text-green-dark underline">
        {t("افتح في الخرائط", "Open in maps")}
      </a>
    </div>
  );
}

function Stars({ value }: { value: number }) {
  const t = useT();
  return (
    <span className="flex items-center gap-1.5">
      <span className="flex" dir="ltr" aria-hidden>
        {[1, 2, 3, 4, 5].map((n) => (
          <span key={n} className="relative size-4">
            <Star className="absolute inset-0 size-4 text-gold" />
            <span className="absolute inset-0 overflow-hidden" style={{ width: `${Math.max(0, Math.min(1, value - n + 1)) * 100}%` }}>
              <Star className="size-4 fill-gold-dark text-gold-dark" />
            </span>
          </span>
        ))}
      </span>
      <span className="font-bold text-ink">{value.toFixed(1)}</span>
      <span className="sr-only">{t("من 5", "out of 5")}</span>
    </span>
  );
}

/**
 * The cluster's published programme, on a page of its own rather than in a dialog: a pilgrim compares
 * clusters before he picks one, so he needs room to read, a link he can keep, and a page he can print.
 */
export function ClusterPage({ slug }: { slug: string }) {
  const t = useT();
  const c = useClusterDirectory().find((x) => x.slug === slug);

  if (!c) {
    return (
      <div className="mx-auto w-full max-w-3xl px-4 py-20 text-center">
        <h1 className="font-display text-3xl font-bold text-green-dark">{t("لا يوجد تكتل على هذا الرابط", "There is no cluster at this address")}</h1>
        <p className="mt-3 leading-8 text-ink-soft">
          {t(
            `قد يكون الرابط قديماً أو التكتل لم يُعتمد بعد. تصفّح التكتلات المعتمدة لموسم ${SEASON.hijriYear}هـ.`,
            `The link may be out of date, or the cluster not approved yet. Browse the clusters approved for the ${SEASON.hijriYear} AH season.`,
          )}
        </p>
        <ButtonLink href="/clusters" className="mt-6">
          {t("التكتلات والمجموعات", "Clusters and groups")} <ArrowLeft className="size-5" />
        </ButtonLink>
      </div>
    );
  }

  const seats = c.groups.reduce((n, g) => n + g.remaining, 0);
  const blocks = [
    { icon: Bus, title: t("النقل", "Transport"), items: c.transport },
    { icon: Utensils, title: t("الإعاشة", "Meals"), items: c.meals },
    { icon: BookOpen, title: t("البرامج", "Programmes"), items: c.programs },
  ];

  return (
    <div>
      {/* Hero */}
      <section className="relative h-[22rem] overflow-hidden md:h-[26rem]">
        <CmsImage src={coverOf(c)} alt="" fill priority sizes="100vw" quality={75} className="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-green-dark via-green-dark/70 to-green-dark/20" />
        <div className="bg-pattern absolute inset-0 opacity-15" />
        <div className="relative mx-auto flex h-full w-full max-w-7xl flex-col justify-end px-4 pb-8 md:px-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}>
            <nav aria-label={t("مسار التنقل", "Breadcrumb")} className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-white/70">
              <Link href="/" className="hover:text-gold">{t("الرئيسية", "Home")}</Link>
              <span>/</span>
              <Link href="/clusters" className="hover:text-gold">{t("التكتلات والمجموعات", "Clusters and groups")}</Link>
              <span>/</span>
              <span className="text-white">{c.name}</span>
            </nav>
            <div className="flex flex-wrap items-center gap-2">
              <span className={cn("rounded-full px-3 py-1 text-xs font-bold", LEVEL_STYLE[c.level])}>{t(c.level, levelEn(c.level))}</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <BadgeCheck className="size-3.5 text-green-light" /> {t("معتمد من الإدارة", "Approved by the Administration")}
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-xs font-bold text-white ring-1 ring-white/25">
                <CalendarCheck className="size-3.5 text-gold" /> {t(`منذ ${c.since}هـ`, `Since ${c.since} AH`)}
              </span>
            </div>
            <h1 className="mt-3 font-display text-4xl font-bold text-white md:text-5xl">{c.name}</h1>
            <p className="mt-2 max-w-2xl leading-8 text-white/85">{c.specialty}</p>
            {c.team && (
              <p className="mt-1 text-sm font-semibold text-gold">
                {t("رئيس التكتل: ", "Head of the cluster: ")}
                <bdi>{c.team.head.name}</bdi>
              </p>
            )}
            <p className="mt-2 text-sm text-white/70">
              {t(`${c.governorate} · ${c.office} · برنامج معتمد في ${c.approvedOn}`, `${c.governorate} · ${c.office} office · programme approved on ${c.approvedOn}`)}
            </p>
          </motion.div>
        </div>
      </section>

      <div className="mx-auto w-full max-w-7xl px-4 py-10 md:px-8">
        {/* Numbers */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { k: t("التقييم", "Rating"), v: c.reviews ? <Stars value={c.rating} /> : <span className="font-display text-xl font-bold text-gold-dark">{t("تكتل جديد", "New cluster")}</span>, hint: !c.reviews ? t("لا تقييمات بعد: يقيّمه حجاجه بعد موسمه الأول", "No reviews yet: its pilgrims rate it after its first season") : t(`${formatNumber(c.reviews)} تقييماً من حجاج سابقين`, `${formatNumber(c.reviews)} reviews from past pilgrims`) },
            {
              k: t("المجموعات", "Groups"),
              v: <span className="font-display text-2xl font-bold text-green-dark">{c.groupsCount}</span>,
              hint: c.team
                ? t(`${formatNumber(c.pilgrims)} حاجاً هذا الموسم، ويخدمهم ${c.team.size} إدارياً`, `${formatNumber(c.pilgrims)} pilgrims this season, served by ${c.team.size} administrators`)
                : t(`${formatNumber(c.pilgrims)} حاجاً هذا الموسم`, `${formatNumber(c.pilgrims)} pilgrims this season`),
            },
            { k: t("المقاعد المتاحة", "Places available"), v: <span className="font-display text-2xl font-bold text-green-dark">{seats}</span>, hint: t("تتغير مع تسجيل الحجاج", "Changes as pilgrims register") },
            {
              k: t("السكن الخاص للفرد", "Private rooms, per person"),
              v: (
                <span className="font-display text-2xl font-bold text-green-dark" dir="ltr">
                  {formatUSD(priceRange(c.rooms).from)} – {formatUSD(priceRange(c.rooms).to)}
                </span>
              ),
              hint: t("من غرفة بأربعة أسرّة إلى المفردة؛ السكن العام دون كلفة", "From a four-bed room to a single; shared accommodation at no charge"),
            },
          ].map((x, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} className="rounded-3xl border border-gold/30 bg-white p-5">
              <p className="text-xs text-hint">{x.k}</p>
              <div className="mt-1">{x.v}</div>
              <p className="mt-1 text-xs text-ink-soft">{x.hint}</p>
            </motion.div>
          ))}
        </div>

        <div className="mt-8 grid items-start gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <div className="space-y-6">
            <Card className="md:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <Sparkles className="size-6 text-gold-dark" /> {t("عن التكتل", "About the cluster")}
              </h2>
              <p className="mt-3 leading-8 text-ink-soft">{c.about}</p>
            </Card>

            {!!c.gallery?.length && (
              <Card className="md:p-7">
                <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                  <Images className="size-6 text-gold-dark" /> {t("معرض الصور", "Photo gallery")}
                </h2>
                <div className="mt-4">
                  <Gallery images={c.gallery} title={c.name} />
                </div>
              </Card>
            )}

            {/* Accommodation */}
            <Card className="md:p-7">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold text-green-dark">
                <Hotel className="size-6 text-gold-dark" /> {t("السكن", "Housing")}
              </h2>
              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-maroon">
                    <Hotel className="size-4" /> {t("مكة المكرمة", "Makkah")}
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-ink">{c.makkah.hotel}</p>
                  <p className="text-sm text-ink-soft">
                    {c.makkah.area} · {c.makkah.distance}
                  </p>
                  {c.makkah.at && <HotelMap at={c.makkah.at} mosque={{ at: HARAM, label: t("المسجد الحرام", "Al-Masjid al-Haram") }} label={c.makkah.hotel} />}
                  <p className="mt-1 text-sm text-ink-soft">{c.makkah.rooms}</p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {c.makkah.features.map((f) => (
                      <span key={f} className="rounded-full bg-white px-2.5 py-1 text-xs text-ink-soft ring-1 ring-gold/40">
                        {f}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-gold/40 bg-sand/60 p-5">
                  <p className="flex items-center gap-2 text-xs font-bold text-maroon">
                    <MapPin className="size-4" /> {t("المدينة المنورة", "Madinah")}
                  </p>
                  <p className="mt-2 font-display text-xl font-bold text-ink">{c.madinah.hotel}</p>
                  <p className="text-sm text-ink-soft">
                    {c.madinah.area} · {c.madinah.distance}
                  </p>
                  {c.madinah.at && <HotelMap at={c.madinah.at} mosque={{ at: NABAWI, label: t("المسجد النبوي", "The Prophet's Mosque") }} label={c.madinah.hotel} />}
                </div>
              </div>
            </Card>

            {/* Services */}
            <div className="grid gap-4 sm:grid-cols-3">
              {blocks.map(({ icon: Icon, title, items }, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 * i }} className="rounded-3xl border border-gold/30 bg-white p-5">
                  <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                    <Icon className="size-5 text-gold-dark" /> {title}
                  </p>
                  <ul className="mt-3 space-y-2 text-sm leading-7 text-ink-soft">
                    {items.map((t) => (
                      <li key={t} className="flex gap-2">
                        <span className="mt-2.5 size-1.5 shrink-0 rounded-full bg-gold-dark" /> {t}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
            </div>

            {/* The team and the groups, from the cluster's approved request in the administrators' platform */}
            {c.team && <ClusterTeamCard team={c.team} />}
          </div>

          {/* Aside */}
          <aside className="space-y-4">
            {c.team && <ClusterContactCard team={c.team} />}
            {c.team && <ClusterFactsCard cluster={c} team={c.team} />}
            <div className="rounded-[2rem] bg-green-dark p-6 text-white">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-gold">
                <ShieldCheck className="size-5" /> {t("ما معنى «معتمد»؟", "What does «approved» mean?")}
              </p>
              <p className="mt-2 text-sm leading-7 text-white/80">
                {t(
                  `هذا التكتل مرخّص من إدارة الحج والعمرة لموسم ${SEASON.hijriYear}هـ، وبرنامجه أعلاه هو ما التزم به أمامها. أي جهة خارج هذا الدليل ليست معتمدة، ولا تقبل منها تسجيلاً ولا دفعاً.`,
                  `This cluster is licensed by the Directorate of Hajj and Umrah for the ${SEASON.hijriYear} AH season, and the programme above is what it has committed to. Any organisation outside this directory is not approved: do not register or pay through it.`,
                )}
              </p>
              <ButtonLink href="/clusters" variant="gold" size="sm" className="mt-4 w-full">
                {t("بقية التكتلات المعتمدة", "The other approved clusters")}
              </ButtonLink>
            </div>
            <div className="rounded-[2rem] border border-gold/30 bg-white p-6">
              <p className="flex items-center gap-2 font-display text-lg font-bold text-green-dark">
                <Wallet className="size-5 text-gold-dark" /> {t("التكاليف", "Costs")}
              </p>
              <dl className="mt-3 space-y-2 text-sm">
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">{t("تكلفة الحج للفرد", "Hajj cost per person")}</dt>
                  <dd className="whitespace-nowrap font-bold" dir="ltr">{formatUSD(SEASON.fees.hajjCost)}</dd>
                </div>
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">{t("السكن العام (الرجال وحدهم والنساء وحدهن)", "Shared accommodation (men and women housed separately)")}</dt>
                  <dd className="whitespace-nowrap font-bold">{t("دون كلفة", "No charge")}</dd>
                </div>
                {ROOM_BEDS.map((b) => (
                  <div key={b} className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                    <dt className="text-ink-soft">{t(`سكن خاص: ${ROOM_LABEL[b]} — للفرد`, `Private: ${ROOM_LABEL_EN[b]} — per person`)}</dt>
                    <dd className="whitespace-nowrap font-bold" dir="ltr">{formatUSD(c.rooms[b])}</dd>
                  </div>
                ))}
                <div className="flex justify-between gap-2 rounded-xl bg-sand px-3 py-2">
                  <dt className="text-ink-soft">{t("الهدي", "Hady (sacrificial animal)")}</dt>
                  <dd className="whitespace-nowrap font-bold" dir="ltr">{formatUSD(SEASON.fees.hady)}</dd>
                </div>
              </dl>
              <p className="mt-3 text-xs leading-6 text-hint">{t("التكلفة تحددها الإدارة للموسم كله، ولا يزيدها التكتل. الدفع إلى حساب المنصة لا إلى أشخاص.", "The Administration sets the cost for the whole season, and the cluster cannot add to it. Pay into the platform's account, never to individuals.")}</p>
            </div>
            <ButtonLink href="/portal/apply" size="lg" className="w-full">
              {t("قدّم طلب حج", "Apply for Hajj")} <ArrowLeft className="size-5" />
            </ButtonLink>
          </aside>
        </div>

        {/* The groups take the page's whole width under both columns: a long list beside the aside left it empty */}
        {c.team && (
          <div className="mt-6">
            <ClusterGroupsCard team={c.team} clusterName={c.name} level={c.level} />
          </div>
        )}
      </div>
    </div>
  );
}
