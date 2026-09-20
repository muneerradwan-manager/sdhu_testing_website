"use client";

/**
 * خطّافات تقرأ مجموعات المحتوى وتعيدها بالأشكال نفسها التي كانت الصفحات تستعملها،
 * فلا تتغيّر مكوّنات العرض إلا في سطر الاستيراد.
 *
 * كل ما يعيده هذا الملف يمرّ بلوحة التحكم: ما أرشفه الموظف لا يظهر، وما عدّله يظهر معدَّلاً،
 * وما أنشأه يظهر في مقدمة القائمة.
 */

import { useMemo } from "react";
import { lessonItemId, toStrings } from "./collections";
import { cms, readLiveCollection, useCms, type CollectionItem } from "./store";
import {
  LECTURERS,
  TRACKS,
  trackLessons,
  type Lecturer,
  type Lesson,
  type LessonRef,
  type Level,
  type Track,
} from "@/lib/data/academy";
import type { Cluster, ClusterGroup, ServiceLevel } from "@/lib/data/clusters";
import { DAYS } from "@/lib/data/guide";
import type { GuideDay } from "@/lib/data/guide";
import type { Faq, FaqCategory } from "@/lib/data/faq";
import type { Article, Block, Category } from "@/lib/data/news";

const s = (v: unknown, fallback = "") => (typeof v === "string" ? v : typeof v === "number" ? String(v) : fallback);
const n = (v: unknown, fallback = 0) => (typeof v === "number" && !Number.isNaN(v) ? v : Number(v) || fallback);
const b = (v: unknown) => v === true;
const rows = <T,>(v: unknown): T[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as T[]) : []);

// ───────────────────────── الأخبار ─────────────────────────

function wordCount(blocks: Block[]) {
  const text = blocks
    .map((x) => {
      switch (x.type) {
        case "p":
        case "h":
        case "quote":
          return x.text;
        case "list":
          return x.items.join(" ");
        case "callout":
          return `${x.title} ${x.text}`;
        case "table":
          return [...x.head, ...x.rows.flat()].join(" ");
        default:
          return "";
      }
    })
    .join(" ");
  return text.split(/\s+/).filter(Boolean).length;
}

function toArticle(item: CollectionItem): Article {
  const v = item.values;
  const body = (Array.isArray(v.body) ? v.body : []) as Block[];
  return {
    slug: item.id,
    title: s(v.title),
    category: s(v.category, "إعلانات رسمية") as Category,
    hijri: s(v.hijri),
    gregorian: s(v.gregorian),
    iso: s(v.iso),
    image: s(v.image),
    excerpt: s(v.excerpt),
    body,
    tags: toStrings(v.tags),
    author: s(v.author),
    department: s(v.department),
    views: n(v.views),
    pinned: b(v.pinned),
    ticker: s(v.ticker) || undefined,
    readingMinutes: Math.max(2, Math.round(wordCount(body) / 130)),
  };
}

/** كل المقالات المنشورة، الأحدث أولاً */
export function useArticles(): Article[] {
  return useCms((state) =>
    readLiveCollection(state, "news")
      .map(toArticle)
      .filter((a) => a.title)
      .sort((a, x) => x.iso.localeCompare(a.iso)),
  );
}

export function useArticle(slug: string): Article | null {
  const articles = useArticles();
  return articles.find((a) => a.slug === slug) ?? null;
}

/** مقالات قريبة من المقال المفتوح: التصنيف نفسه أولاً، ثم الوسوم المشتركة */
export function useRelatedArticles(article: Article | null, count = 3): Article[] {
  const articles = useArticles();
  if (!article) return [];
  const others = articles.filter((a) => a.slug !== article.slug);
  const score = (a: Article) => (a.category === article.category ? 3 : 0) + a.tags.filter((t) => article.tags.includes(t)).length;
  return [...others].sort((a, x) => score(x) - score(a) || x.iso.localeCompare(a.iso)).slice(0, count);
}

export function useMostRead(count = 5): Article[] {
  const articles = useArticles();
  return [...articles].sort((a, x) => x.views - a.views).slice(0, count);
}

// ───────────────────────── الأسئلة الشائعة ─────────────────────────

export function useFaqs(): Faq[] {
  return useCms((state) =>
    readLiveCollection(state, "faq")
      .map((i) => ({ category: s(i.values.category) as FaqCategory, q: s(i.values.q), a: s(i.values.a) }))
      .filter((f) => f.q && f.a),
  );
}

// ───────────────────────── دليل المناسك ─────────────────────────

export function useGuideDays(): GuideDay[] {
  return useCms((state) =>
    readLiveCollection(state, "guideDays").map((i) => {
      const v = i.values;
      return {
        id: i.id,
        day: s(v.day),
        name: s(v.name),
        hijri: s(v.hijri),
        image: s(v.image),
        place: { label: s(v.placeLabel), lat: n(v.placeLat, 21.42), lng: n(v.placeLng, 39.82) },
        intro: s(v.intro),
        tasks: toStrings(v.tasks),
        times: rows<{ time: unknown; label: unknown }>(v.times).map((t) => ({ time: s(t.time), label: s(t.label) })),
        dua: { title: s(v.duaTitle), text: s(v.duaText) },
        // ربط اليوم بدرس الأكاديمية ليس محتوى تحريرياً، فيبقى كما هو في الشيفرة
        lesson: DAYS.find((d) => d.id === i.id)?.lesson ?? { track: "", lesson: "", title: "" },
      } satisfies GuideDay;
    }),
  );
}

export type GuideDua = { title: string; when: string; text: string; source?: string };

export function useGuideDuas(): GuideDua[] {
  return useCms((state) =>
    readLiveCollection(state, "guideDuas")
      .map((i) => ({ title: s(i.values.title), when: s(i.values.when), text: s(i.values.text), source: s(i.values.source) || undefined }))
      .filter((d) => d.text),
  );
}

// ───────────────────────── التكتلات المعتمدة ─────────────────────────

function mapClusters(state: Parameters<typeof readLiveCollection>[0]): Cluster[] {
  return readLiveCollection(state, "clusters").map((i) => {
      const v = i.values;
      return {
        slug: i.id,
        name: s(v.name),
        since: n(v.since, 1440),
        level: s(v.level, "عادي") as ServiceLevel,
        rating: n(v.rating),
        reviews: n(v.reviews),
        governorate: s(v.governorate),
        office: s(v.office),
        specialty: s(v.specialty),
        about: s(v.about),
        approvedOn: s(v.approvedOn),
        groupsCount: n(v.groupsCount),
        pilgrims: n(v.pilgrims),
        makkah: {
          hotel: s(v.makkahHotel),
          area: s(v.makkahArea),
          distance: s(v.makkahDistance),
          rooms: s(v.makkahRooms),
          features: toStrings(v.makkahFeatures),
        },
        madinah: { hotel: s(v.madinahHotel), area: s(v.madinahArea), distance: s(v.madinahDistance) },
        transport: toStrings(v.transport),
        meals: toStrings(v.meals),
        programs: toStrings(v.programs),
        privateRoomDiff: n(v.privateRoomDiff),
        groups: rows<Record<string, unknown>>(v.groups).map(
          (g) => ({ no: n(g.no), leader: s(g.leader), capacity: n(g.capacity), remaining: n(g.remaining) }) satisfies ClusterGroup,
        ),
        tone: (v.tone === "gold" || v.tone === "maroon" ? v.tone : "green") as Cluster["tone"],
    } satisfies Cluster;
  });
}

export function useClusters(): Cluster[] {
  return useCms(mapClusters);
}

/**
 * قراءة فورية غير تفاعلية — لشاشات العمليات (طلب الانتساب، التسديد، اعتماد المجموعات)
 * التي تُعاد عرضها مع مخزن العرض نفسه، فتكفيها لقطة المحتوى الحالية.
 */
export function clustersNow(): Cluster[] {
  return mapClusters(cms.snapshot());
}

// ───────────────────────── الأكاديمية ─────────────────────────

const isLecturer = (v: unknown): v is Lecturer["id"] => typeof v === "string" && v in LECTURERS;

/** نصوص من اللوحة، وإن تُركت فارغة بقي النص الأصلي */
const keep = (edited: string[], original: string[]) => (edited.length ? edited : original);

function overlayLesson(base: Lesson, values: Record<string, unknown> | undefined): Lesson {
  if (!values) return base;
  const faq = rows<Record<string, unknown>>(values.faq)
    .map((f) => ({ q: s(f.q), a: s(f.a) }))
    .filter((f) => f.q);
  const duas = rows<Record<string, unknown>>(values.duas)
    .map((d) => ({ title: s(d.title), text: s(d.text), source: s(d.source) || undefined }))
    .filter((d) => d.text);
  return {
    ...base,
    title: s(values.title) || base.title,
    minutes: n(values.minutes, base.minutes) || base.minutes,
    lecturer: isLecturer(values.lecturer) ? values.lecturer : base.lecturer,
    poster: s(values.poster) || base.poster,
    summary: keep(toStrings(values.summary), base.summary),
    points: keep(toStrings(values.points), base.points),
    tags: keep(toStrings(values.tags), base.tags),
    faq: faq.length ? faq : base.faq,
    duas: duas.length ? duas : base.duas,
  };
}

/**
 * المسارات بعد دمج ما عدّله الموظف فوق بنيتها الأصلية.
 * بنية المستويات والاختبارات تبقى من الشيفرة؛ النصوص والصور والدروس تأتي من اللوحة،
 * والمؤرشف منها لا يظهر.
 */
function mapTracks(state: Parameters<typeof readLiveCollection>[0]): Track[] {
  // الدروس المنشورة فقط: غياب الدرس عن هذه القائمة يعني أن الموظف أرشفه
  const byId = new Map(readLiveCollection(state, "academyLessons").map((i) => [i.id, i.values]));

  return readLiveCollection(state, "academyTracks").flatMap((t) => {
    const base = TRACKS.find((x) => x.slug === t.id);
    if (!base) return [];
    const v = t.values;
    const levelEdits = rows<Record<string, unknown>>(v.levels);
    const gallery = rows<Record<string, unknown>>(v.gallery)
      .map((g) => s(g.src))
      .filter(Boolean);

    const levels: Level[] = base.levels
      .map((lvl, li) => ({
        ...lvl,
        title: s(levelEdits[li]?.title) || lvl.title,
        subtitle: s(levelEdits[li]?.subtitle) || lvl.subtitle,
        lessons: lvl.lessons.flatMap((ls) => {
          const id = lessonItemId(t.id, ls.slug);
          return byId.has(id) ? [overlayLesson(ls, byId.get(id))] : [];
        }),
      }))
      .filter((lvl) => lvl.lessons.length > 0);

    if (!levels.length) return [];

    return [
      {
        ...base,
        title: s(v.title) || base.title,
        short: s(v.short) || base.short,
        description: s(v.description) || base.description,
        image: s(v.image) || base.image,
        icon: (typeof v.icon === "string" ? v.icon : base.icon) as Track["icon"],
        tone: (v.tone === "gold" || v.tone === "maroon" || v.tone === "green" ? v.tone : base.tone) as Track["tone"],
        gallery: gallery.length ? gallery : base.gallery,
        levels,
      } satisfies Track,
    ];
  });
}

export function useTracks(): Track[] {
  return useCms(mapTracks);
}

export function useTrack(slug: string): Track | null {
  return useTracks().find((t) => t.slug === slug) ?? null;
}

export function useAllLessons(): LessonRef[] {
  const tracks = useTracks();
  return useMemo(() => tracks.flatMap(trackLessons), [tracks]);
}

/** الدرس المطلوب مع جاره السابق واللاحق داخل المسار */
export function useLessonRef(trackSlug: string, lessonSlug: string) {
  const track = useTrack(trackSlug);
  if (!track) return null;
  const list = trackLessons(track);
  const i = list.findIndex((r) => r.lesson.slug === lessonSlug);
  if (i < 0) return null;
  return { ...list[i], prev: list[i - 1], next: list[i + 1], list };
}

export function useAcademyStats() {
  const tracks = useTracks();
  const lessons = useAllLessons();
  return {
    tracks: tracks.length,
    lessons: lessons.length,
    hours: Math.round(lessons.reduce((sum, r) => sum + r.lesson.minutes, 0) / 60),
    learners: 48_215,
  };
}
