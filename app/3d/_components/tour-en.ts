/** The 3D models' texts in English (lib/data/tour-3d keeps the Arabic), by model id */
export const MODELS_3D_EN: Record<string, { title: string; place: string; size: string; when: string; about: string; points: string[]; photoCredit?: string }> = {
  "7d84e450db6240bd9add035640ba2005": {
    title: "Masjid al-Haram",
    place: "Makkah",
    size: "about 2 million faces",
    when: "The Tawaf of arrival when you get there, Tawaf al-Ifadah on the Day of Sacrifice or after it, and the Farewell Tawaf at the end of your journey",
    about:
      "It holds the Holy Kaaba and the Mataf, and the Mas'a between Safa and Marwah. You perform seven rounds of Tawaf starting from the Black Stone with the Kaaba on your left, and seven laps of Sa'i starting at Safa and ending at Marwah.",
    points: ["The Holy Kaaba and the Black Stone", "The Mataf around the Kaaba", "The Mas'a between Safa and Marwah", "The mosque's gates and minarets"],
  },
  aec2fd44d2104cbdbaa29fd659de8b40: {
    title: "The Prophet's Mosque",
    place: "Madinah",
    size: "about 3.7 million faces",
    when: "Before or after Hajj, depending on your group's programme",
    about:
      "The second of the Two Holy Mosques, home to the Rawdah and the Prophet's Chamber. Visiting it is not part of the Hajj rites; most pilgrims visit before or after Hajj, and a visit to the Rawdah is booked in advance.",
    points: ["The Rawdah", "The Prophet's Chamber and the Green Dome", "The umbrellas in the courtyards"],
  },
  "8971a7f14c0c427cb25771e6acbfd044": {
    title: "Mount Arafat",
    place: "Arafat — Jabal al-Rahmah",
    size: "about 92 thousand faces",
    when: "On 9 Dhu al-Hijjah, from midday until sunset",
    about:
      "Standing at Arafah is the greatest pillar of Hajj. Jabal al-Rahmah is in Arafat, and climbing it is not one of the rites: all of Arafah is a place of standing, so stay in your group's camp within the boundaries of Arafah and supplicate often.",
    points: ["Jabal al-Rahmah and the marker on its summit", "The plain of Arafat around the mountain", "Standing within the boundaries of Arafah"],
  },
  ec0db00a3587489c9e2f18ebe5a289d3: {
    title: "The Jamarat Bridge",
    place: "Mina",
    size: "about 185 thousand faces",
    when: "On the Day of Sacrifice (10 Dhu al-Hijjah) for Jamrat al-Aqabah, and on the Days of Tashreeq for all three Jamarat",
    about:
      "A building of several floors for stoning the three Jamarat: the small, then the middle, then the large (Jamrat al-Aqabah), with seven pebbles for each. Entry and exit run one way, so keep to your stoning time and your group's route.",
    points: ["The small Jamrah", "The middle Jamrah", "Jamrat al-Aqabah (the large)", "One-way entrances and exits"],
  },
  ea93b7d646524c9da61309ab95fe3937: {
    title: "Aisha Mosque",
    place: "Makkah — al-Tan'im",
    size: "about 103 thousand faces",
    photoCredit: "Photo of the mosque: GusJuned, Wikimedia Commons, CC BY-SA 3.0",
    when: "If you want to perform Umrah while in Makkah, before or after Hajj",
    about:
      "At al-Tan'im, the nearest point outside the sanctuary to Masjid al-Haram, about 7.5 kilometres from it. The Mother of the Believers Aisha, may Allah be pleased with her, entered Ihram for Umrah here at the Prophet's ﷺ instruction, so those in Makkah who want to perform Umrah enter Ihram here.",
    points: ["The Miqat for Umrah for those in Makkah", "Places for wudu and preparing for Ihram", "Regular transport to Masjid al-Haram"],
  },
  "4deea1e1edae43a5ac9f8c683b361260": {
    title: "Quba Mosque",
    place: "Madinah",
    size: "about 158 thousand faces",
    when: "During your stay in Madinah, depending on your group's programme",
    about:
      "The first mosque built in Islam, founded by the Prophet ﷺ when he arrived in Madinah as an emigrant. It lies about 3 kilometres south of the Prophet's Mosque. He ﷺ said: \"Whoever purifies himself at home, then comes to Quba Mosque and prays a prayer in it, will have the reward of an Umrah.\"",
    points: ["The first mosque in Islam", "White minarets and domes", "Praying there after purifying yourself at home"],
  },
};
