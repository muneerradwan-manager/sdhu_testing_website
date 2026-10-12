import type { CollectionsEn, FieldsEn } from "./index";

/**
 * The academy in English, part B: the lessons of every track except «فقه الحج» (./academy-a) —
 * فقه العمرة, آداب الرحلة, المدينة المنورة, الأدعية والأذكار, تحضير الحاج. Item id = `<track>/<lesson>`.
 * Quran verses and duas stay in Arabic (they are recited in Arabic); the words around them are English.
 */

type Dua = [title: string, text: string, source: string];

const lesson = (
  title: string,
  summary: string[],
  points: string[],
  faq: [q: string, a: string][],
  tags: string[],
  duas?: Dua[],
): FieldsEn => ({
  title,
  summary: summary.map((text) => ({ text })),
  points: points.map((text) => ({ text })),
  tags: tags.map((text) => ({ text })),
  faq: faq.map(([q, a]) => ({ q, a })),
  ...(duas ? { duas: duas.map(([t, text, source]) => ({ title: t, text, source })) } : {}),
});

// ───────────────────────── فقه العمرة ─────────────────────────

const UMRAH: Record<string, FieldsEn> = {
  "umrah-fiqh/umrah-virtue": lesson(
    "The Virtue of Umrah and When to Perform It",
    [
      "Umrah is a great act of worship. The Prophet ﷺ said: “One Umrah to the next is an expiation for what lies between them, and an accepted Hajj has no reward but Paradise.” Some scholars hold that Umrah is obligatory once in a lifetime; others hold that it is a strongly recommended Sunnah.",
      "Umrah can be performed at any time of the year, and it has a special virtue in Ramadan. The Prophet ﷺ said: “An Umrah in Ramadan is equal to a Hajj” — equal in reward, that is. It does not replace the obligatory Hajj.",
      "A pilgrim performing Tamattu' can perform Umrah on arriving in Makkah during the months of Hajj, then wait for the Day of Tarwiyah to enter Ihram for Hajj.",
    ],
    [
      "Umrah expiates the sins between it and the next Umrah",
      "Umrah can be performed on any day of the year",
      "An Umrah in Ramadan equals a Hajj in reward",
      "The Tamattu' pilgrim's Umrah comes in the months of Hajj, before Hajj",
    ],
    [
      ["Does an Umrah in Ramadan replace Hajj?", "No. It equals Hajj in reward only; the obligation of Hajj remains on everyone who is able to perform it."],
      [
        "Can someone who is not performing Hajj do Umrah during the Hajj days?",
        "Umrah is valid at any time, but the regulations stop Umrah visas from being issued during the Hajj days in order to manage the crowds.",
      ],
    ],
    ["Virtue of Umrah", "Umrah in Ramadan", "When to perform Umrah"],
  ),
  "umrah-fiqh/umrah-pillars": lesson(
    "The Pillars and Obligations of Umrah",
    [
      "According to most scholars, Umrah has three pillars: Ihram, which is the intention to enter the rite; Tawaf around the Kaaba, seven circuits; and Sa'i between Safa and Marwah, seven laps. Anyone who leaves out a pillar has not completed their Umrah until they perform it.",
      "Umrah has two obligations: entering Ihram at the Miqat, and shaving or shortening the hair. Anyone who leaves out an obligation must offer a sacrifice, slaughtered in the Haram and given to its poor, and their Umrah is still valid.",
      "The Sunnahs are many. They include bathing before Ihram, the Talbiyah, uncovering the right shoulder (idtiba') and walking briskly (raml) in Tawaf for men, praying two rak'ahs behind the Station of Ibrahim, and drinking Zamzam.",
    ],
    [
      "Pillars: Ihram, Tawaf, Sa'i",
      "Obligations: Ihram at the Miqat; shaving or shortening the hair",
      "Leaving out a pillar means the Umrah is not complete",
      "Leaving out an obligation is made up for with a sacrifice",
      "The Sunnahs add to the reward; nothing is due if they are left out",
    ],
    [
      ["Is the Farewell Tawaf obligatory in Umrah?", "Most scholars say it is not obligatory, but it is recommended for anyone leaving Makkah."],
      [
        "I forgot to shorten my hair and travelled. What should I do?",
        "Take off your Ihram clothes if you are still wearing them, shorten or shave your hair wherever you remember, and ask about a sacrifice, as some scholars require one from anyone who delayed it until after leaving the Haram.",
      ],
    ],
    ["Pillars of Umrah", "Obligations of Umrah", "Sunnahs of Umrah"],
  ),
  "umrah-fiqh/umrah-ihram": lesson(
    "Entering Ihram for Umrah at the Miqat",
    [
      "The pilgrim enters Ihram at the Miqat on their route. Anyone already in Makkah who wants to perform Umrah goes out to the nearest point outside the Haram, such as Masjid al-Tan'im (Masjid Aisha) or al-Ji'ranah, and enters Ihram there.",
      "Men wear the two Ihram cloths (izar and rida'); women wear their usual modest clothes and hijab. The pilgrim then makes the intention, says «لبيك عمرة» (Here I am for Umrah) and begins the Talbiyah.",
      "From the moment of intention, the pilgrim avoids everything forbidden in Ihram until leaving it by shaving or shortening the hair after Sa'i.",
    ],
    [
      "Ihram at the Miqat for those coming from outside Makkah",
      "People in Makkah enter Ihram at al-Tan'im or al-Ji'ranah",
      "Make the intention, then say: «لبيك عمرة»",
      "Avoid what is forbidden in Ihram until Tahallul",
    ],
    [
      [
        "Can I enter Ihram for Umrah from my hotel in Makkah?",
        "No. Anyone in Makkah goes outside the Haram boundary, to al-Tan'im for example, to enter Ihram, because Umrah joins the land outside the Haram with the Haram itself.",
      ],
      ["Can a woman enter Ihram in a black abaya?", "Yes. A woman may enter Ihram in any colour that covers her; white is not required."],
    ],
    ["Ihram for Umrah", "Al-Tan'im", "Miqat", "Labbayk 'Umrah"],
  ),
  "umrah-fiqh/umrah-steps": lesson(
    "How to Perform Umrah, Start to Finish",
    [
      "Umrah begins with Ihram at the Miqat and the Talbiyah. On reaching Masjid al-Haram, the pilgrim stops the Talbiyah and begins Tawaf at the Black Stone: seven circuits with the Kaaba on the left.",
      "After Tawaf, the pilgrim prays two rak'ahs behind the Station of Ibrahim if possible and drinks Zamzam, then goes to Safa and performs Sa'i: seven laps ending at Marwah.",
      "After Sa'i, men shave or shorten their hair, and women cut a fingertip's length from the ends of their hair. With this the Umrah is complete, and everything that was forbidden in Ihram is permitted again.",
    ],
    [
      "Ihram and the Talbiyah at the Miqat",
      "Seven circuits of Tawaf, then two rak'ahs behind the Station",
      "Seven laps of Sa'i from Safa to Marwah",
      "Shave or shorten the hair, then full Tahallul",
    ],
    [
      ["How long does Umrah usually take?", "At normal times it takes two to three hours; it can take longer when it is crowded."],
      ["Can I rest between Tawaf and Sa'i?", "Yes. Sa'i does not have to follow Tawaf straight away, so you may rest or eat and then perform Sa'i."],
    ],
    ["How to perform Umrah", "Umrah steps", "Tawaf", "Sa'i"],
  ),
  "umrah-fiqh/umrah-mistakes": lesson(
    "Common Mistakes in Umrah",
    [
      "A frequent mistake is passing the Miqat without Ihram, especially by those who fly and wait until they land in Jeddah. The correct way is to make the intention when the plane is level with the Miqat.",
      "Another is the belief of some women that Ihram requires a particular colour, or that covering the face is forbidden altogether. In fact, what is forbidden is the fitted niqab; a woman may let a cover hang down over her face.",
      "Others include shortening only a few hairs, leaving Ihram before finishing Sa'i, and performing Sa'i before Tawaf.",
    ],
    [
      "Do not delay Ihram until Jeddah when you fly over the Miqat",
      "There is no set colour for women's clothes in Ihram",
      "Shorten the hair from the whole head",
      "No Tahallul before Sa'i is complete",
    ],
    [
      [
        "I reached Jeddah without Ihram. What should I do?",
        "Go back to the Miqat if you can and enter Ihram there, and nothing is due. If you enter Ihram in Jeddah, most scholars say you owe a sacrifice.",
      ],
      ["Do I need wudu for Sa'i?", "No. Being in a state of purity for Sa'i is recommended, not required."],
    ],
    ["Umrah mistakes", "Miqat", "Jeddah", "Shortening the hair"],
  ),
  "umrah-fiqh/umrah-repeat": lesson(
    "Repeating Umrah and Umrah on Behalf of Others",
    [
      "Umrah may be repeated. Scholars differ about repeating it on the same journey; on crowded days it is better to perform more Tawaf than to keep going out to al-Tan'im.",
      "Umrah may be performed on behalf of someone who has died, or someone permanently unable to go, such as a very elderly person or a sick person with no hope of recovery — provided the person performing it has already performed Umrah for themselves.",
      "Whoever performs Umrah for someone else makes the intention at Ihram and says «لبيك عمرة عن فلان», naming the person. It carries a great reward, God willing.",
    ],
    [
      "Repeating Umrah is allowed; more Tawaf is better when it is crowded",
      "Umrah for the deceased and for those unable to go is allowed",
      "Perform your own Umrah first",
      "The intention at Ihram: «لبيك عمرة عن فلان»",
    ],
    [
      [
        "Can I perform Umrah for my mother while she is able to go herself?",
        "An obligatory Umrah is not valid on behalf of someone who is able. You can still gift her other good deeds, such as dua and charity.",
      ],
      ["Can one Umrah be performed for more than one person?", "No. One Umrah is for one person only."],
    ],
    ["Umrah for others", "Repeating Umrah", "Umrah for the deceased"],
  ),
};

// ───────────────────────── آداب الرحلة ─────────────────────────

const ETHICS: Record<string, FieldsEn> = {
  "journey-ethics/patience": lesson(
    "Patience and Good Character on Hajj",
    [
      "Allah says: «فمن فرض فيهن الحج فلا رفث ولا فسوق ولا جدال في الحج» — whoever undertakes Hajj, let there be no indecency, no wrongdoing and no quarrelling. Hajj is a school of character, where the pilgrim learns patience and self-control.",
      "Hajj brings long waits, crowds, heat and fatigue. The successful pilgrim meets all of this with contentment, remembering that the reward matches the hardship and that anger robs worship of its spirit.",
      "One sign of an accepted Hajj is that the pilgrim comes home with better character than before: gentler in speech and kinder to people.",
    ],
    [
      "No indecency, no wrongdoing and no quarrelling on Hajj",
      "The reward matches the hardship, with sincerity",
      "Anger takes away the spirit of worship",
      "Good character is a sign of an accepted Hajj",
    ],
    [
      [
        "What should I do if another pilgrim wrongs me?",
        "Remember that you are in worship. Respond in the best way, ask the group leader for help if needed, and do not get drawn into an argument.",
      ],
      ["Does arguing invalidate Hajj?", "It does not invalidate Hajj, but it reduces its reward. Allah forbade it because it spoils hearts."],
    ],
    ["Patience", "Good character", "Arguing", "Accepted Hajj"],
  ),
  "journey-ethics/crowds": lesson(
    "Handling Crowds Wisely",
    [
      "Crowds are part of the Hajj journey, and handling them wisely protects you and others. Do not push anyone, do not stop suddenly in walkways, and do not sit where people are passing.",
      "Choose the least crowded times for Tawaf and stoning according to the movement schedule, stay with your group, and remember your camp number and your group's meeting point.",
      "If the crowd gets heavy, stay calm, protect your chest with your arms, walk with the flow of people rather than against it, and keep away from barriers and pillars.",
    ],
    [
      "Do not push anyone or stop suddenly in walkways",
      "Follow your group's movement schedule",
      "Remember your camp number and meeting point",
      "Walk with the flow in heavy crowds",
    ],
    [
      [
        "I got separated from my group. What should I do?",
        "Open the app and press «I'm lost» so your location reaches your group leader, or go to the nearest guidance centre and show your digital card.",
      ],
      ["Can I delay stoning to avoid the crowds?", "Yes. Many scholars allow stoning late in the day and at night, which is easier for the elderly."],
    ],
    ["Crowds", "Movement schedule", "Safety", "Lost pilgrims"],
  ),
  "journey-ethics/companions": lesson(
    "The Rights of Travel Companions",
    [
      "Companionship on Hajj is a trust: pilgrims share one room, one tent and one bus with their companions for many days. The Prophet ﷺ said: “The best of companions in the sight of Allah is the one who is best to his companion.”",
      "A companion's rights include putting them first in space and food, bearing with their ways, not crowding them in the tent, helping them carry their things, and checking on them when they are missing.",
      "Good manners also mean following the group leader on organisational matters, as this keeps order and makes things easier for everyone.",
    ],
    [
      "The best companion is the one who is best to his companion",
      "Put others first in space and food",
      "Be patient with your companions' ways",
      "Follow the group leader on organisation",
    ],
    [
      [
        "My roommate disturbs me by being loud. What should I do?",
        "Advise him gently. If that does not help, quietly ask the group administrator to change your room, without a quarrel.",
      ],
      ["Do I have to share my food with my companions?", "It is not required, but it is a generosity that increases the reward and brings hearts together."],
    ],
    ["Companionship", "Putting others first", "Group leader", "Travel etiquette"],
  ),
  "journey-ethics/elderly": lesson(
    "Serving the Elderly and People with Special Needs",
    [
      "Most Syrian pilgrims are elderly, and serving them is among the greatest good deeds. The Prophet ﷺ said: “He is not one of us who does not show mercy to our young and respect to our elders.”",
      "A young pilgrim can help an elderly one carry their bag, push their wheelchair, remind them when to take their medicine, read instructions to them, and stone on their behalf if asked to.",
      "Good manners with people with special needs include respecting their privacy, asking before helping, being patient with their slow pace, and telling the medical team if you notice any sign of exhaustion.",
    ],
    [
      "Serving the elderly is among the greatest good deeds",
      "Help with bags, wheelchairs and medicine times",
      "Ask before you help, and respect privacy",
      "Tell the medical team if you notice exhaustion",
    ],
    [
      [
        "Can I stone on behalf of my grandmother while I am on Hajj myself?",
        "Yes, if she is unable and has asked you to. Stone for yourself first, then for her, at each Jamrah.",
      ],
      [
        "Where can we get a wheelchair for an elderly pilgrim?",
        "Free and paid wheelchairs are available at the entrances of Masjid al-Haram, and you can ask for help through the app.",
      ],
    ],
    ["Elderly pilgrims", "Special needs", "Serving pilgrims", "Wheelchairs"],
  ),
  "journey-ethics/cleanliness": lesson(
    "Cleanliness and Respect for Places and Rules",
    [
      "The Two Holy Mosques and the holy sites are sacred places, and keeping them clean is part of honouring the symbols of Allah. Put rubbish where it belongs, and do not leave food scraps on the roads or in the camps.",
      "Respecting the rules is part of being trustworthy: holding a Hajj permit, using the pedestrian routes, following Civil Defence instructions, and not cooking in the tents because of the fire risk.",
      "The Syrian pilgrim is an ambassador for his country, and good conduct leaves a fine impression on millions of Muslims from every land.",
    ],
    [
      "Cleanliness is part of honouring the symbols of Allah",
      "Keep to permits and pedestrian routes",
      "No cooking inside the tents",
      "The pilgrim is an ambassador for his country",
    ],
    [
      [
        "Is performing Hajj without a permit allowed?",
        "Holding a permit is an obligation: it is obedience to those in authority for the common good, and it protects pilgrims' lives from overcrowding.",
      ],
      ["Can I sleep by the roadside in Mina?", "You should not. It blocks people and ambulances and puts you in danger."],
    ],
    ["Cleanliness", "Rules", "Permits", "Safety"],
  ),
};

// ───────────────────────── المدينة المنورة ─────────────────────────

const MADINAH: Record<string, FieldsEn> = {
  "madinah/visit-etiquette": lesson(
    "Etiquette of Visiting Madinah",
    [
      "Visiting Madinah is not one of the rites of Hajj, and the validity of Hajj does not depend on it, but it is a recommended Sunnah at any time. The visitor travels there to pray in the Prophet's Mosque.",
      "The Prophet ﷺ said: “A prayer in this mosque of mine is better than a thousand prayers elsewhere, except Masjid al-Haram.” So the visitor makes a point of praying the five daily prayers in the mosque, remembering Allah often and sending blessings upon the Prophet ﷺ.",
      "The etiquette of the visit includes calm, a lowered voice, respect for the people of Madinah, and avoiding innovations such as rubbing the walls and windows for blessing.",
    ],
    [
      "The visit is a separate Sunnah, not a rite of Hajj",
      "A prayer in the Prophet's Mosque is better than a thousand prayers",
      "Lower your voice and keep calm in the mosque",
      "Avoid rubbing the walls and windows",
    ],
    [
      [
        "Must I stay eight days in Madinah to pray forty prayers?",
        "No. Many scholars consider the hadith of the forty prayers weak, so the pilgrim stays for the period set by the group's programme.",
      ],
      [
        "Does the pilgrim enter Ihram in Madinah?",
        "If he leaves Madinah heading to Makkah to perform a rite, he enters Ihram at the Miqat of Dhul-Hulayfah.",
      ],
    ],
    ["Madinah", "Etiquette of the visit", "The Prophet's Mosque"],
  ),
  "madinah/nabawi-mosque": lesson(
    "The Prophet's Mosque and the Noble Rawdah",
    [
      "The Prophet ﷺ built his mosque when he arrived in Madinah and took part in the building himself. It has been expanded over the centuries and today holds more than a million worshippers.",
      "The Noble Rawdah is the area between the pulpit and the Prophet's chamber ﷺ. He said of it: “What lies between my house and my pulpit is one of the gardens of Paradise.” It is known for its green carpet, and entering it requires an appointment booked in advance through the official app.",
      "If the visitor gets an appointment, it is recommended to pray in the Rawdah as much as is easy, without pushing or staying so long that others are crowded out.",
    ],
    [
      "The Prophet ﷺ built the mosque himself",
      "The Rawdah lies between the pulpit and the noble chamber",
      "Entry to the Rawdah is by appointment",
      "Pray there without pushing or lingering",
    ],
    [
      [
        "How do I book an appointment to enter the Rawdah?",
        "It is booked through the official app approved in Saudi Arabia, and your group administrator will help elderly pilgrims book.",
      ],
      ["Do women have separate times to visit the Rawdah?", "Yes. Separate times are set aside for women and appear in the app when you book."],
    ],
    ["The Prophet's Mosque", "The Noble Rawdah", "Booking the Rawdah"],
  ),
  "madinah/greeting-prophet": lesson(
    "Greeting the Prophet ﷺ and His Two Companions",
    [
      "It is recommended for the visitor to greet the Prophet ﷺ at his grave with good manners and a lowered voice, saying «السلام عليك يا رسول الله ورحمة الله وبركاته» (Peace be upon you, O Messenger of Allah, and the mercy of Allah and His blessings), and to send blessings upon him.",
      "Then he moves a little forward and greets Abu Bakr al-Siddiq (may Allah be pleased with him), then a little further and greets Umar ibn al-Khattab (may Allah be pleased with him), and prays for them both.",
      "To make dua for himself, he faces the Qiblah. Rubbing or kissing the chamber, raising the voice there, or walking around it is not part of the Sunnah.",
    ],
    [
      "Greet the Prophet ﷺ with good manners and a lowered voice",
      "Then greet Abu Bakr, then Umar (may Allah be pleased with them)",
      "Make dua facing the Qiblah",
      "No rubbing, no kissing, no raised voices",
    ],
    [
      [
        "Do women visit the noble grave?",
        "A woman greets the Prophet ﷺ from anywhere in the mosque; blessings upon him reach him wherever she is.",
      ],
      [
        "Can I ask a visitor to convey my greetings to the Prophet ﷺ?",
        "Blessings and greetings upon the Prophet ﷺ reach him from anywhere, so it is better for every Muslim to send them himself.",
      ],
    ],
    ["Greeting the Prophet", "Visiting the grave", "Abu Bakr", "Umar"],
  ),
  "madinah/quba": lesson(
    "Quba Mosque and the Virtue of Praying There",
    [
      "Quba Mosque is the first mosque built in Islam. The Prophet ﷺ founded it when he arrived in Madinah as an emigrant, and the verse «لمسجد أُسس على التقوى من أول يوم أحق أن تقوم فيه» (a mosque founded on piety from the first day is more worthy of your standing in it) was revealed about it.",
      "The Prophet ﷺ said: “Whoever purifies himself at home, then comes to Quba Mosque and prays a prayer in it, will have a reward like that of an Umrah.” The Prophet ﷺ used to visit it every Saturday, walking or riding.",
      "It is recommended to make wudu where you are staying, then go to Quba and pray two rak'ahs there. It is about three kilometres from the Prophet's Mosque, with a shaded walkway between them.",
    ],
    [
      "The first mosque built in Islam",
      "Praying there carries the reward of an Umrah",
      "Make wudu where you stay, then go",
      "A shaded walkway links it to the Prophet's Mosque",
    ],
    [
      ["Is a particular prayer required at Quba?", "No. Any prayer is enough, even two rak'ahs, obligatory or voluntary."],
      [
        "Must I visit Quba on a Saturday?",
        "No. The virtue holds on every day; visiting on a Saturday follows what the Prophet ﷺ did.",
      ],
    ],
    ["Quba Mosque", "Reward of an Umrah", "Landmarks of Madinah"],
  ),
  "madinah/uhud": lesson(
    "Mount Uhud and the Martyrs of Uhud",
    [
      "Mount Uhud lies north of Madinah. The Prophet ﷺ said of it: “Uhud is a mountain that loves us and we love it.” The Battle of Uhud took place there in the third year after the Hijrah.",
      "Seventy Companions were martyred in the battle, among them Hamzah ibn Abd al-Muttalib, the Prophet's uncle, and Mus'ab ibn Umayr (may Allah be pleased with them). They were buried where the battle was fought.",
      "It is recommended to visit the martyrs' cemetery and greet them, saying: «السلام عليكم أهل الديار من المؤمنين والمسلمين، وإنا إن شاء الله بكم لاحقون». The visitor learns from the battle the lesson of obedience and the cost of disobeying orders, as happened with the archers on Mount Aynayn.",
    ],
    [
      "Uhud is a mountain that loves us and we love it",
      "The Battle of Uhud, in the third year after the Hijrah",
      "Seventy martyrs, among them Hamzah and Mus'ab",
      "The lesson of obedience from the story of the archers",
    ],
    [
      [
        "Is climbing the Archers' Hill to seek blessing part of the Sunnah?",
        "Seeking blessing from mountains and stones has no basis in the religion, but there is no harm in standing on the hill to reflect and remember the events of the battle.",
      ],
      [
        "What is the dua for visiting graves?",
        "«السلام عليكم أهل الديار من المؤمنين والمسلمين، وإنا إن شاء الله بكم لاحقون، نسأل الله لنا ولكم العافية» — Peace be upon you, people of these dwellings, believers and Muslims; we will join you, God willing. We ask Allah for well-being for us and for you.",
      ],
    ],
    ["Mount Uhud", "Martyrs of Uhud", "Hamzah", "Visiting graves"],
  ),
  "madinah/seerah-landmarks": lesson(
    "Landmarks of the Prophet's Life in Madinah",
    [
      "Madinah has many landmarks linked to the life of the Prophet ﷺ. Among them is al-Baqi', the cemetery of the people of Madinah, where many Companions and Mothers of the Believers are buried, and Masjid al-Qiblatayn, where the Qiblah was changed to the Kaaba.",
      "Another is the site of the Trench (al-Khandaq), which the Muslims dug in the Battle of the Confederates, with the Seven Mosques nearby marking the site of the battle.",
      "Visiting these landmarks to learn and reflect is worthwhile, but there is no special act of worship in them except what has been reported, such as praying at Quba and greeting the people of al-Baqi' and the martyrs of Uhud.",
    ],
    [
      "Al-Baqi': resting place of Companions and Mothers of the Believers",
      "Masjid al-Qiblatayn and the change of the Qiblah",
      "The Trench and the Seven Mosques",
      "Visit to reflect, without invented acts of worship",
    ],
    [
      [
        "Can women enter al-Baqi'?",
        "Men may enter al-Baqi' at set times; women greet the people of al-Baqi' from outside the wall.",
      ],
      [
        "Does praying in Masjid al-Qiblatayn have a special virtue?",
        "No special virtue is established, but praying there is rewarded as in any other mosque.",
      ],
    ],
    ["Al-Baqi'", "Masjid al-Qiblatayn", "The Trench", "Landmarks of the Seerah"],
  ),
};

// ───────────────────────── الأدعية والأذكار ─────────────────────────

const DUAS: Record<string, FieldsEn> = {
  "duas/travel-duas": lesson(
    "The Dua for Travel and Riding",
    [
      "The pilgrim begins the journey by remembering Allah. On boarding the bus or the plane, he says the travel dua that the Prophet ﷺ taught his Companions, which asks for righteousness, piety and an easy journey.",
      "The pilgrim bids his family farewell with «أستودعكم الله الذي لا تضيع ودائعه» (I entrust you to Allah, whose trusts are never lost), and his family reply «أستودع الله دينك وأمانتك وخواتيم عملك» (I entrust to Allah your faith, your trust and the last of your deeds).",
    ],
    [
      "The travel dua when setting off",
      "Bid your family farewell with the reported dua",
      "Say «الله أكبر» going up and «سبحان الله» going down",
    ],
    [
      [
        "Do I say the travel dua every time I ride inside Makkah?",
        "The travel dua is said at the start of the journey. For short trips the riding dua is enough: «سبحان الذي سخر لنا هذا وما كنا له مقرنين».",
      ],
      [
        "Does the pilgrim shorten the prayer on the plane?",
        "Yes. Once he has left his town, the concession to shorten the prayer begins, and he prays on the plane if he fears the prayer time will pass.",
      ],
    ],
    ["Travel dua", "Riding dua", "Farewell"],
    [
      [
        "The travel dua",
        "الله أكبر، الله أكبر، الله أكبر، سبحان الذي سخّر لنا هذا وما كنا له مقرنين، وإنا إلى ربنا لمنقلبون. اللهم إنا نسألك في سفرنا هذا البر والتقوى، ومن العمل ما ترضى، اللهم هوّن علينا سفرنا هذا واطوِ عنا بُعده، اللهم أنت الصاحب في السفر، والخليفة في الأهل.",
        "Narrated by Muslim",
      ],
      ["When bidding farewell to the family", "أستودعكم الله الذي لا تضيع ودائعه.", "Narrated by Ibn Majah"],
    ],
  ),
  "duas/talbiyah": lesson(
    "The Talbiyah and the Remembrances of Ihram",
    [
      "The Talbiyah is the call of Hajj and Umrah. The pilgrim begins it straight after making the intention and repeats it along the way and whenever circumstances change: going uphill or downhill, or meeting other travellers.",
      "Men raise their voices in the Talbiyah without overdoing it; women say it loud enough for themselves and the women beside them to hear. Chanting the Talbiyah together in one voice is not part of the Sunnah.",
    ],
    ["The Talbiyah straight after the intention", "Repeat it whenever circumstances change", "No group Talbiyah in one voice"],
    [
      ["When does the Umrah pilgrim stop the Talbiyah?", "When he begins Tawaf."],
      [
        "Can words be added to the Talbiyah?",
        "Yes. Some Companions used to add «لبيك وسعديك، والخير في يديك، والرغباء إليك والعمل», and the Prophet ﷺ approved of it.",
      ],
    ],
    ["Talbiyah", "Remembrances of Ihram", "Labbayk Allahumma Labbayk"],
    [
      [
        "The Talbiyah",
        "لبيك اللهم لبيك، لبيك لا شريك لك لبيك، إن الحمد والنعمة لك والملك، لا شريك لك.",
        "Agreed upon (al-Bukhari and Muslim)",
      ],
    ],
  ),
  "duas/tawaf-duas": lesson(
    "Remembrances of Tawaf and Sa'i",
    [
      "On touching or pointing to the Black Stone, the pilgrim says «بسم الله، والله أكبر» (In the name of Allah; Allah is the Greatest). Between the Yemeni Corner and the Black Stone he says «ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار» (Our Lord, give us good in this world and good in the Hereafter, and protect us from the punishment of the Fire).",
      "No specific dua is established for each circuit, so the pilgrim asks for whatever he wishes of the good of this world and the next, in his own language and with a present heart.",
      "In Sa'i, on reaching Safa the first time, he recites «إن الصفا والمروة من شعائر الله» (Safa and Marwah are among the symbols of Allah). On Safa and on Marwah he glorifies Allah, declares His oneness and makes dua, three times.",
    ],
    [
      "«بسم الله، والله أكبر» at the Black Stone",
      "«ربنا آتنا في الدنيا حسنة» between the two corners",
      "No set dua for each circuit",
      "Remembrance on Safa and Marwah",
    ],
    [
      [
        "Can I read duas from a booklet during Tawaf?",
        "Yes, but making dua in words you understand, with a present heart, is better than reading what you do not understand.",
      ],
      ["Can I make dua in a language other than Arabic during Tawaf?", "Yes. You may make dua in any language during Tawaf, Sa'i and at Arafah."],
    ],
    ["Duas of Tawaf", "Duas of Sa'i", "The Black Stone", "Safa"],
    [
      ["Between the Yemeni Corner and the Black Stone", "ربنا آتنا في الدنيا حسنة، وفي الآخرة حسنة، وقنا عذاب النار.", "Narrated by Abu Dawud"],
      [
        "On Safa and Marwah",
        "الله أكبر، الله أكبر، الله أكبر، لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير، لا إله إلا الله وحده، أنجز وعده، ونصر عبده، وهزم الأحزاب وحده.",
        "Narrated by Muslim",
      ],
    ],
  ),
  "duas/zamzam-maqam": lesson(
    "At the Station of Ibrahim and Zamzam",
    [
      "After Tawaf, the pilgrim goes to the Station of Ibrahim and recites «واتخذوا من مقام إبراهيم مصلى» (And take the Station of Ibrahim as a place of prayer), then prays two rak'ahs behind it if possible: Surat al-Kafirun in the first and Surat al-Ikhlas in the second.",
      "Then he drinks Zamzam. The Prophet ﷺ said: “Zamzam water is for whatever it is drunk for.” So he says «بسم الله», drinks, and asks for whatever he wishes of the good of this world and the next.",
    ],
    ["Recite the verse at the Station", "Two rak'ahs: al-Kafirun, then al-Ikhlas", "Zamzam is for whatever it is drunk for", "Do not crowd behind the Station"],
    [
      ["Must the two rak'ahs be directly behind the Station?", "No. They are valid anywhere in the mosque, especially when it is crowded."],
      ["Can I take Zamzam water back to Syria?", "Yes. Each pilgrim is allowed one sealed official 5-litre container at the airport."],
    ],
    ["Station of Ibrahim", "Zamzam water", "The two rak'ahs of Tawaf"],
    [["At the Station of Ibrahim", "وَاتَّخِذُوا مِن مَّقَامِ إِبْرَاهِيمَ مُصَلًّى", "Surat al-Baqarah 2:125"]],
  ),
  "duas/day-tarwiyah": lesson(
    "Remembrances of the Day of Tarwiyah (8 Dhu al-Hijjah)",
    [
      "On the Day of Tarwiyah the Tamattu' pilgrim enters Ihram for Hajj, saying «لبيك حجاً» (Here I am for Hajj). In Mina the pilgrim repeats the Talbiyah often, glorifies Allah, declares His oneness and recites the Quran.",
      "The first ten days of Dhu al-Hijjah are the best days of the year, so it is recommended to say often: «لا إله إلا الله، والله أكبر، والحمد لله».",
    ],
    ["«لبيك حجاً» on entering Ihram", "Repeat the Talbiyah often in Mina", "Glorify Allah and declare His oneness in the ten days"],
    [
      [
        "Is there a special dua on arriving in Mina?",
        "No specific dua is established. The pilgrim repeats the Talbiyah, remembers Allah often and asks for whatever he wishes.",
      ],
      ["What are the words of the Takbir in the ten days?", "One form is: «الله أكبر الله أكبر، لا إله إلا الله، والله أكبر الله أكبر ولله الحمد»."],
    ],
    ["Day of Tarwiyah", "Remembrances in Mina", "8 Dhu al-Hijjah", "Labbayk Hajjan"],
    [["The Takbir of the ten days", "الله أكبر الله أكبر، لا إله إلا الله، والله أكبر الله أكبر، ولله الحمد.", "Reported from the Companions"]],
  ),
  "duas/day-arafah": lesson(
    "The Dua of the Day of Arafah (9 Dhu al-Hijjah)",
    [
      "The Day of Arafah is the day of dua. The Prophet ﷺ said: “The best dua is the dua of the Day of Arafah, and the best of what I and the prophets before me have said is: «لا إله إلا الله وحده لا شريك له، له الملك وله الحمد وهو على كل شيء قدير».” (There is no god but Allah alone, with no partner; His is the dominion and His is the praise, and He has power over all things.)",
      "After praying Dhuhr and Asr, the pilgrim devotes himself to dua, facing the Qiblah with hands raised, asking Allah earnestly for himself, his parents, his family, his country and all Muslims, until sunset.",
      "There is no day on which Allah frees more of His servants from the Fire than the Day of Arafah, so the pilgrim should make the most of these hours and not waste them chatting or taking photos.",
    ],
    [
      "The best dua is the dua of the Day of Arafah",
      "Say often: «لا إله إلا الله وحده لا شريك له»",
      "Make dua facing the Qiblah with hands raised",
      "Do not waste the hours chatting or taking photos",
    ],
    [
      ["Should I make dua standing or sitting?", "Both are fine; what matters is a present heart. Elderly pilgrims can make dua sitting in the tent."],
      ["Can I make dua from a list I prepared?", "Yes. Preparing a list of needs and names before the Day of Arafah helps you not to forget anything."],
    ],
    ["Dua of the Day of Arafah", "Arafah", "9 Dhu al-Hijjah"],
    [
      ["The best words on the Day of Arafah", "لا إله إلا الله وحده لا شريك له، له الملك وله الحمد، وهو على كل شيء قدير.", "Narrated by al-Tirmidhi"],
      ["A comprehensive dua", "اللهم إنك عفوٌّ كريم تحب العفو فاعفُ عني.", "Narrated by al-Tirmidhi"],
    ],
  ),
  "duas/days-eid-tashreeq": lesson(
    "Remembrances of the Day of Sacrifice and the Days of Tashreeq",
    [
      "The Day of Sacrifice is the greatest day of Eid. The pilgrim says «الله أكبر» with each pebble he throws, and when slaughtering the Hady he says «بسم الله، والله أكبر، اللهم هذا منك ولك» (In the name of Allah; Allah is the Greatest. O Allah, this is from You and for You).",
      "The Days of Tashreeq are days of eating, drinking and remembering Allah. The pilgrim glorifies Allah often in the tents and after the prayers, and after stoning the small and middle Jamarat he stands facing the Qiblah and makes dua.",
    ],
    ["«الله أكبر» with each pebble", "«بسم الله والله أكبر» when slaughtering", "The Days of Tashreeq are days of remembrance", "Dua after the first and second Jamarat"],
    [
      ["Does the pilgrim make dua after Jamrat al-Aqabah?", "No. He stones it and leaves without stopping for dua, as the Prophet ﷺ did."],
      [
        "Does the pilgrim fast on the Days of Tashreeq?",
        "Fasting on them is not allowed, except for a pilgrim who cannot find a Hady: he fasts three of his days then.",
      ],
    ],
    ["Day of Sacrifice", "Days of Tashreeq", "Takbir", "Stoning the Jamarat"],
    [
      ["When slaughtering the Hady", "بسم الله، والله أكبر، اللهم هذا منك ولك.", "Narrated by Abu Dawud"],
      ["With each pebble", "الله أكبر.", "Narrated by Muslim"],
    ],
  ),
};

// ───────────────────────── تحضير الحاج ─────────────────────────

const PREPARATION: Record<string, FieldsEn> = {
  "preparation/health-check": lesson(
    "Check-ups and Vaccinations Before Travel",
    [
      "At least a month before travelling, see your doctor for a general check-up covering blood pressure, blood sugar, heart and kidneys, and get a short medical report on your condition and medicines.",
      "The quadrivalent meningitis vaccine is compulsory for all pilgrims and must be given at least ten days before travel. The seasonal flu vaccine is recommended, and other vaccines follow the health instructions approved for the season.",
      "Elderly pilgrims and those with chronic illnesses need a special assessment of how far they can walk and how much they can exert themselves, so the doctor can choose the right programme for them and they can be registered in the special-care category on the platform.",
    ],
    [
      "A general check-up at least a month before travel",
      "Meningitis vaccine compulsory, 10 days before travel",
      "Flu vaccine recommended",
      "A short medical report to carry with you",
    ],
    [
      [
        "Where can I get the meningitis vaccine?",
        "At approved health centres in every governorate. Their times appear on the «Preparation checklist» page after you are accepted.",
      ],
      [
        "Can a pregnant woman perform Hajj?",
        "Travel is not advised in the final months of pregnancy; the decision rests with her specialist doctor, depending on the pregnancy.",
      ],
    ],
    ["Vaccinations", "Meningitis", "Medical check-up", "Medical report"],
  ),
  "preparation/medicines": lesson(
    "Medicines for Chronic Illness and How to Carry Them",
    [
      "Take enough of your medicines for the whole journey plus an extra week in reserve, in their original packs with a stamped prescription.",
      "Keep medicines in your hand luggage, not in the large suitcase. Insulin goes in a small cool bag and must not be put in the freezer.",
      "Write down the names and doses of your medicines on paper or in your health file in the app, and set phone alarms for them, because the time difference and tiredness make it easy to forget.",
    ],
    [
      "Enough for the trip plus a week in reserve",
      "Original packs with a stamped prescription",
      "Medicines in your hand luggage",
      "A cool bag for insulin",
      "Alarms for dose times",
    ],
    [
      [
        "Are some medicines banned in Saudi Arabia?",
        "Some sedatives and strong painkillers need an official translated prescription, so check the list of restricted medicines on the instructions page before you travel.",
      ],
      [
        "My medicine ran out in Makkah. What should I do?",
        "Go to the Syrian medical mission's clinic, or request help in the app and the medical team will contact you.",
      ],
    ],
    ["Medicines", "Insulin", "Chronic illness", "Prescription"],
  ),
  "preparation/hajj-bag": lesson(
    "The Pilgrim's Bag: What to Pack",
    [
      "Take two bags: a large one for the hotel and a small backpack for the holy sites. Travelling light in Mina, Arafah and Muzdalifah makes things much easier.",
      "In the small bag: spare Ihram clothes, an umbrella, a water bottle, the day's medicines, a power bank, face masks, unscented wet wipes, a small pouch for pebbles, and comfortable sandals.",
      "Keep important documents in a small neck wallet, with photos of them on your phone. The digital card in the app works without an internet connection.",
    ],
    [
      "A large bag for the hotel, a small one for the holy sites",
      "Umbrella, water, power bank and unscented wipes",
      "Spare Ihram clothes and comfortable sandals",
      "Documents in a neck wallet",
    ],
    [
      [
        "What is the baggage allowance?",
        "The airline sets it, and it appears on your boarding pass in the app — usually two bags with a total of 46 kg, plus 7 kg of hand luggage.",
      ],
      ["Can I bring food from Syria?", "Packaged dry food in personal quantities is allowed; fresh food and meat are not."],
    ],
    ["Pilgrim's bag", "What to pack", "Preparation", "Documents"],
  ),
  "preparation/special-needs": lesson(
    "Elderly Pilgrims and Pilgrims with Special Needs",
    [
      "The mission offers special services for elderly pilgrims and those with special needs: front seats on buses, rooms near the lifts, scout volunteers to accompany them, and wheelchairs when needed.",
      "Ideally an elderly pilgrim travels with a family member who knows their medicines and condition, and makes use of the concessions in Islamic law: appointing someone to stone on their behalf, leaving Muzdalifah after midnight, and performing Tawaf in a wheelchair.",
      "Pilgrims record their needs on the platform when they apply. The group leader and the medical team can then see them, and they are taken into account in housing and movement schedules.",
    ],
    [
      "Front seats and rooms near the lifts",
      "A family companion who knows the medicines",
      "Make use of the concessions in Islamic law",
      "Record your needs on the platform in advance",
    ],
    [
      ["Can I book a wheelchair at the airport?", "Yes. Request it from the flight page in the app at least three days before travel."],
      [
        "My father uses an oxygen machine. Is it allowed on the plane?",
        "It needs prior medical approval from the airline, and the medical team will help you prepare the form.",
      ],
    ],
    ["Elderly pilgrims", "Special needs", "Wheelchair", "Concessions"],
  ),
  "preparation/heat-safety": lesson(
    "Preventing Heatstroke and Heat Exhaustion",
    [
      "Temperatures at the holy sites sometimes go above 45 degrees, so drink water regularly before you feel thirsty, use an umbrella, and avoid walking in the sun from midday until Asr.",
      "Signs of heatstroke: a very high body temperature, dry skin, dizziness and confused speech. Move the person into the shade at once, cool their body with water, and call an ambulance on 997.",
      "Heat exhaustion is milder; its signs include heavy sweating, headache and nausea. It is treated by resting somewhere cool and drinking water and other fluids.",
    ],
    [
      "Drink water before you feel thirsty",
      "Use an umbrella; avoid the sun from midday to Asr",
      "Heatstroke: high temperature, dry skin, confusion",
      "Ambulance in Saudi Arabia: 997",
    ],
    [
      ["Can I pour water over my head while in Ihram?", "Yes. It is allowed, breaks no rule of Ihram, and helps you cool down."],
      [
        "Should a diabetic pilgrim fast on the Day of Arafah?",
        "Fasting on the Day of Arafah is not recommended for pilgrims in the first place, and a diabetic has even more reason not to fast, to avoid low blood sugar.",
      ],
    ],
    ["Heatstroke", "Heat", "Heat exhaustion", "Ambulance"],
  ),
  "preparation/using-app": lesson(
    "Using the Platform App on Your Journey",
    [
      "The platform app is the pilgrim's companion on the journey: it holds the digital card with its QR code, the movement schedule, the location of the camp and the hotel, and the group channel where the administrator and the religious guide post announcements.",
      "The «I'm lost» button sends the pilgrim's location to the group leader, and the «Request medical help» button reaches the medical team together with the short health file.",
      "The digital card, the duas and the rites guide work in the app without internet, and enlarging the text in the accessibility settings is recommended for elderly pilgrims.",
    ],
    [
      "The digital card with a QR code",
      "The group channel and the movement schedule",
      "The «I'm lost» and medical help buttons",
      "The essentials work offline",
    ],
    [
      [
        "I forgot my password in Makkah. How do I sign in?",
        "Use «Forgot password» and a code will be sent to your Syrian number or your email, or ask your group administrator for help.",
      ],
      ["Can my son in Damascus follow my location?", "Yes, if you turn on «Share location with emergency contact» in the settings."],
    ],
    ["The app", "Digital card", "I'm lost", "Group channel"],
  ),
};

export const ACADEMY_EN_B: CollectionsEn = {
  academyTracks: {},
  academyLessons: { ...UMRAH, ...ETHICS, ...MADINAH, ...DUAS, ...PREPARATION },
};
