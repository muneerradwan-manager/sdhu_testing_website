/**
 * أكاديمية الدروس الدينية — بيانات تجريبية (المحاضرون والأسماء وهمية، والمحتوى الفقهي عام ومعتمد لدى جمهور العلماء)
 */

import LECTURERS_DATA from "@/testdata/content/academy-lecturers.json";
import TRACKS_DATA from "@/testdata/content/academy-tracks.json";
import CLIPS_DATA from "@/testdata/content/academy-clips.json";
import STATS_DATA from "@/testdata/content/academy-stats.json";

export type MediaKind = "video" | "audio";

export type Faq = { q: string; a: string };

export type Dua = { title: string; text: string; source?: string };

export type Lesson = {
  slug: string;
  title: string;
  /** Lesson length in minutes */
  minutes: number;
  lecturer: LecturerId;
  media: MediaKind;
  /** Lesson also ships a downloadable audio file */
  hasAudio?: boolean;
  poster: string;
  /** Photos used by the simulated (slideshow) player */
  gallery?: string[];
  /** A real video file for a few lessons */
  videoSrc?: string;
  summary: string[];
  points: string[];
  faq: Faq[];
  tags: string[];
  duas?: Dua[];
};

export type QuizQuestion = { q: string; options: string[]; answer: number; explain: string };

export type Level = {
  title: string;
  subtitle: string;
  lessons: Lesson[];
  quiz: QuizQuestion[];
};

export type TrackIcon = "kaaba" | "umrah" | "heart" | "madinah" | "dua" | "bag";

export type Track = {
  slug: string;
  title: string;
  short: string;
  description: string;
  image: string;
  icon: TrackIcon;
  tone: "green" | "maroon" | "gold";
  gallery: string[];
  levels: Level[];
};

export type Clip = {
  slug: string;
  title: string;
  seconds: number;
  track: string;
  lesson: string;
  tags: string[];
};

// ───────────────────────── Lecturers ─────────────────────────

export type LecturerId = "abdulrahman" | "khaled" | "huda" | "nour" | "ahmad" | "samer" | "reem";

export type Lecturer = { id: LecturerId; name: string; role: string; bio: string; initials: string };

export const LECTURERS = LECTURERS_DATA as Record<LecturerId, Lecturer>;

// ───────────────────────── Tracks ─────────────────────────

export const TRACKS: Track[] = TRACKS_DATA as Track[];

// ───────────────────────── Short clips ─────────────────────────

export const CLIPS: Clip[] = CLIPS_DATA as Clip[];

// ───────────────────────── Stats & lookups ─────────────────────────

export type LessonRef = { track: Track; level: Level; levelIndex: number; lesson: Lesson; index: number };

export function trackLessons(track: Track): LessonRef[] {
  let index = 0;
  return track.levels.flatMap((level, levelIndex) => level.lessons.map((lesson) => ({ track, level, levelIndex, lesson, index: index++ })));
}

export const ALL_LESSONS: LessonRef[] = TRACKS.flatMap(trackLessons);

export function getTrack(slug: string) {
  return TRACKS.find((t) => t.slug === slug);
}

export function getLesson(trackSlug: string, lessonSlug: string) {
  const track = getTrack(trackSlug);
  if (!track) return undefined;
  const list = trackLessons(track);
  const i = list.findIndex((r) => r.lesson.slug === lessonSlug);
  if (i < 0) return undefined;
  return { ...list[i], prev: list[i - 1], next: list[i + 1], list };
}

export function trackMinutes(track: Track) {
  return trackLessons(track).reduce((sum, r) => sum + r.lesson.minutes, 0);
}

export const ACADEMY_STATS = {
  tracks: TRACKS.length,
  lessons: ALL_LESSONS.length,
  hours: Math.round(ALL_LESSONS.reduce((s, r) => s + r.lesson.minutes, 0) / 60),
  learners: STATS_DATA.learners,
};

export function lessonKey(track: string, lesson: string) {
  return `${track}/${lesson}`;
}

export function formatClock(totalSeconds: number) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Arabic number agreement: 1 → one, 2 → two, 3–10 → few, 11+ → many */
export function arabicCount(n: number, forms: { one: string; two: string; few: string; many: string }) {
  if (n === 1) return forms.one;
  if (n === 2) return forms.two;
  if (n >= 3 && n <= 10) return `${n} ${forms.few}`;
  return `${n} ${forms.many}`;
}

export const LESSON_FORMS = { one: "درس واحد", two: "درسان", few: "دروس", many: "درساً" };
export const CLIP_FORMS = { one: "مقطع قصير واحد", two: "مقطعان قصيران", few: "مقاطع قصيرة", many: "مقطعاً قصيراً" };
export const MINUTE_FORMS = { one: "دقيقة واحدة", two: "دقيقتان", few: "دقائق", many: "دقيقة" };

// ───────────────────────── Search ─────────────────────────

const STOP_WORDS = new Set(["في", "من", "على", "الى", "عن", "هل", "ما", "ماذا", "كيف", "او", "ثم", "مع", "عند", "هو", "هي", "التي", "الذي", "ان", "لا", "يا", "و"]);

/** Strips diacritics and unifies letter shapes so «الرأس» matches «راس» */
export function normalizeArabic(text: string) {
  return text
    .replace(/[ً-ٰٟـ]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .toLowerCase();
}

function stem(word: string) {
  let w = word;
  for (const p of ["وبال", "وال", "بال", "كال", "فال", "لل", "ال"]) {
    if (w.startsWith(p) && w.length - p.length >= 2) {
      w = w.slice(p.length);
      break;
    }
  }
  return w;
}

export function searchTokens(query: string) {
  return normalizeArabic(query)
    .split(/[^\p{L}\p{N}]+/u)
    .filter((w) => w.length > 1 && !STOP_WORDS.has(w))
    .map(stem)
    .filter((w) => w.length > 1);
}

const PREFIX_LETTERS = "وبلفك";

/** Every searchable form of a word: raw, without «ال», and without a one-letter prefix like «بـ» */
function wordForms(word: string) {
  const forms = [word, stem(word)];
  if (word.length > 3 && PREFIX_LETTERS.includes(word[0])) forms.push(word.slice(1), stem(word.slice(1)));
  return forms;
}

function indexWords(parts: string[]) {
  const words = new Set<string>();
  for (const w of normalizeArabic(parts.join(" ")).split(/[^\p{L}\p{N}]+/u)) if (w) wordForms(w).forEach((f) => words.add(f));
  return [...words];
}

/** True when a word in the text starts with the token (so «راس» matches «رأسها» but «عرفة» does not match «معرفة») */
export function wordMatches(word: string, token: string) {
  return wordForms(normalizeArabic(word)).some((f) => f.startsWith(token));
}

const matchesAll = (words: string[], tokens: string[]) => tokens.every((t) => words.some((w) => w.startsWith(t)));

type LessonIndex = { ref: LessonRef; title: string[]; words: string[] }[];

function buildIndex(lessons: LessonRef[]): LessonIndex {
  return lessons.map((ref) => ({
    ref,
    title: indexWords([ref.lesson.title]),
    words: indexWords([ref.lesson.title, ...ref.lesson.tags, ...ref.lesson.summary, ...ref.lesson.points, ...ref.lesson.faq.flatMap((f) => [f.q, f.a])]),
  }));
}

/** الفهرس يُبنى مرة واحدة لكل قائمة دروس؛ وقائمة اللوحة ثابتة المرجع بين العروض */
const indexCache = new WeakMap<LessonRef[], LessonIndex>();

function lessonIndex(lessons: LessonRef[]): LessonIndex {
  let idx = indexCache.get(lessons);
  if (!idx) {
    idx = buildIndex(lessons);
    indexCache.set(lessons, idx);
  }
  return idx;
}

const CLIP_INDEX = CLIPS.map((clip) => ({ clip, words: indexWords([clip.title, ...clip.tags]) }));

/** `lessons` تأتي من لوحة المحتوى؛ وتبقى دروس الشيفرة افتراضاً لمن لا يمرّرها */
export function searchAcademy(query: string, source: LessonRef[] = ALL_LESSONS) {
  const tokens = searchTokens(query);
  if (!tokens.length) return { tokens, lessons: [] as LessonRef[], clips: [] as Clip[] };
  const lessons = lessonIndex(source)
    .filter((e) => matchesAll(e.words, tokens))
    .map((e) => ({ e, score: tokens.filter((t) => e.title.some((w) => w.startsWith(t))).length }))
    .sort((a, b) => b.score - a.score)
    .map((x) => x.e.ref);
  const clips = CLIP_INDEX.filter((e) => matchesAll(e.words, tokens)).map((e) => e.clip);
  return { tokens, lessons, clips };
}

/** Best sentence from a lesson for a search snippet */
export function snippetFor(lesson: Lesson, tokens: string[]) {
  const sentences = lesson.summary.flatMap((p) => p.split(/(?<=[.؟!])\s+/));
  let best = sentences[0] ?? "";
  let bestScore = -1;
  for (const s of sentences) {
    const words = s.split(/\s+/);
    const score = tokens.filter((t) => words.some((w) => wordMatches(w, t))).length;
    if (score > bestScore) {
      best = s;
      bestScore = score;
    }
  }
  return best;
}

export function minutesLabel(minutes: number) {
  return arabicCount(minutes, MINUTE_FORMS);
}
