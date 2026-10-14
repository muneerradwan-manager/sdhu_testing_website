import type { CollectionsEn } from "./index";

/**
 * The academy in English, part A: every track (title, descriptions, level titles) and the lessons of the track
 * «فقه الحج» (hajj-fiqh). The other tracks' lessons are in ./academy-b.ts; the academy's texts that live only in
 * code (quizzes, clips, lecturers' roles) are in ./academy-quiz.ts.
 */

const texts = (list: string[]) => list.map((text) => ({ text }));

const lesson = (v: { title: string; summary: string[]; points: string[]; faq: { q: string; a: string }[]; tags: string[] }) => ({
  title: v.title,
  summary: texts(v.summary),
  points: texts(v.points),
  faq: v.faq,
  tags: texts(v.tags),
});

export const ACADEMY_EN_A: CollectionsEn = {
  academyTracks: {
    "hajj-fiqh": {
      title: "Hajj Fiqh",
      short: "Types of Hajj, Ihram and its prohibitions, Tawaf and Sa'i, standing at Arafah, the nights, the stoning and the Hady",
      description: "The core track for every pilgrim: 18 lessons in three levels that explain Hajj in plain words, from the intention to the Farewell Tawaf.",
      levels: [
        { title: "Level 1: Ihram", subtitle: "The virtue of Hajj, the types of Hajj, the Miqat, the prohibitions" },
        { title: "Level 2: Tawaf and Sa'i", subtitle: "Types and conditions of Tawaf, Sa'i, Tahallul" },
        { title: "Level 3: The holy sites", subtitle: "Mina, Arafah, Muzdalifah, the Jamarat, the Hady and the farewell" },
      ],
    },
    "umrah-fiqh": {
      title: "Umrah Fiqh",
      short: "The pillars and obligations of Umrah, and its common mistakes",
      description: "A practical guide to Umrah, for pilgrims doing Tamattu' in the Hajj season and for anyone performing Umrah at any time of year.",
      levels: [
        { title: "Level 1: Pillars and obligations", subtitle: "The virtue of Umrah, its pillars, entering Ihram for it" },
        { title: "Level 2: Performing it and avoiding mistakes", subtitle: "How Umrah is done, common mistakes, Umrah on behalf of another" },
      ],
    },
    "journey-ethics": {
      title: "Conduct on the Journey",
      short: "Patience, coping with crowds, the rights of your companions, serving the elderly",
      description: "Hajj is a journey of character before it is a journey of places. Short lessons that make the trip easier for you and for those with you.",
      levels: [
        { title: "Level 1: Conduct on the journey", subtitle: "Patience, crowds, companions" },
        { title: "Level 2: Serving others", subtitle: "The elderly, cleanliness and the rules" },
      ],
    },
    madinah: {
      title: "Madinah and the Visit",
      short: "Etiquette of the visit, the Prophet's Mosque, Quba, Uhud, landmarks of the Seerah",
      description: "Get to know the city of the Prophet ﷺ: the etiquette of the visit, the Rawdah, Quba Mosque, Mount Uhud and the landmarks of the Seerah.",
      levels: [
        { title: "Level 1: Etiquette of the visit", subtitle: "Etiquette, the Prophet's Mosque, greeting the Prophet ﷺ" },
        { title: "Level 2: Landmarks of Madinah", subtitle: "Quba, Uhud, landmarks of the Seerah" },
      ],
    },
    duas: {
      title: "Duas and Remembrance",
      short: "The duas of the rites, day by day, with text and audio",
      description: "The duas of the journey and the rites, from setting out to the Days of Tashriq, with authentic texts and clear recitation.",
      levels: [
        { title: "Level 1: Remembrance in Umrah and Tawaf", subtitle: "Travel, the Talbiyah, Tawaf and Sa'i, the Station of Ibrahim and Zamzam" },
        { title: "Level 2: The days of Hajj, day by day", subtitle: "Tarwiyah, Arafah, the Day of Sacrifice and the Days of Tashriq" },
      ],
    },
    preparation: {
      title: "Preparing Before You Travel",
      short: "Health and medicines, your bag, pilgrims with special needs, using the platform's app",
      description: "Everything you need before you leave Damascus: check-ups and vaccines, medicines, your bag, the heat, and using the app.",
      levels: [
        { title: "Level 1: Health and your bag", subtitle: "Check-ups, medicines, the pilgrim's bag" },
        { title: "Level 2: Practical preparation", subtitle: "The elderly, the heat, the app" },
      ],
    },
  },

  academyLessons: {
    // ─────────── Level 1: Ihram ───────────
    "hajj-fiqh/hajj-intro": lesson({
      title: "Hajj: its virtue and who must perform it",
      summary: [
        "Hajj is the fifth pillar of Islam. God made it obligatory once in a lifetime on every Muslim who is able. God says: «وَلِلَّهِ عَلَى النَّاسِ حِجُّ الْبَيْتِ مَنِ اسْتَطَاعَ إِلَيْهِ سَبِيلًا» (meaning: pilgrimage to the House is a duty owed to God by all who are able to make the journey). Any Hajj after the first is voluntary.",
        "Hajj carries a great reward. The Prophet ﷺ said: \"Whoever performs Hajj without obscene talk or wrongdoing returns as on the day his mother bore him.\" He also said: \"An accepted Hajj has no reward but Paradise.\"",
        "Hajj becomes obligatory under five conditions: being Muslim, sane, adult, free, and able. Being able means having the physical and financial means to reach Makkah and return, while leaving enough for the family you support. Most scholars also require a woman to travel with a mahram.",
      ],
      points: [
        "Hajj is a pillar of Islam and is obligatory once in a lifetime",
        "Conditions: Islam, sanity, adulthood, freedom and ability",
        "Ability is physical and financial, with your family provided for until you return",
        "An accepted Hajj is rewarded with Paradise, and God forgives sins through it",
        "Those who are able should not delay their Hajj",
      ],
      faq: [
        {
          q: "Is a child's Hajj valid before puberty?",
          a: "Yes. The child's Hajj is valid and rewarded, and the guardian is rewarded too. But it does not replace the obligatory Hajj: once the child reaches adulthood and is able, Hajj is due again.",
        },
        {
          q: "Can someone in debt go on Hajj?",
          a: "If the debt is due now and the lender is asking for it, it must be repaid before Hajj. If it is due later and the lender agrees, or the borrower can repay it on time, there is no objection to going.",
        },
      ],
      tags: ["The virtue of Hajj", "Conditions of Hajj", "Ability", "Mahram", "The obligatory Hajj"],
    }),

    "hajj-fiqh/nusuk-types": lesson({
      title: "The types of Hajj: Tamattu', Qiran and Ifrad",
      summary: [
        "When entering Ihram, the pilgrim chooses one of three types of Hajj: Tamattu', Qiran or Ifrad. Scholars agree that all three are valid, and each pilgrim chooses what suits his situation and arrival date.",
        "Tamattu': you enter Ihram for Umrah in the months of Hajj, perform it and leave Ihram, then enter Ihram for Hajj from where you are on the Day of Tarwiyah. A Hady (sacrificial animal) is due. The mission recommends this type to most Syrian pilgrims because they arrive early.",
        "Qiran: you enter Ihram for Umrah and Hajj together and stay in Ihram until the Day of Sacrifice; a Hady is due. Ifrad: you enter Ihram for Hajj alone, and no Hady is due. A single Sa'i is enough for Qiran and Ifrad, either after the Arrival Tawaf or after Tawaf al-Ifadah.",
      ],
      points: [
        "There are three types: Tamattu', Qiran and Ifrad, and all are valid",
        "In Tamattu' you complete an Umrah, leave Ihram, then enter Ihram for Hajj on 8 Dhu al-Hijjah",
        "In Qiran you combine Umrah and Hajj in one Ihram and stay in it until the Day of Sacrifice",
        "A Hady is due for Tamattu' and Qiran, not for Ifrad",
        "If you cannot find a Hady, fast three days during Hajj and seven when you return home",
      ],
      faq: [
        {
          q: "Which type suits someone who reaches Makkah many days before Hajj?",
          a: "Tamattu' is the easiest, because you leave Ihram after Umrah and wear your normal clothes until the Day of Tarwiyah, so you are not in Ihram for a long time.",
        },
        {
          q: "Can I change my type of Hajj after entering Ihram?",
          a: "A pilgrim doing Ifrad, or Qiran without having brought a Hady, may change to Tamattu' before Tawaf. Other cases need detail, so ask your group's guide.",
        },
        {
          q: "Does a pilgrim doing Tamattu' perform Sa'i twice?",
          a: "Yes. According to most scholars, one Sa'i is for the Umrah and another for the Hajj, after Tawaf al-Ifadah.",
        },
      ],
      tags: ["Tamattu'", "Qiran", "Ifrad", "Hady", "Type of Hajj"],
    }),

    "hajj-fiqh/ihram-prohibitions": lesson({
      title: "What is forbidden in Ihram",
      summary: [
        "The prohibitions of Ihram are the things a pilgrim may not do once he has made the intention to begin the rite. Most scholars count nine: removing hair, cutting nails, perfume, a man covering his head, a man wearing sewn clothes, killing land game, contracting a marriage, intercourse, and intimate contact with desire.",
        "Some prohibitions apply to men only. A man does not cover his head with anything that touches it, such as a cap or turban, and does not wear clothes cut to the body, such as a shirt or trousers. A woman covers her head and wears her normal modest clothes; only the niqab and gloves are forbidden to her.",
        "Whoever does a prohibited act out of forgetfulness or ignorance is not sinful, and removes it as soon as he remembers or learns. Whoever deliberately shaves, cuts his nails or uses perfume because of a need owes a fidyah, with a choice of three: fasting three days, feeding six poor people, or sacrificing a sheep.",
        "The gravest prohibition is intercourse before the first Tahallul: it invalidates the Hajj. The person must still complete it, make it up in a later year and sacrifice a camel. This is why guides urge pilgrims to learn these rulings before they travel.",
      ],
      points: [
        "Nine prohibitions: hair, nails, perfume, covering the head, sewn clothes, hunting, marriage contract, intercourse, intimate contact",
        "Covering the head and wearing sewn clothes are forbidden to men only",
        "A woman covers her head; the niqab and gloves are forbidden to her",
        "No sin on someone who forgets or does not know; they remove it at once",
        "The fidyah is a choice: fast 3 days, feed 6 poor people, or sacrifice a sheep",
        "Intercourse before the first Tahallul invalidates the Hajj",
      ],
      faq: [
        {
          q: "Can a pilgrim in Ihram use scented soap?",
          a: "It is safer to use unscented soap, because many scholars count scented soap as perfume. Soap made for pilgrims in Ihram is sold in pharmacies.",
        },
        {
          q: "May a woman cover her head in Ihram?",
          a: "Yes; in fact she must cover her head and hair in front of men who are not her relatives, in Ihram and at all times. What is forbidden to her is the niqab and gloves. She may let a cloth hang over her face when men pass.",
        },
        {
          q: "Can a pilgrim in Ihram use an umbrella or ride in a covered vehicle?",
          a: "Yes. What is forbidden is covering the head with something that touches it; an umbrella, a tent or a car roof does not touch the head.",
        },
      ],
      tags: ["Prohibitions of Ihram", "Fidyah", "Perfume", "Sewn clothes", "Covering the head", "Niqab", "Gloves"],
    }),

    "hajj-fiqh/miqat": lesson({
      title: "The Miqat: places and times of Ihram",
      summary: [
        "Hajj has a time limit and place limits. The time is the months of Hajj: Shawwal, Dhu al-Qa'dah and the first ten days of Dhu al-Hijjah. According to the sound view, Ihram for Hajj is not valid before them.",
        "The Prophet ﷺ set five Miqat points: Dhu al-Hulayfah for the people of Madinah; al-Juhfah for the people of al-Sham, including Syria (today people enter Ihram at Rabigh); Qarn al-Manazil for the people of Najd; Yalamlam for the people of Yemen; and Dhat Irq for the people of Iraq.",
        "If you travel by plane, you enter Ihram when the plane passes over the Miqat. Put on the Ihram garments before take-off or on board, and make the intention when the captain announces that you are approaching the Miqat. Anyone who passes the Miqat without Ihram while intending the rite must go back to it; if he does not, a sacrifice is due.",
      ],
      points: [
        "The months of Hajj: Shawwal, Dhu al-Qa'dah and the first ten days of Dhu al-Hijjah",
        "There are five Miqat points; the Miqat for al-Sham is al-Juhfah (Rabigh today)",
        "On a plane, make the intention of Ihram when you pass over the Miqat",
        "Men should put on the Ihram garments well before reaching the Miqat",
        "Passing the Miqat without Ihram means going back, or a sacrifice",
      ],
      faq: [
        {
          q: "If we fly from Damascus to Madinah first, where do we enter Ihram?",
          a: "At the Miqat of the people of Madinah, Dhu al-Hulayfah (Abyar Ali), when you leave Madinah for Makkah. Whoever passes a Miqat enters Ihram there.",
        },
        {
          q: "Can I enter Ihram at Damascus airport?",
          a: "Entering Ihram before the Miqat is valid, but it is easier for men to put on the two Ihram garments at the airport and delay the intention and the Talbiyah until the plane passes the Miqat.",
        },
      ],
      tags: ["Miqat", "Rabigh", "al-Juhfah", "Ihram on the plane", "Months of Hajj"],
    }),

    "hajj-fiqh/women-ihram": lesson({
      title: "Women's Ihram: clothing and covering the head and face",
      summary: [
        "Women have no special Ihram clothing. A woman enters Ihram in her normal loose, modest clothes, in any colour; white is not required. What matters is that the clothing is not eye-catching, see-through or perfumed.",
        "Covering the head is obligatory for women in Ihram, just as outside it, so she wears a hijab that covers her hair and neck. Two things are forbidden to her: the niqab, which is fitted to the face, and gloves.",
        "When men who are not her relatives pass, she lets the edge of her veil or a cloth hang over her face without tying it on, as the women among the Companions did. She may wear socks, closed shoes and a watch.",
        "A woman who is menstruating or in post-natal bleeding enters Ihram at the Miqat and does everything other pilgrims do except Tawaf, until she is clean. She is encouraged to bathe when entering Ihram, for cleanliness.",
      ],
      points: [
        "No special clothing: women enter Ihram in modest clothes of any colour",
        "Covering the head is obligatory for women, in Ihram and outside it",
        "Forbidden to women: the niqab and gloves",
        "She lets a cloth hang over her face in front of men, without tying it",
        "A menstruating woman enters Ihram and performs every rite except Tawaf",
      ],
      faq: [
        {
          q: "May a woman in Ihram wear a medical face mask?",
          a: "It is safer not to, unless there is a need such as illness, heavy crowds or dust. If she wears it out of need she is not sinful; some scholars advise paying a fidyah as a precaution.",
        },
        {
          q: "Does it matter if some of a woman's hair shows under her hijab during Ihram?",
          a: "She must cover her hair. If some shows without intent, she puts her hijab right at once and owes nothing; her Ihram is valid.",
        },
        {
          q: "May a woman cover her head with a sewn head covering?",
          a: "Yes. The ban on sewn clothes and on covering the head applies to men. A woman wears her usual hijab, sewn or not.",
        },
      ],
      tags: ["Women's Ihram", "Head covering for women", "Niqab", "Menstruation", "Hijab"],
    }),

    "hajj-fiqh/ihram-sunan": lesson({
      title: "Recommended acts of Ihram and the Talbiyah",
      summary: [
        "Whoever intends to enter Ihram is encouraged to bathe and clean himself, trim his moustache and cut his nails if needed, then put perfume on his body, not on the Ihram garments. A man wears two clean white sheets, a lower wrap and an upper wrap, with sandals.",
        "The pilgrim makes the intention in his heart and says «لَبَّيْكَ عُمْرَةً» (Here I am for Umrah) for Tamattu', «لَبَّيْكَ حَجًّا» (Here I am for Hajj) for Ifrad, or «لَبَّيْكَ عُمْرَةً وَحَجًّا» (Here I am for Umrah and Hajj) for Qiran. Whoever fears that illness or an obstacle may stop him from completing the rite adds a condition: «فَإِنْ حَبَسَنِي حَابِسٌ فَمَحِلِّي حَيْثُ حَبَسْتَنِي» (if I am held back, I leave Ihram wherever I am held back).",
        "The Talbiyah is a strongly recommended Sunnah. Its words are: «لَبَّيْكَ اللَّهُمَّ لَبَّيْكَ، لَبَّيْكَ لَا شَرِيكَ لَكَ لَبَّيْكَ، إِنَّ الْحَمْدَ وَالنِّعْمَةَ لَكَ وَالْمُلْكَ، لَا شَرِيكَ لَكَ». Men raise their voices with it and women keep theirs low. A pilgrim doing Tamattu' continues it until he starts Tawaf, and the pilgrim in Hajj until he stones Jamrat al-Aqabah on the Day of Sacrifice.",
      ],
      points: [
        "Bathe, clean yourself and perfume your body before Ihram",
        "The intention is in the heart; then name the rite: لبيك عمرة or لبيك حجاً",
        "Add a condition if you fear illness or an obstacle",
        "The Talbiyah is a strongly recommended Sunnah; men say it aloud",
        "The pilgrim stops the Talbiyah when stoning Jamrat al-Aqabah",
      ],
      faq: [
        {
          q: "Is there a special prayer for Ihram?",
          a: "According to the sound view there is no prayer specific to Ihram. If it is the time of an obligatory prayer, enter Ihram after it; and if you pray two rak'ahs after wudu and then enter Ihram, that is good.",
        },
        {
          q: "Does it matter if traces of perfume I put on before Ihram remain?",
          a: "No. Perfume put on the body before the intention may remain after entering Ihram, as is authentically reported from the Prophet ﷺ.",
        },
      ],
      tags: ["Talbiyah", "Recommended acts of Ihram", "Making a condition", "Intention", "Bathing"],
    }),

    // ─────────── Level 2: Tawaf and Sa'i ───────────
    "hajj-fiqh/tawaf-types": lesson({
      title: "The types of Tawaf and their rulings",
      summary: [
        "Tawaf is an act of worship done only around the Holy Kaaba. In Hajj there are five kinds: the Arrival Tawaf (Tawaf al-Qudum), Tawaf al-Ifadah, the Farewell Tawaf (Tawaf al-Wada'), the Tawaf of Umrah, and voluntary Tawaf.",
        "Tawaf al-Ifadah is a pillar of Hajj: Hajj is not valid without it. Its time begins after midnight on the night of the Day of Sacrifice, and it is best done on the day of Eid. The Tawaf of Umrah is a pillar for the pilgrim doing Tamattu'. The Arrival Tawaf is a Sunnah for pilgrims doing Ifrad and Qiran when they reach Makkah.",
        "The Farewell Tawaf is obligatory on every pilgrim when leaving Makkah; it is lifted from women who are menstruating or in post-natal bleeding. On crowded days, those not performing an obligatory Tawaf should do less voluntary Tawaf, so as not to crowd those fulfilling a pillar.",
      ],
      points: [
        "Types of Tawaf: Arrival, Ifadah, Farewell, Umrah, voluntary",
        "Tawaf al-Ifadah is a pillar; Hajj is not valid without it",
        "The Arrival Tawaf is a Sunnah for Ifrad and Qiran",
        "The Farewell Tawaf is obligatory, but lifted for menstruating women",
        "On crowded days, those fulfilling a pillar come before voluntary Tawaf",
      ],
      faq: [
        {
          q: "Can I delay Tawaf al-Ifadah until I am about to travel?",
          a: "Yes. A single Tawaf made with the intention of Ifadah is enough, and it also counts as the Farewell Tawaf if it is the last thing you do before leaving.",
        },
        {
          q: "Is Tawaf valid on the upper floors of Masjid al-Haram?",
          a: "Yes. Tawaf on the upper floors and the roof is valid as long as it is inside the mosque. It is a good option for the elderly and wheelchair users.",
        },
      ],
      tags: ["Tawaf al-Ifadah", "Arrival Tawaf", "Farewell Tawaf", "Types of Tawaf"],
    }),

    "hajj-fiqh/tawaf-conditions": lesson({
      title: "Conditions and obligations of Tawaf",
      summary: [
        "Tawaf has conditions without which it is not valid: first the intention, then, according to most scholars, being in a state of ritual purity, covering the body properly, and completing seven full circuits.",
        "Tawaf starts and ends at the Black Stone, with the Kaaba on your left. It must be done outside Hijr Isma'il, because it is part of the Kaaba, and inside Masjid al-Haram.",
        "The circuits should follow one another without a break, except for a need such as the start of an obligatory prayer or great tiredness; then you continue from where you stopped. If you are unsure how many circuits you have done, go by the lower number, since that is the one you are certain of.",
      ],
      points: [
        "Intention, ritual purity and proper covering are conditions of Tawaf",
        "Seven circuits that start and end at the Black Stone",
        "The Kaaba is always on your left",
        "Tawaf is done outside Hijr Isma'il",
        "If unsure of the number of circuits, go by the lower number",
      ],
      faq: [
        {
          q: "I lost my wudu during Tawaf. What should I do?",
          a: "Leave, make wudu, then start the Tawaf again from the beginning. This is the view of most scholars, who make purity a condition, and it is the safer course.",
        },
        {
          q: "The prayer started while I was on my fourth circuit. Do I repeat the Tawaf?",
          a: "No. Pray with the congregation, then continue from the place where you stopped. According to the sound view, you do not need to repeat the circuit.",
        },
      ],
      tags: ["Conditions of Tawaf", "Ritual purity", "Hijr Isma'il", "Circuits", "Doubt in Tawaf"],
    }),

    "hajj-fiqh/tawaf-steps": lesson({
      title: "How to perform Tawaf, step by step",
      summary: [
        "The pilgrim enters Masjid al-Haram with his right foot and says the dua for entering the mosque. In the Arrival Tawaf and the Tawaf of Umrah, a man uncovers his right shoulder; this is called Idtiba'.",
        "Start at the line of the Black Stone: touch and kiss it if you easily can; otherwise point to it with your hand and say «بِسْمِ اللَّهِ، وَاللَّهُ أَكْبَرُ» (In the name of God, God is the Greatest). Then walk with the Kaaba on your left. In the first three circuits men walk briskly with short steps; this is called Raml.",
        "When you reach the Yemeni Corner, touch it with your hand if you easily can, without kissing it; do not point to it when it is crowded. Between it and the Black Stone say: «رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ» (Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire).",
        "After the seven circuits, cover your shoulder and pray two rak'ahs behind the Station of Ibrahim if you easily can, or anywhere in the mosque, then drink Zamzam water.",
      ],
      points: [
        "Idtiba' for men in the Arrival Tawaf and the Tawaf of Umrah",
        "Start at the Black Stone with the takbir, pointing to it when crowded",
        "Raml in the first three circuits, for men",
        "Say «رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً» between the two corners",
        "Two rak'ahs behind the Station of Ibrahim, then drink Zamzam",
      ],
      faq: [
        {
          q: "Is there a special dua for each circuit?",
          a: "No specific dua is authentically reported for each circuit. Make any dua you wish, remember God and recite the Quran. Booklets that set a dua for each circuit are personal efforts and need not be followed.",
        },
        {
          q: "Do women do Raml and Idtiba'?",
          a: "No. Raml and Idtiba' are for men only; a woman walks at her normal pace, fully covered.",
        },
      ],
      tags: ["How to do Tawaf", "Idtiba'", "Raml", "The Black Stone", "The Yemeni Corner", "Station of Ibrahim"],
    }),

    "hajj-fiqh/tawaf-mistakes": lesson({
      title: "Common mistakes in Tawaf",
      summary: [
        "A common mistake is walking through Hijr Isma'il during Tawaf. This invalidates the circuit, because the Hijr is part of the Kaaba. Another is starting well before or well after the Black Stone.",
        "Another mistake is pushing hard through the crowd to kiss the Black Stone or touch the Yemeni Corner, harming weaker pilgrims and women. Touching them is a Sunnah, but not harming others is an obligation.",
        "Other mistakes: groups making dua loudly in a way that disturbs others, rubbing the walls of the Kaaba and the Station of Ibrahim to seek blessing, and doing Idtiba' in every Tawaf or keeping it after Tawaf ends.",
      ],
      points: [
        "Walking through the Hijr invalidates the circuit",
        "Pushing to kiss the Black Stone harms others; pointing is enough",
        "Do not rub the walls of the Kaaba or the Station of Ibrahim",
        "Make dua quietly, without disturbing others",
        "Idtiba' is only for the Arrival Tawaf and the Tawaf of Umrah",
      ],
      faq: [
        {
          q: "I did one circuit through Hijr Isma'il without knowing. What should I do?",
          a: "If you remember soon after, repeat that circuit outside the Hijr and complete your Tawaf. If a long time has passed, ask your group's guide to explain the ruling for your case.",
        },
        {
          q: "Can an elderly pilgrim do Tawaf in a wheelchair?",
          a: "Yes, and the Tawaf is valid. Wheelchairs and dedicated lanes for the elderly are available on the first floor and the roof.",
        },
      ],
      tags: ["Tawaf mistakes", "Hijr Isma'il", "Crowds", "Kissing the Black Stone"],
    }),

    "hajj-fiqh/sai": lesson({
      title: "Sa'i between Safa and Marwah",
      summary: [
        "Sa'i is seven laps that start at Safa and end at Marwah: going from Safa to Marwah is one lap, and coming back to Safa is another. It must come after a valid Tawaf.",
        "When you first approach Safa, recite «إِنَّ الصَّفَا وَالْمَرْوَةَ مِن شَعَائِرِ اللَّهِ» (Safa and Marwah are among the symbols of God) and say «أَبْدَأُ بِمَا بَدَأَ اللَّهُ بِهِ» (I begin with what God began with). Then climb Safa, face the Kaaba, say «اللَّهُ أَكْبَرُ» three times and say: «لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ، لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ، أَنْجَزَ وَعْدَهُ، وَنَصَرَ عَبْدَهُ، وَهَزَمَ الْأَحْزَابَ وَحْدَهُ». Make dua, and do the same on Marwah.",
        "Men hurry between the two green markers; women walk normally. Ritual purity is not a condition for Sa'i, though it is better. So a woman who did Tawaf while clean and then got her period may still do Sa'i.",
      ],
      points: [
        "Seven laps, starting at Safa and ending at Marwah",
        "Sa'i comes after a valid Tawaf",
        "Recite the verse, say the takbir and make dua on Safa and Marwah",
        "Men hurry between the two green markers",
        "Ritual purity for Sa'i is recommended, not a condition",
      ],
      faq: [
        {
          q: "Can I do Sa'i in an electric cart?",
          a: "Yes. Electric carts are available in the Sa'i area for the elderly and those with a valid excuse.",
        },
        {
          q: "I got tired during Sa'i. May I rest?",
          a: "Yes. You may sit and rest, then continue. Breaks between the laps of Sa'i are treated more leniently than in Tawaf.",
        },
      ],
      tags: ["Sa'i", "Safa", "Marwah", "The green markers"],
    }),

    "hajj-fiqh/women-tawaf": lesson({
      title: "Rulings for women in Tawaf and Sa'i",
      summary: [
        "A woman performs Tawaf and Sa'i as a man does, except that she does not do Idtiba' or Raml and does not hurry between the green markers. She takes care to stay covered and to keep away from crowding with men.",
        "Covering the head remains obligatory for women in Ihram and during Tawaf, so fasten your hijab well before entering the Tawaf area, as the crowd may pull it off. It is better for women to do Tawaf at less crowded times or on the upper floors.",
        "A menstruating woman does not do Tawaf until she is clean and has bathed, but she does Sa'i, stands at Arafah and stones the Jamarat. If her period comes before Tawaf al-Ifadah, she waits if she can; if she must travel with her group, she asks the group's woman guide what suits her situation. The Farewell Tawaf is lifted from her.",
      ],
      points: [
        "No Idtiba', Raml or hurrying for women",
        "The hijab is obligatory; fasten it before entering the Tawaf area",
        "A menstruating woman performs every rite except Tawaf",
        "The Farewell Tawaf is lifted from women who are menstruating or in post-natal bleeding",
        "Women are advised to do Tawaf at less crowded times",
      ],
      faq: [
        {
          q: "May a woman take medicine to delay her period during Hajj?",
          a: "Yes, after consulting a doctor to make sure it does no harm. Many scholars allow it so that she can complete her rites.",
        },
        {
          q: "Some light bleeding came outside my usual time during Tawaf. Is my Tawaf invalid?",
          a: "If it is not your usual time and it does not look like menstruation, it is usually irregular bleeding (istihadah), which does not prevent Tawaf: protect yourself and complete it. If in doubt, ask your group's woman guide.",
        },
      ],
      tags: ["Women in Tawaf", "Menstruation", "Head covering for women", "Farewell Tawaf"],
    }),

    "hajj-fiqh/tahallul": lesson({
      title: "Shaving, trimming and leaving Ihram (Tahallul)",
      summary: [
        "Shaving or trimming the hair is an obligation of Hajj and Umrah. Shaving is better for men: the Prophet ﷺ prayed three times for those who shaved and once for those who trimmed. Trimming must be from the whole head, not just part of it.",
        "A woman does not shave. She gathers her hair and cuts a fingertip's length from the ends, about two centimetres.",
        "The pilgrim leaves Ihram in two stages. The first Tahallul comes after doing two of three acts: stoning Jamrat al-Aqabah, shaving or trimming, and Tawaf al-Ifadah; then everything is allowed except marital relations. The second Tahallul comes after all three, and then everything is allowed.",
        "A pilgrim doing Tamattu' trims after his Umrah, so that there is hair left to shave in Hajj, when the time between Umrah and Hajj is short.",
      ],
      points: [
        "Shaving is better for men; trimming covers the whole head",
        "A woman cuts a fingertip's length from the ends of her hair",
        "First Tahallul after two of: stoning, shaving, Ifadah",
        "Second Tahallul after all three: everything is allowed",
        "In Tamattu', trim after Umrah and shave in Hajj",
      ],
      faq: [
        {
          q: "Is it enough to cut a few hairs from the head?",
          a: "The stronger view is that trimming covers the whole head, taking from all sides. Cutting a few hairs from one side is not enough.",
        },
        {
          q: "What does a bald man do?",
          a: "Many scholars recommend passing the razor over his head. His rite is valid.",
        },
      ],
      tags: ["Shaving", "Trimming", "First Tahallul", "Second Tahallul"],
    }),

    // ─────────── Level 3: The holy sites ───────────
    "hajj-fiqh/tarwiyah-mina": lesson({
      title: "The Day of Tarwiyah and the night in Mina",
      summary: [
        "The Day of Tarwiyah is the 8th of Dhu al-Hijjah. On it, the pilgrim doing Tamattu' enters Ihram for Hajj from where he is staying in Makkah, in the forenoon. Pilgrims doing Qiran and Ifrad are still in Ihram.",
        "Pilgrims go to Mina and pray there Dhuhr, Asr, Maghrib, Isha and the Fajr of the 9th, each prayer in its own time, shortening the four-rak'ah prayers without combining them. Spending the night before Arafah in Mina is a Sunnah.",
        "On this day the pilgrim says the Talbiyah and remembers God often. He prepares for the Day of Arafah by resting, drinking water and packing a small bag, and follows the group leader's instructions on departure times.",
      ],
      points: [
        "8 Dhu al-Hijjah: the Tamattu' pilgrim enters Ihram where he is, in the forenoon",
        "Five prayers in Mina: shortened, not combined",
        "Spending the night of the 9th in Mina is a Sunnah",
        "Say the Talbiyah and remember God often",
        "Keep to the departure times for Arafah",
      ],
      faq: [
        {
          q: "If our group takes us straight to Arafah on the night of the 9th, do we owe anything?",
          a: "No. Spending the night before Arafah in Mina is a Sunnah, not an obligation, and going straight to Arafah is a recognised way of managing the crowds.",
        },
        {
          q: "Where do we find our group's camp in Mina?",
          a: "The camp and block numbers are on your digital card in the platform's app, and you can open the map with directions from the app.",
        },
      ],
      tags: ["Day of Tarwiyah", "Mina", "8 Dhu al-Hijjah", "Spending the night"],
    }),

    "hajj-fiqh/arafah": lesson({
      title: "Standing at Arafah: the greatest pillar of Hajj",
      summary: [
        "The Prophet ﷺ said: \"Hajj is Arafah.\" Standing at Arafah is the greatest pillar; whoever misses it has missed Hajj. Its time runs from midday (when the sun passes its zenith) on the 9th until dawn on the Day of Sacrifice; whoever is there for any part of this time has made his Hajj.",
        "Pilgrims pray Dhuhr and Asr combined and shortened, with one adhan and two iqamahs, then devote themselves to dua. All of Arafah is a place of standing except Batn Uranah, so make sure you are inside the boundaries of Arafah, which are marked by signs.",
        "Whoever arrives during the day must stay until sunset. The best dua is the dua of the Day of Arafah, and the best words said by the Prophet ﷺ and the prophets before him are: «لَا إِلَهَ إِلَّا اللَّهُ وَحْدَهُ لَا شَرِيكَ لَهُ، لَهُ الْمُلْكُ وَلَهُ الْحَمْدُ وَهُوَ عَلَى كُلِّ شَيْءٍ قَدِيرٌ».",
        "You do not need to climb Jabal al-Rahmah (the Mount of Mercy), and going there to seek blessing is not part of the rite. Face the qiblah, not the mountain, when making dua. Beware of sunstroke: stay in the tent and drink water.",
      ],
      points: [
        "Hajj is Arafah: whoever misses the standing misses Hajj",
        "Time: from midday on 9 Dhu al-Hijjah until dawn on the 10th",
        "Dhuhr and Asr combined and shortened",
        "If you arrive by day, stay until sunset",
        "No need to climb Jabal al-Rahmah; make dua facing the qiblah",
      ],
      faq: [
        {
          q: "Is it valid to stand at Arafah inside the tent?",
          a: "Yes. Standing means being within the boundaries of Arafah, whether standing, sitting or riding. The tent is better for the elderly, to stay out of the sun.",
        },
        {
          q: "A patient is in hospital on the Day of Arafah. Has he missed Hajj?",
          a: "The health authorities take admitted patients to Arafah by ambulance as part of the patients' transfer plan, so that they are there for the standing, even for a few moments.",
        },
        {
          q: "Should a pilgrim fast on the Day of Arafah?",
          a: "No, fasting is not recommended for the pilgrim, so that he has strength for dua and worship. For those not on Hajj, fasting that day is recommended.",
        },
      ],
      tags: ["Arafah", "Day of Arafah", "Jabal al-Rahmah", "Dua of Arafah", "Namirah Mosque", "9 Dhu al-Hijjah"],
    }),

    "hajj-fiqh/muzdalifah": lesson({
      title: "The night in Muzdalifah",
      summary: [
        "After sunset on the Day of Arafah, pilgrims move calmly to Muzdalifah. When they arrive, they pray Maghrib and Isha combined, shortening Isha, and spend the night there.",
        "Spending the night in Muzdalifah is obligatory according to most scholars. The weak, the elderly, women and those accompanying them may leave for Mina after midnight, a concession granted by the Prophet ﷺ.",
        "Those who are able should stay until the Fajr prayer, then stand at al-Mash'ar al-Haram, or anywhere in Muzdalifah, making dua until the sky is very bright. Pebbles for the stoning may be picked up in Muzdalifah or in Mina.",
      ],
      points: [
        "Maghrib and Isha combined in Muzdalifah, with Isha shortened",
        "Spending the night in Muzdalifah is obligatory",
        "The weak and those with them may leave after midnight",
        "Make dua after Fajr until it is fully light",
        "Pebbles are collected in Muzdalifah or Mina",
      ],
      faq: [
        {
          q: "Our bus was delayed and we only reached Muzdalifah after Fajr. What is the ruling?",
          a: "Many scholars say that someone held back by the crowds or by the transport schedule, through no fault of his own, owes nothing, because he has a valid excuse.",
        },
        {
          q: "How many pebbles do we need?",
          a: "Seven for the Day of Sacrifice and 21 for each Day of Tashriq. A pilgrim who leaves early needs 49 pebbles; one who stays the extra day needs 70.",
        },
      ],
      tags: ["Muzdalifah", "al-Mash'ar al-Haram", "Pebbles", "Spending the night", "Night of the Day of Sacrifice"],
    }),

    "hajj-fiqh/jamarat": lesson({
      title: "Stoning the Jamarat",
      summary: [
        "On the Day of Sacrifice, the pilgrim stones Jamrat al-Aqabah only, with seven pebbles, saying «اللَّهُ أَكْبَرُ» with each one. A pebble is small, a little bigger than a chickpea; large stones and shoes are not thrown.",
        "On the Days of Tashriq, he stones all three Jamarat after midday: first the small one near Masjid al-Khayf, then the middle one, then the large one, which is Jamrat al-Aqabah. After the small and the middle ones, he stands facing the qiblah and makes a long dua.",
        "A pilgrim who wants to leave early stones on the 12th and leaves Mina before sunset. If the sun sets while he is still in Mina, he must stay the night and stone on the 13th. Elderly, sick and pregnant pilgrims may appoint someone to stone for them, provided that person is performing Hajj the same year.",
      ],
      points: [
        "Day of Sacrifice: Jamrat al-Aqabah only, with seven pebbles",
        "Days of Tashriq: all three after midday, in order",
        "Say «اللَّهُ أَكْبَرُ» with each pebble; make dua after the small and middle ones",
        "If leaving early, leave Mina before sunset on the 12th",
        "Those with an excuse, such as the elderly, may appoint someone to stone for them",
      ],
      faq: [
        {
          q: "How does someone stone on behalf of another?",
          a: "He first stones the whole Jamrah for himself with seven pebbles, then throws seven for the person he represents, at the same place.",
        },
        {
          q: "A pebble fell outside the basin. Does it count?",
          a: "No. The pebble must land in the basin, so throw another one in its place.",
        },
      ],
      tags: ["Stoning the Jamarat", "Jamrat al-Aqabah", "Days of Tashriq", "Leaving early", "Stoning on behalf of the elderly"],
    }),

    "hajj-fiqh/hady-farewell": lesson({
      title: "The Hady and the Farewell Tawaf",
      summary: [
        "The Hady is obligatory for pilgrims doing Tamattu' and Qiran: a sheep, or a seventh share of a camel or of a cow. It is sacrificed on the Day of Sacrifice or the three Days of Tashriq, within the Haram. You can buy a Hady voucher from the official programme, which sacrifices the animal and distributes the meat to the poor.",
        "Whoever cannot find a Hady or afford it fasts ten days: three during Hajj, preferably before the Day of Arafah (they may also be fasted on the Days of Tashriq), and seven when he returns home.",
        "The Farewell Tawaf is the last thing the pilgrim does before leaving Makkah: seven circuits with no Sa'i. Ibn Abbas (may God be pleased with him) said: \"People were commanded to make their last act at the House, except that it was lightened for the menstruating woman.\" It does no harm to buy something small or wait for the bus after it.",
      ],
      points: [
        "The Hady: a sheep, or a seventh of a camel or a cow",
        "Sacrifice on the Day of Sacrifice or the Days of Tashriq, inside the Haram",
        "If you cannot offer a Hady, fast 3 days during Hajj and 7 after returning",
        "The Farewell Tawaf is your last act at the House, with no Sa'i",
        "The Farewell Tawaf is lifted for menstruating women",
      ],
      faq: [
        {
          q: "May I appoint the official programme to sacrifice my Hady?",
          a: "Yes. Buying a Hady voucher from the approved programme is a valid appointment: it sacrifices at the proper time and distributes the meat to those entitled to it.",
        },
        {
          q: "I did the Farewell Tawaf, then the bus was hours late. Do I repeat the Tawaf?",
          a: "No, you do not need to repeat it if the wait is part of your departure, such as waiting for the bus or for your companions.",
        },
      ],
      tags: ["Hady", "Farewell Tawaf", "Hady voucher", "Fasting instead of the Hady"],
    }),
  },
};
