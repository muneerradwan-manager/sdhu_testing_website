/**
 * The English of the guide's fixed texts (lib/data/guide), by the same order and ids. The duas stay in Arabic,
 * as they are recited; only what explains them is here.
 */
import type { NUSUK } from "@/lib/data/guide";

type NusukId = (typeof NUSUK)[number]["id"];

export const NUSUK_EN: Record<NusukId, { name: string; tagline: string; how: string }> = {
  tamattu: {
    name: "Tamattu'",
    tagline: "Umrah, then Hajj",
    how: "Enter Ihram for Umrah in the months of Hajj, leave Ihram after it, then enter Ihram for Hajj on 8 Dhu al-Hijjah.",
  },
  qiran: {
    name: "Qiran",
    tagline: "Umrah and Hajj together",
    how: "Enter Ihram for Umrah and Hajj together, and stay in Ihram until the Day of Sacrifice.",
  },
  ifrad: {
    name: "Ifrad",
    tagline: "Hajj only",
    how: "Enter Ihram for Hajj alone, and stay in Ihram until the Day of Sacrifice.",
  },
};

/** NUSUK_ROWS in English, row by row (the values in the order Tamattu', Qiran, Ifrad) */
export const NUSUK_ROWS_EN: { label: string; values: [string, string, string] }[] = [
  { label: "Intention at the Miqat", values: ["«لبيك عمرة» (for Umrah)", "«لبيك عمرة وحجاً» (for Umrah and Hajj)", "«لبيك حجاً» (for Hajj)"] },
  { label: "Time in Ihram", values: ["Short: leave Ihram after Umrah", "Long, until the Day of Sacrifice", "Long, until the Day of Sacrifice"] },
  { label: "Hady (sacrifice)", values: ["Required", "Required", "Not required"] },
  { label: "Tawaf of arrival", values: ["Replaced by the Umrah Tawaf", "Sunnah", "Sunnah"] },
  { label: "Sa'i", values: ["Two: for Umrah and for Hajj", "One Sa'i", "One Sa'i"] },
  { label: "Suits", values: ["Those who arrive early", "Those who bring the Hady or arrive late", "Those who do not want to offer the Hady"] },
];

/** PROHIBITIONS in English, in the same order */
export const PROHIBITIONS_EN: { title: string; body: string }[] = [
  { title: "Removing hair", body: "By shaving, cutting or plucking, from the head or the body." },
  { title: "Cutting the nails", body: "Of the hands or feet, except a broken nail that causes pain." },
  { title: "Perfume", body: "On the body, the clothes or in food, including scented soap." },
  { title: "Covering the head", body: "With anything that touches it, such as a cap or a turban. An umbrella is allowed." },
  { title: "Wearing sewn clothes", body: "Clothes cut to the shape of the body, such as a shirt or trousers." },
  { title: "Face veil and gloves", body: "A woman covers her head, and lowers a cloth over her face when needed." },
  { title: "Hunting land animals", body: "Killing game, helping to kill it, or scaring it away." },
  { title: "Marriage contract", body: "He may not marry, be married or propose." },
  { title: "Intercourse and foreplay", body: "Intercourse before the first Tahallul invalidates the Hajj." },
];

export const WHO_EN = { الجميع: "Everyone", الرجال: "Men", النساء: "Women" } as const;

/** The hint of each Tawaf round in English (the duas stay in Arabic) */
export const TAWAF_HINTS_EN = [
  "Start from the Black Stone line and say: «بسم الله، والله أكبر» (In the name of Allah, Allah is the Greatest). Men walk briskly (raml) in the first three rounds.",
  "Carry on with the Kaaba on your left, and ask Allah for the good of this world and the next.",
  "The last round with brisk walking for men, in the Tawaf of arrival and of Umrah.",
  "Walk normally from now on, and remember Allah often.",
  "Do not push at the Yemeni Corner; touching it is Sunnah for those who can easily reach it.",
  "Pray for your family, your country and those who asked you to pray for them.",
  "The last round! After it, two rak'ahs behind the Maqam, then Zamzam.",
];

/** Each Sa'i lap in English */
export const SAI_LAPS_EN = [
  "From Safa to Marwah. The first time, recite: «إن الصفا والمروة من شعائر الله», and say: «أبدأ بما بدأ الله به» (I begin with what Allah began with).",
  "From Marwah to Safa. Men hurry between the two green markers.",
  "From Safa to Marwah. Ask for whatever you wish of the good of this world and the next.",
  "From Marwah to Safa. Take a short rest if you are tired; there is no harm in it.",
  "From Safa to Marwah. «رب اغفر وارحم إنك أنت الأعز الأكرم» (My Lord, forgive and have mercy).",
  "From Marwah to Safa. One lap left.",
  "From Safa to Marwah. The Sa'i ends here; then shave or shorten your hair.",
];

/** The packing list's groups, items and notes in English, by group order and item id */
export const PACKING_GROUPS_EN = ["Documents", "Clothing", "Health", "For the holy sites"];

export const PACKING_EN: Record<string, { label: string; note?: string }> = {
  passport: { label: "Passport", note: "Valid for at least 6 months" },
  card: { label: "Digital card in the app", note: "Works offline" },
  vaccine: { label: "Meningitis vaccination certificate" },
  copies: { label: "Copies of your documents on your phone" },
  ihram: { label: "Two Ihram sheets + a spare", note: "For men" },
  abaya: { label: "Loose, modest clothes", note: "For women" },
  sandals: { label: "Comfortable, worn-in sandals", note: "Do not wear new sandals" },
  belt: { label: "Ihram belt with pockets" },
  meds: { label: "Daily medicines + a week's spare" },
  prescription: { label: "Stamped medical prescription" },
  masks: { label: "Face masks" },
  cream: { label: "Unscented foot moisturiser" },
  cooler: { label: "Cool bag for insulin", note: "If needed" },
  umbrella: { label: "Sun umbrella" },
  bottle: { label: "Refillable water bottle" },
  wipes: { label: "Unscented wet wipes" },
  pebbles: { label: "Small bag for the stoning pebbles" },
  powerbank: { label: "Power bank" },
  mat: { label: "Light mat for the night at Muzdalifah" },
};

/** HEALTH_TIPS in English, in the same order */
export const HEALTH_TIPS_EN: { title: string; body: string }[] = [
  { title: "Drink before you are thirsty", body: "About a glass of water an hour, and oral rehydration salts when you sweat heavily." },
  { title: "Avoid the midday sun", body: "From 11 am to 4 pm, stay in the shade and use your umbrella." },
  { title: "Protect your feet", body: "Do not walk barefoot, and check your feet every day, especially if you are diabetic." },
  { title: "Medicine times", body: "Set an alarm on your phone: tiredness and the time change make it easy to forget." },
  { title: "Light, clean food", body: "Avoid uncovered food, and wash your hands before eating." },
  { title: "Sleep well", body: "Rest before Arafah; it is a demanding day." },
];

export const HEATSTROKE_SIGNS_EN = ["Very high body temperature", "Hot, dry skin", "Dizziness and confused speech", "Rapid pulse"];
