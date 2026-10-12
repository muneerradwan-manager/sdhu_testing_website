import type { CollectionsEn } from "./index";

/**
 * The days of the Hajj guide and its duas in English. The duas themselves (`duaText`, `text`) stay in Arabic:
 * they are recited in Arabic. Their titles, when to say them and their sources are in English.
 */
export const GUIDE_EN: CollectionsEn = {
  guideDays: {
    tarwiyah: {
      name: "Day of Tarwiyah",
      day: "8",
      hijri: "8 Dhu al-Hijjah",
      intro: "The Hajj begins in earnest: those performing Tamattu' enter Ihram where they are, and pilgrims head to Mina to prepare for the Day of Arafah.",
      placeLabel: "Mina",
      tasks: [
        { text: "Those performing Tamattu' bathe, apply perfume, put on Ihram and say: «لبيك حجاً» (Here I am for Hajj)" },
        { text: "Head to Mina in the late morning with your group, following the transport schedule" },
        { text: "Pray Dhuhr, Asr, Maghrib and Isha, shortening the four-unit prayers without combining them" },
        { text: "Recite the Talbiyah, remember Allah and read the Quran often" },
        { text: "Sleep early and prepare a small bag for the Day of Arafah" },
      ],
      times: [
        { time: "08:00", label: "Ihram at the hotel" },
        { time: "10:30", label: "Transport to Mina" },
        { time: "12:20", label: "Dhuhr prayer, shortened" },
        { time: "21:30", label: "Rest and preparation" },
      ],
      duaTitle: "The Talbiyah",
    },
    arafah: {
      name: "Day of Arafah",
      day: "9",
      hijri: "9 Dhu al-Hijjah",
      intro: "The greatest pillar of Hajj. Whoever stands at Arafah, even for a moment in its time, has caught the Hajj. It is a day of supplication and of freedom from the Fire.",
      placeLabel: "Arafah — Namirah Mosque",
      tasks: [
        { text: "Head to Arafah after sunrise and make sure you are within its boundaries" },
        { text: "Pray Dhuhr and Asr combined and shortened, with one call to prayer and two iqamahs" },
        { text: "Devote yourself to supplication, facing the Qibla, until sunset" },
        { text: "Stay inside the tent and drink water to avoid sunstroke" },
        { text: "After sunset, move on calmly to Muzdalifah" },
      ],
      times: [
        { time: "07:00", label: "Transport to Arafah" },
        { time: "12:20", label: "Dhuhr and Asr combined" },
        { time: "13:00", label: "Time for supplication" },
        { time: "19:05", label: "Sunset and departure to Muzdalifah" },
      ],
      duaTitle: "The best supplication on the Day of Arafah",
    },
    muzdalifah: {
      name: "Night at Muzdalifah",
      day: "Night of 10",
      hijri: "Night of 10 Dhu al-Hijjah",
      intro: "A night under the open sky after the Day of Arafah: combining the two prayers, resting, and gathering pebbles.",
      placeLabel: "Muzdalifah — al-Mash'ar al-Haram",
      tasks: [
        { text: "Pray Maghrib and Isha combined, shortening Isha, as soon as you arrive" },
        { text: "Spend the night at Muzdalifah; the weak and elderly may leave after midnight" },
        { text: "Gather your pebbles (you may also gather them in Mina)" },
        { text: "Pray Fajr, then supplicate facing the Qibla until the sky is bright" },
        { text: "Head to Mina before sunrise" },
      ],
      times: [
        { time: "21:00", label: "Arrival and the combined prayers" },
        { time: "00:40", label: "Midnight: the weak may leave" },
        { time: "04:25", label: "Fajr prayer" },
        { time: "05:30", label: "Departure to Mina" },
      ],
      duaTitle: "At al-Mash'ar al-Haram",
    },
    nahr: {
      name: "Day of Sacrifice",
      day: "10",
      hijri: "10 Dhu al-Hijjah — Eid al-Adha",
      intro: "The busiest day of Hajj: stoning, sacrifice, shaving and Tawaf. There is no harm in doing some of these before others.",
      placeLabel: "The Jamarat Bridge",
      tasks: [
        { text: "Stone Jamrat al-Aqabah with seven pebbles, saying Allahu Akbar with each, and stop the Talbiyah" },
        { text: "Sacrifice the Hady if performing Tamattu' or Qiran (or through a Hady voucher)" },
        { text: "Shave or shorten your hair, then the first Tahallul: you may wear your normal clothes" },
        { text: "Tawaf al-Ifadah and Sa'i at Masjid al-Haram" },
        { text: "Return to Mina to spend the night" },
      ],
      times: [
        { time: "07:00", label: "Stoning Jamrat al-Aqabah (by schedule)" },
        { time: "09:00", label: "Shaving or shortening the hair" },
        { time: "16:00", label: "Tawaf al-Ifadah" },
        { time: "23:00", label: "Night in Mina" },
      ],
      duaTitle: "When sacrificing the Hady",
    },
    tashreeq: {
      name: "Days of Tashreeq",
      day: "11–13",
      hijri: "11, 12 and 13 Dhu al-Hijjah",
      intro: "Days of eating, drinking and remembering Allah. The pilgrim spends the nights in Mina and stones the three Jamarat each day.",
      placeLabel: "Mina — al-Khayf Mosque",
      tasks: [
        { text: "Spend the nights of the Days of Tashreeq in Mina" },
        { text: "Stone the three Jamarat after midday: the small, then the middle, then al-Aqabah" },
        { text: "Stop to supplicate after the small and middle Jamarat" },
        { text: "Those leaving early depart Mina on the 12th before sunset" },
        { text: "Perform Tawaf al-Wada' (the Farewell Tawaf) before leaving Makkah" },
      ],
      times: [
        { time: "12:20", label: "Midday: stoning time begins" },
        { time: "17:00", label: "A good time for the elderly" },
        { time: "18:50", label: "Latest time to leave early (the 12th)" },
        { time: "—", label: "Farewell Tawaf when you travel" },
      ],
      duaTitle: "Takbir during the Days of Tashreeq",
    },
  },

  guideDuas: {
    "dua-builtin-0": { title: "The Talbiyah", when: "From Ihram until Tawaf or stoning Jamrat al-Aqabah", source: "Bukhari and Muslim" },
    "dua-builtin-1": { title: "Dua for travelling", when: "When boarding the plane or the bus", source: "Narrated by Muslim" },
    "dua-builtin-2": { title: "Between the two corners", when: "Between the Yemeni Corner and the Black Stone", source: "Narrated by Abu Dawud" },
    "dua-builtin-3": { title: "On Safa and Marwah", when: "When climbing them, facing the Kaaba", source: "Narrated by Muslim" },
    "dua-builtin-4": { title: "The Day of Arafah", when: "From midday until sunset", source: "Narrated by al-Tirmidhi" },
    "dua-builtin-5": { title: "Dua for forgiveness", when: "At any time, especially at Arafah", source: "Narrated by al-Tirmidhi" },
    "dua-builtin-6": { title: "Entering the mosque", when: "When entering Masjid al-Haram and the Prophet's Mosque", source: "Narrated by Muslim and Abu Dawud" },
    "dua-builtin-7": { title: "Visiting the graves", when: "Al-Baqi' and the martyrs of Uhud", source: "Narrated by Muslim" },
  },
};
