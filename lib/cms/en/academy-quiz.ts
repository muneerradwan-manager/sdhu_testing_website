/**
 * The academy's texts that live only in code (lib/data/academy.ts), so the CMS English layer cannot reach them.
 * The academy's pages (app/academy/_components/i18n.ts) read them when the page is English, and the Arabic data
 * otherwise: the lecturers' roles and bios (their names stay Arabic), the level quizzes of all six tracks, and the
 * short clips shown in the academy search.
 */

/** The lecturers' roles and bios in English; their names and initials stay Arabic */
export const LECTURERS_EN: Record<string, { role: string; bio: string }> = {
  abdulrahman: {
    role: "Professor of Comparative Fiqh",
    bio: "He has guided caravans of Syrian pilgrims for twenty years and explains the rulings of the rites in a simple, approachable way.",
  },
  khaled: {
    role: "Religious guide with the mission",
    bio: "He accompanies pilgrim groups during the season and builds on the academy's lessons with on-site lessons in Makkah and the holy sites.",
  },
  huda: {
    role: "Specialist in women's rulings in the rites",
    bio: "She has answered women pilgrims' questions for more than fifteen seasons and gives practical lessons for women and older ladies.",
  },
  nour: {
    role: "Researcher in the Prophet's biography",
    bio: "He introduces pilgrims to the landmarks of Madinah and the events of the Seerah linked to each place.",
  },
  ahmad: {
    role: "Preacher and educational guide",
    bio: "His lessons focus on the pilgrim's character, patience, and serving companions and the elderly.",
  },
  samer: {
    role: "Emergency doctor with the medical mission",
    bio: "He gives pilgrims practical health advice before travel and during the rites, especially those with chronic illnesses.",
  },
  reem: {
    role: "Platform support team",
    bio: "She explains the app's services step by step: the digital card, the group channel and asking for help.",
  },
};

type QuizEn = { q: string; options: string[]; explain: string };

/**
 * The level quizzes of every track in English, keyed by the Arabic question (lib/data/academy.ts, QUIZ).
 * Options keep the same order, so the correct answer stays at the same index.
 */
export const QUIZZES_EN: Record<string, QuizEn> = {
  // hajj-fiqh, level 1
  "كم مرة يجب الحج على المسلم المستطيع؟": {
    q: "How many times is Hajj obligatory on a Muslim who is able?",
    options: ["Once in a lifetime", "Every five years", "Twice in a lifetime", "Every year"],
    explain: "Hajj is obligatory once in a lifetime; anything more is voluntary.",
  },
  "أي النسك يجب فيه الهدي؟": {
    q: "In which type of Hajj is a Hady obligatory?",
    options: ["Ifrad only", "Tamattu' and Qiran", "Qiran only", "None of them"],
    explain: "The Hady is obligatory for Tamattu' and Qiran, not for Ifrad.",
  },
  "ما الذي يحرم على المرأة المحرمة؟": {
    q: "What is forbidden to a woman in Ihram?",
    options: ["Covering her head", "Wearing socks", "The niqab and gloves", "Wearing coloured clothes"],
    explain: "A woman covers her head; what is forbidden to her is the niqab and gloves.",
  },
  "ما ميقات أهل الشام؟": {
    q: "What is the Miqat for the people of al-Sham?",
    options: ["Dhu al-Hulayfah", "Yalamlam", "Qarn al-Manazil", "Al-Juhfah (Rabigh today)"],
    explain: "Al-Juhfah is the Miqat of the people of al-Sham; today people enter Ihram at Rabigh.",
  },
  "من تطيّب ناسياً بعد الإحرام، فما حكمه؟": {
    q: "What is the ruling for someone who used perfume in Ihram because he forgot?",
    options: ["He must sacrifice a sheep", "He removes the perfume and owes nothing", "His Ihram is void", "He fasts ten days"],
    explain: "No sin on someone who forgets; he removes the perfume as soon as he remembers.",
  },
  // hajj-fiqh, level 2
  "ما حكم طواف الإفاضة؟": {
    q: "What is the ruling on Tawaf al-Ifadah?",
    options: ["A Sunnah", "An obligation made up with a sacrifice", "A pillar without which Hajj is not valid", "Recommended"],
    explain: "Tawaf al-Ifadah is one of the pillars of Hajj.",
  },
  "من أين يبدأ الطواف؟": {
    q: "Where does Tawaf start?",
    options: ["At the door of the Kaaba", "At the Black Stone", "At the Yemeni Corner", "At the Station of Ibrahim"],
    explain: "Tawaf starts and ends at the Black Stone.",
  },
  "ماذا يقول الطائف بين الركن اليماني والحجر الأسود؟": {
    q: "What does the pilgrim say between the Yemeni Corner and the Black Stone?",
    options: ["سبحان الله وبحمده", "ربنا آتنا في الدنيا حسنة وفي الآخرة حسنة وقنا عذاب النار", "لبيك اللهم لبيك", "Nothing"],
    explain: "This dua is authentically reported from the Prophet ﷺ between the two corners.",
  },
  "بماذا ينتهي السعي؟": {
    q: "Where does Sa'i end?",
    options: ["At Safa", "At Marwah", "At the two green markers", "At the Black Stone"],
    explain: "Sa'i starts at Safa and ends at Marwah.",
  },
  "كم تقص المرأة من شعرها في التحلل؟": {
    q: "How much of her hair does a woman cut to leave Ihram?",
    options: ["Half her hair", "Nothing", "A fingertip's length from the ends", "She shaves like a man"],
    explain: "A woman cuts a fingertip's length from the ends of her hair.",
  },
  // hajj-fiqh, level 3
  "ما الركن الأعظم في الحج؟": {
    q: "What is the greatest pillar of Hajj?",
    options: ["The night in Mina", "Standing at Arafah", "Stoning the Jamarat", "The Farewell Tawaf"],
    explain: "The Prophet ﷺ said: \"Hajj is Arafah.\"",
  },
  "متى يبدأ وقت الوقوف بعرفة؟": {
    q: "When does the time for standing at Arafah begin?",
    options: ["Dawn on the 9th", "Midday on the 9th", "Sunset on the 8th", "Afternoon (Asr) on the 9th"],
    explain: "According to most scholars, the standing begins at midday on the 9th.",
  },
  "ما الجمرة التي تُرمى يوم النحر؟": {
    q: "Which Jamrah is stoned on the Day of Sacrifice?",
    options: ["The small one", "The middle one", "All three", "Jamrat al-Aqabah only"],
    explain: "On the Day of Sacrifice only Jamrat al-Aqabah is stoned.",
  },
  "متى يجوز للضعفاء الدفع من مزدلفة؟": {
    q: "When may the weak leave Muzdalifah?",
    options: ["Straight after Maghrib", "After midnight", "Not before Dhuhr", "Before the Isha prayer"],
    explain: "The Prophet ﷺ allowed the weak to leave after midnight.",
  },
  "من يسقط عنه طواف الوداع؟": {
    q: "For whom is the Farewell Tawaf lifted?",
    options: ["The elderly", "Women who are menstruating or in post-natal bleeding", "Those who leave early on the 12th", "Pilgrims doing Tamattu'"],
    explain: "The Farewell Tawaf was lightened for women who are menstruating or in post-natal bleeding.",
  },
  // umrah-fiqh, level 1
  "كم ركناً للعمرة عند الجمهور؟": {
    q: "How many pillars does Umrah have, according to most scholars?",
    options: ["Two", "Three", "Four", "Five"],
    explain: "Ihram, Tawaf and Sa'i.",
  },
  "ما حكم الحلق أو التقصير في العمرة؟": {
    q: "What is the ruling on shaving or trimming in Umrah?",
    options: ["A pillar", "An obligation", "A Sunnah", "Permissible"],
    explain: "Shaving or trimming is one of the obligations of Umrah.",
  },
  "من أين يُحرم المقيم في مكة للعمرة؟": {
    q: "Where does someone staying in Makkah enter Ihram for Umrah?",
    options: ["From his hotel", "From outside the Haram, such as al-Tan'im", "From Masjid al-Haram", "From Jeddah"],
    explain: "He goes outside the Haram, to al-Tan'im or al-Ji'ranah.",
  },
  "عمرة رمضان تعدل:": {
    q: "An Umrah in Ramadan is equal to:",
    options: ["A Hajj in reward", "The obligatory Hajj", "Two Umrahs", "It has no special virtue"],
    explain: "It equals a Hajj in reward, but it does not replace the obligatory Hajj.",
  },
  "ما جزاء ترك واجب من واجبات العمرة؟": {
    q: "What is due for leaving out an obligation of Umrah?",
    options: ["The Umrah is void", "A sacrifice in the Haram", "Fasting one day", "Nothing"],
    explain: "A missed obligation is made up with a sacrifice.",
  },
  // umrah-fiqh, level 2
  "ما الترتيب الصحيح لأعمال العمرة؟": {
    q: "What is the correct order of the acts of Umrah?",
    options: ["Sa'i, then Tawaf, then Ihram", "Ihram, then Tawaf, then Sa'i, then trimming", "Tawaf, then Ihram, then Sa'i", "Ihram, then Sa'i, then Tawaf"],
    explain: "Ihram, Tawaf, Sa'i, then shaving or trimming.",
  },
  "متى يقطع المعتمر التلبية؟": {
    q: "When does a pilgrim on Umrah stop the Talbiyah?",
    options: ["At the Miqat", "When he starts Tawaf", "After Sa'i", "When he first sees the Kaaba from afar"],
    explain: "The pilgrim on Umrah stops the Talbiyah when he starts Tawaf.",
  },
  "وصل مسافر جدة بالطائرة دون إحرام وقد مرّ بالميقات، ما الأفضل؟": {
    q: "A traveller reached Jeddah by plane without Ihram, having passed the Miqat. What is best?",
    options: ["Enter Ihram in Jeddah; nothing is due", "Go back to the Miqat if possible", "Enter Ihram at the hotel", "No Ihram is needed"],
    explain: "He goes back to the Miqat, if possible, to enter Ihram there.",
  },
  "هل تجب الطهارة للسعي؟": {
    q: "Is ritual purity required for Sa'i?",
    options: ["Yes, it is a condition", "Recommended, not a condition", "Forbidden", "Required for men only"],
    explain: "Ritual purity for Sa'i is recommended.",
  },
  "العمرة عن الغير تصح بشرط:": {
    q: "Umrah on behalf of someone else is valid on condition that:",
    options: ["The pilgrim has already done Umrah for himself", "The person is a relative", "It is in Ramadan", "There is no condition"],
    explain: "According to the sound view, he does his own Umrah first.",
  },
  // journey-ethics, level 1
  "أي هذه منهي عنه في الحج صراحة في القرآن؟": {
    q: "Which of these does the Quran explicitly forbid during Hajj?",
    options: ["Arguing", "Sleeping", "Buying", "Cooking"],
    explain: "«فلا رفث ولا فسوق ولا جدال في الحج» (no obscenity, no wrongdoing and no arguing during Hajj).",
  },
  "ماذا تفعل عند الزحام الشديد؟": {
    q: "What should you do in a very heavy crowd?",
    options: ["Walk against the flow", "Push the people in front of you", "Move calmly with the flow of people", "Sit down in the walkway"],
    explain: "Moving calmly with the crowd is safest.",
  },
  "خير الأصحاب عند الله:": {
    q: "The best of companions in the sight of God are:",
    options: ["The richest", "The best to their companion", "The oldest", "The most talkative"],
    explain: "The hadith says: \"The best of companions in the sight of God is the one who is best to his companion.\"",
  },
  "تهت عن المجموعة، ما أول خطوة؟": {
    q: "You got separated from your group. What is the first step?",
    options: ["Walk back to the hotel", "Press the «I'm lost» button in the app", "Wait until the next day", "Switch off your phone"],
    explain: "The «I'm lost» button sends your location to your group leader.",
  },
  "من علامات الحج المبرور:": {
    q: "One sign of an accepted Hajj is:",
    options: ["Taking many photos", "Good character after returning", "Buying gifts", "A long stay"],
    explain: "The pilgrim comes back with better character than before.",
  },
  // journey-ethics, level 2
  "ما الأدب عند مساعدة ذوي الاحتياجات؟": {
    q: "What is the right manner when helping people with special needs?",
    options: ["Help without asking", "Ask them before helping", "Ignore them", "Take photos of them"],
    explain: "Ask before you help, and respect their privacy.",
  },
  "كيف يرمي الوكيل عن كبير السن؟": {
    q: "How does someone stone on behalf of an elderly pilgrim?",
    options: ["For the elderly pilgrim first", "For himself first, then for the elderly pilgrim", "Seven pebbles for both together", "Stoning on someone's behalf is not allowed"],
    explain: "He stones for himself, then for the person he represents.",
  },
  "ما حكم الطبخ داخل خيام منى؟": {
    q: "Is cooking allowed inside the tents of Mina?",
    options: ["Allowed", "Forbidden because of the fire risk", "Allowed at night", "Recommended"],
    explain: "Cooking in the tents is forbidden, to protect lives.",
  },
  "المحافظة على نظافة المشاعر من:": {
    q: "Keeping the holy sites clean is part of:",
    options: ["Honouring the symbols of God", "Minor matters", "The cleaners' job only", "It has nothing to do with Hajj"],
    explain: "Cleanliness is part of honouring the symbols of God.",
  },
  "الالتزام بتصريح الحج:": {
    q: "Keeping to the Hajj permit is:",
    options: ["Not important", "An obligation, to protect lives and obey the rules", "For foreigners only", "Only after Hajj"],
    explain: "Keeping to the permits is an obligation for the public good.",
  },
  // madinah, level 1
  "هل زيارة المدينة من مناسك الحج؟": {
    q: "Is visiting Madinah one of the rites of Hajj?",
    options: ["Yes, a pillar", "Yes, an obligation", "No, it is a separate Sunnah", "A condition for a valid Hajj"],
    explain: "The visit is a separate Sunnah; the validity of Hajj does not depend on it.",
  },
  "الصلاة في المسجد النبوي خير من:": {
    q: "A prayer in the Prophet's Mosque is better than:",
    options: ["A hundred prayers", "A thousand prayers elsewhere, except Masjid al-Haram", "Ten prayers", "A hundred thousand prayers"],
    explain: "As stated in the authentic hadith.",
  },
  "أين تقع الروضة الشريفة؟": {
    q: "Where is the Rawdah?",
    options: ["Between the pulpit and the Prophet's chamber", "In Quba", "By al-Baqi'", "In the mosque's courtyard"],
    explain: "\"What lies between my house and my pulpit is one of the gardens of Paradise.\"",
  },
  "كيف يدعو الزائر لنفسه عند القبر الشريف؟": {
    q: "How does the visitor make dua for himself at the Prophet's grave?",
    options: ["Facing the grave", "Facing the qiblah", "Touching the chamber", "In a loud voice"],
    explain: "He faces the qiblah when making dua.",
  },
  "من يسلّم عليه الزائر بعد النبي ﷺ؟": {
    q: "Whom does the visitor greet after the Prophet ﷺ?",
    options: ["Umar, then Abu Bakr", "Abu Bakr, then Umar", "Uthman, then Ali", "No one"],
    explain: "He greets Abu Bakr, then Umar (may God be pleased with them).",
  },
  // madinah, level 2
  "الصلاة في مسجد قباء أجرها:": {
    q: "The reward of praying in Quba Mosque is:",
    options: ["Like the reward of a Hajj", "Like the reward of an Umrah", "Like a prayer in Masjid al-Haram", "It has no special virtue"],
    explain: "\"He has the reward of an Umrah.\"",
  },
  "ما أول مسجد بُني في الإسلام؟": {
    q: "What was the first mosque built in Islam?",
    options: ["The Prophet's Mosque", "Quba Mosque", "Masjid al-Qiblatayn", "Al-Aqsa Mosque"],
    explain: "The Prophet ﷺ founded it when he arrived as an emigrant.",
  },
  "في أي سنة كانت غزوة أحد؟": {
    q: "In which year was the Battle of Uhud?",
    options: ["The first year after the Hijrah", "The second", "The third", "The fifth"],
    explain: "It took place in the third year after the Hijrah.",
  },
  "من شهداء أحد:": {
    q: "Among the martyrs of Uhud was:",
    options: ["Hamzah ibn Abd al-Muttalib", "Abu Bakr al-Siddiq", "Khalid ibn al-Walid", "Umar ibn al-Khattab"],
    explain: "Hamzah, the Prophet's ﷺ uncle, was martyred at Uhud.",
  },
  "ما الدرس الأبرز من قصة الرماة في أحد؟": {
    q: "What is the main lesson from the story of the archers at Uhud?",
    options: ["The importance of obeying orders", "Large numbers", "Retreating quickly", "Collecting the spoils"],
    explain: "The archers' disobedience changed the course of the battle.",
  },
  // duas, level 1
  "ما لفظ التلبية الصحيح؟": {
    q: "What are the correct words of the Talbiyah?",
    options: ["لبيك اللهم لبيك، لبيك لا شريك لك لبيك، إن الحمد والنعمة لك والملك، لا شريك لك", "الله أكبر ولله الحمد", "سبحان الله والحمد لله", "لا حول ولا قوة إلا بالله"],
    explain: "These are the words of the Prophet's ﷺ Talbiyah.",
  },
  "ماذا يقول عند استلام الحجر الأسود؟": {
    q: "What does the pilgrim say when touching the Black Stone?",
    options: ["سبحان الله", "بسم الله، والله أكبر", "لبيك عمرة", "الحمد لله"],
    explain: "«بسم الله، والله أكبر» (In the name of God, God is the Greatest).",
  },
  "ماذا يقرأ في ركعتي الطواف؟": {
    q: "What does the pilgrim recite in the two rak'ahs after Tawaf?",
    options: ["Al-Fatihah only", "Al-Kafirun, then Al-Ikhlas", "Ya-Sin and Al-Mulk", "Al-Baqarah"],
    explain: "After Al-Fatihah, he recites Al-Kafirun in the first rak'ah and Al-Ikhlas in the second.",
  },
  "«ماء زمزم ...»": {
    q: "Complete the hadith: «ماء زمزم ...» (Zamzam water is ...)",
    options: ["for whatever it is drunk for", "for healing only", "for wudu", "for bathing"],
    explain: "«ماء زمزم لما شُرب له» (Zamzam water is for whatever it is drunk for).",
  },
  "هل لكل شوط من الطواف دعاء مخصوص؟": {
    q: "Does each circuit of Tawaf have its own dua?",
    options: ["Yes, seven fixed duas", "No, he makes any dua he wishes", "Only one circuit", "The first three circuits"],
    explain: "No specific dua is authentically reported for each circuit.",
  },
  // duas, level 2
  "خير الدعاء دعاء:": {
    q: "The best dua is the dua of:",
    options: ["The Day of Tarwiyah", "The Day of Arafah", "The Day of Sacrifice", "The night in Muzdalifah"],
    explain: "\"The best dua is the dua of the Day of Arafah.\"",
  },
  "ماذا يقول عند ذبح الهدي؟": {
    q: "What does the pilgrim say when sacrificing the Hady?",
    options: ["بسم الله، والله أكبر، اللهم هذا منك ولك", "سبحان الله", "لبيك حجاً", "Nothing"],
    explain: "As authentically reported from the Prophet ﷺ.",
  },
  "بعد أي جمرة لا يقف الحاج للدعاء؟": {
    q: "After which Jamrah does the pilgrim not stop to make dua?",
    options: ["The small one", "The middle one", "Jamrat al-Aqabah", "After all three"],
    explain: "He stones Jamrat al-Aqabah and moves on without stopping.",
  },
  "ماذا يقول المتمتع عند الإحرام يوم التروية؟": {
    q: "What does the Tamattu' pilgrim say when entering Ihram on the Day of Tarwiyah?",
    options: ["لبيك عمرة", "لبيك حجاً", "لبيك عمرة وحجاً", "Nothing"],
    explain: "He enters Ihram for Hajj and says: «لبيك حجاً» (Here I am for Hajj).",
  },
  "أيام التشريق هي أيام:": {
    q: "The Days of Tashriq are days of:",
    options: ["Fasting", "Eating, drinking and remembering God", "Travel", "Night prayer only"],
    explain: "As the Prophet ﷺ said.",
  },
  // preparation, level 1
  "ما اللقاح الإلزامي لجميع الحجاج؟": {
    q: "Which vaccine is compulsory for all pilgrims?",
    options: ["Measles", "Quadrivalent meningitis", "Cholera", "Typhoid"],
    explain: "The meningitis vaccine is compulsory at least ten days before travel.",
  },
  "أين توضع الأدوية أثناء السفر؟": {
    q: "Where should medicines go when you travel?",
    options: ["In the large suitcase", "In your hand luggage", "Shipped separately", "Bought in Makkah"],
    explain: "In your hand luggage, so they stay close to you.",
  },
  "كيف يُحفظ الإنسولين؟": {
    q: "How should insulin be kept?",
    options: ["In the sun", "In a cool bag", "In the freezer", "In the large suitcase"],
    explain: "A small cool bag, without freezing it.",
  },
  "كمية الدواء المناسبة للرحلة:": {
    q: "How much medicine should you take for the trip?",
    options: ["Enough for one week", "Enough for the trip plus a spare week", "One box", "No need to take any"],
    explain: "The length of the trip plus a week in reserve.",
  },
  "ماذا تحمل في حقيبة المشاعر الصغيرة؟": {
    q: "What do you carry in your small bag for the holy sites?",
    options: ["Lots of clothes", "An umbrella, water and the day's medicines", "Gifts", "Cooked food"],
    explain: "Travel light at the holy sites.",
  },
  // preparation, level 2
  "ما رقم الإسعاف في السعودية؟": {
    q: "What is the ambulance number in Saudi Arabia?",
    options: ["112", "997", "911", "110"],
    explain: "The ambulance number is 997.",
  },
  "من علامات ضربة الشمس:": {
    q: "One sign of heatstroke is:",
    options: ["Dry skin, very high temperature and confusion", "Cold hands and feet", "Increased appetite", "Only mild drowsiness"],
    explain: "Heatstroke is an emergency that needs first aid.",
  },
  "متى يشرب الحاج الماء؟": {
    q: "When should a pilgrim drink water?",
    options: ["Only when very thirsty", "Regularly, before feeling thirsty", "After Maghrib", "Once a day"],
    explain: "Drinking regularly prevents dehydration.",
  },
  "ماذا يفعل زر «أنا تائه»؟": {
    q: "What does the «I'm lost» button do?",
    options: ["Calls the police", "Sends your location to your group leader", "Closes the app", "Books a hotel"],
    explain: "Your location reaches your group leader.",
  },
  "متى يُطلب الكرسي المتحرك للمطار؟": {
    q: "When should you request a wheelchair for the airport?",
    options: ["At the airport itself", "At least three days before travel", "After arrival", "It cannot be requested"],
    explain: "From the trip page, at least three days in advance.",
  },
};

/** The short clips in English (lib/data/academy.ts, CLIPS), by slug */
export const CLIPS_EN: Record<string, { title: string; tags: string[] }> = {
  "clip-women-head": { title: "Does a woman cover her head in Ihram?", tags: ["Head covering for women", "Ihram", "Hijab"] },
  "clip-niqab": { title: "Niqab and gloves in Ihram: what instead?", tags: ["Women's head covering in Ihram", "Niqab", "Lowering a veil"] },
  "clip-plane-ihram": { title: "How do I enter Ihram on the plane?", tags: ["Miqat", "Plane"] },
  "clip-talbiyah": { title: "The correct Talbiyah, recited by the sheikh", tags: ["Talbiyah"] },
  "clip-black-stone": { title: "Where do I start Tawaf?", tags: ["The Black Stone", "Tawaf"] },
  "clip-raml": { title: "Idtiba' and Raml in one minute", tags: ["Idtiba'", "Raml", "Tawaf"] },
  "clip-arafah-time": { title: "When does the time for standing at Arafah end?", tags: ["Arafah", "Time of the standing"] },
  "clip-proxy-stoning": { title: "Stoning the Jamarat for the elderly, step by step", tags: ["Stoning on someone's behalf", "Elderly", "Jamarat"] },
  "clip-heatstroke": { title: "Signs of heatstroke", tags: ["Heatstroke", "Heat"] },
  "clip-lost": { title: "I've lost my group. What do I do?", tags: ["I'm lost", "The app"] },
};
