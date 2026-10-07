import { storedGroupName } from "./store";

/**
 * Groups are known by their names, never by their numbers: «مجموعة اللطيف»، «مجموعة أحفاد بني هاشم».
 * A number means nothing to a pilgrim or an administrator; the name is how people tell the groups apart.
 * The number stays only as the platform's internal key (records, receipts, links) and is never shown.
 *
 * The group head names his group in the formation request. The demo's groups have their names here, and
 * every other group of the season takes one from the list below, so no screen ever falls back on a number.
 * No group is named like a cluster («النور»، «الصفا»، «الشهباء»…), so a group is never taken for a cluster.
 */
const NAMED: Record<number, string> = {
  5: "أحفاد بني هاشم",
  8: "التقوى",
  9: "الرضوان",
  11: "البركة",
  12: "ركب الصديق",
  14: "الفلاح",
  18: "طيبة",
  19: "المقام",
  22: "الأبرار",
  27: "اللطيف",
  28: "الملتزم",
  31: "الخبير",
  33: "زمزم",
  34: "الكوثر",
  36: "قباء",
  38: "منى",
  41: "الإحسان",
  44: "السكينة",
  47: "الإيمان",
  52: "البيت العتيق",
  55: "أم القرى",
  58: "عرفات",
  61: "ركب الفاروق",
  63: "الميزان",
  64: "الأمل",
  65: "البشرى",
  66: "الندى",
};

/** The names a head may pick from: the Beautiful Names, the virtues, the holy places, the caravans */
const SINGLE = [
  "الرحيم", "الكريم", "الحليم", "الودود", "الوهاب", "الرزاق", "الفتاح", "العليم", "الحكيم", "الغفور", "الشكور", "الحفيظ",
  "المجيب", "الواسع", "الهادي", "البديع", "الرشيد", "الصبور", "البر", "التواب", "العفو", "الرؤوف", "الحميد", "المجيد",
  "الولي", "الوكيل", "الغني", "البارئ", "المؤمن", "المهيمن", "الرحمن", "القدوس", "العزيز", "العلي", "العظيم", "الكبير",
  "الجليل", "الرقيب", "الشهيد", "الحق", "القوي", "المتين", "الحي", "القيوم", "الواحد", "الأحد", "الصمد", "القادر",
  "المقتدر", "الوارث", "الباقي", "الجامع", "المقسط", "المغني", "الخالق", "المصور", "الغفار", "المقيت", "الحسيب", "الباعث",
  "الإخلاص", "التلبية", "الطمأنينة", "الصدق", "الإنابة", "الخشوع", "الرضا", "المغفرة", "التوبة", "الثبات", "المحبة",
  "الأخوة", "الفردوس", "النعيم", "الريان", "السلسبيل", "التسنيم", "الفرقان", "الهداية", "الإيثار", "المودة", "الوئام",
  "البيت الحرام", "المشعر الحرام", "الحطيم", "أجياد", "الحجون", "العوالي", "أحد", "البقيع", "بكة", "مزدلفة", "الصفاء",
  "المهاجرين", "الأنصار", "السابقين", "المحسنين", "الصابرين", "الشاكرين", "الذاكرين", "المتقين", "الأخيار", "الصالحين",
  "المخلصين", "الطائفين", "العاكفين", "الملبّين", "الحامدين", "التائبين", "العابدين", "ضيوف الرحمن", "وفد الله", "لبيك",
  "أحفاد الصحابة", "أحفاد المهاجرين", "أحفاد الأنصار", "ركب ذي النورين", "ركب أبي الحسن", "ركب أبي عبيدة", "ركب خالد بن الوليد",
  "ركب سعد بن أبي وقاص", "ركب بلال", "ركب مصعب بن عمير", "ركب أبي ذر", "ركب سلمان الفارسي", "ركب عمار بن ياسر",
  "ركب معاذ بن جبل", "ركب عبد الرحمن بن عوف", "ركب الزبير", "ركب حمزة", "ركب جعفر الطيار", "ركب أبي أيوب الأنصاري",
];
/** «نور الشام»، «رحاب مكة»… — two words, for a season that has more groups than single names */
const FIRST = ["رحاب", "ضياء", "ربوع", "قوافل", "زوار", "وفود", "أفياء", "بشائر", "نسائم", "أنوار", "ظلال", "خيرات"];
const SECOND = ["الشام", "مكة", "طيبة", "البيت", "الحرم", "زمزم", "عرفات", "دمشق", "حلب", "قاسيون", "بردى", "حمص", "حماة", "الفيحاء", "الغوطة", "اللاذقية", "دير الزور", "إدلب"];

const TAKEN = new Set(Object.values(NAMED));
const POOL = [...SINGLE, ...FIRST.flatMap((a) => SECOND.map((b) => `${a} ${b}`))].filter((n, i, all) => !TAKEN.has(n) && all.indexOf(n) === i);
/** A stride coprime with the list's length spreads neighbouring numbers over different kinds of names */
const STRIDE = (() => {
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  let s = 97;
  while (gcd(s, POOL.length) !== 1) s++;
  return s;
})();

/** «اللطيف» — the name alone, as the head wrote it */
export function groupShort(number: number) {
  return stored(number) ?? NAMED[number] ?? POOL[(number * STRIDE) % POOL.length];
}

/** A data module may name its groups while the store is still loading: it then has no names of its own yet */
function stored(number: number) {
  try {
    return storedGroupName(number);
  } catch {
    return undefined;
  }
}

/** «مجموعة اللطيف» — how a group is named on every screen, in every text and every log line */
export function groupName(number: number) {
  return `مجموعة ${groupShort(number)}`;
}

/**
 * Several groups in a sentence: «مجموعة اللطيف»، «مجموعة اللطيف ومجموعة الخبير»، «مجموعات اللطيف والخبير
 * وأحفاد بني هاشم».
 */
export function groupsName(numbers: number[]) {
  const names = numbers.map(groupShort);
  if (names.length === 0) return "";
  if (names.length === 1) return `مجموعة ${names[0]}`;
  if (names.length === 2) return `مجموعة ${names[0]} ومجموعة ${names[1]}`;
  return `مجموعات ${names.slice(0, -1).join(" و")} و${names.at(-1)}`;
}

/** The groups a season can hold: every number the platform may have given */
const SEASON_NUMBERS = Array.from({ length: 300 }, (_, i) => i + 1);

/** Is a name free this season? A head cannot take a name another group already carries */
export function groupNameTaken(name: string, except?: number) {
  const n = name.trim().replace(/^مجموعة\s+/, "");
  return SEASON_NUMBERS.some((x) => x !== except && groupShort(x) === n);
}

/** A name to suggest to a head forming his group: the one the list holds for its number */
export function suggestedGroupName(number: number) {
  return NAMED[number] ?? POOL[(number * STRIDE) % POOL.length];
}
