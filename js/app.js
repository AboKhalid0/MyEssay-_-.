/* ═══════════════════════════════════════════════════════════════
   js/app.js  —  الكاروتا العربية
   All logic in one file, split into clearly labelled sections.
   Use Ctrl+F on the section headers to jump to what you need.

   SECTIONS:
     §CONFIG        Firebase config, deck poems, constants
     §STATE         Shared runtime state (window.G)
     §UTILS         Helper functions
     §AUTH          Login / register / logout
     §PROFILE       Profile, avatar, photo upload
     §FRIENDS       Friends list, search, invites
     §MATCHMAKING   Random opponent queue
     §LOBBY         Room create / join / lobby render
     §GAME          Intro, game, result, solo
     §CARDS BROWSER Cards library browser page
     §DECK SELECT   Deck + card-count picker
     §ADMIN         Admin panel
     §MAIN          Firebase init, auth observer, button wiring
═══════════════════════════════════════════════════════════════ */


/* ═══════════════════════════════════════
   §CONFIG
═══════════════════════════════════════ */

const FIREBASE_CONFIG = {
  apiKey: "AIzaSyC5sN98KTmy2jLtR2or5HRu5UkHR5r-g-8",
  authDomain: "karuta-e5189.firebaseapp.com",
  databaseURL: "https://karuta-e5189-default-rtdb.firebaseio.com",
  projectId: "karuta-e5189",
  storageBucket: "karuta-e5189.firebasestorage.app",
  messagingSenderId: "870704783004",
  appId: "1:870704783004:web:6e213d8df43a046b7fd759",
};

// ← Set this to your email — that account becomes admin automatically on register
const ADMIN_EMAIL = "your-admin-email@example.com";

const AVATARS     = ['🦁','🐪','🦅','🌙','⭐','🏺','🌊','🌴','🐴','🦊','🌹','🎭','🦋','🌺','🏵️','🌟'];
const ARABIC_NUMS = ['١','٢','٣','٤'];

/* ── DECKS ──────────────────────────────────────────────────────
   Add new decks here. Each deck needs:
     id, name, nameEn, desc, color, icon, introAudio[], poems[]
   Each poem: poet, read (first hemistich), card (second hemistich), audio
──────────────────────────────────────────────────────────────── */
const DECKS = [

  /* 1 ── المعلقات */
  {
    id:'muallaqat', name:'مختارات', nameEn:'',
    desc:'قصائد مختارة',
    color:'#2d5a27', icon:'',
    introAudio:['audio/intro-1.mp3','audio/intro-2.mp3','audio/intro-3.mp3','audio/intro-4.mp3'],
    poems:[
  {poet:"",      read:"القارئ يقرأ الشطر",       card:"بِسِقطِ اللِّوى بَينَ الدَّخولِ فَحَومَلِ",       audio:"audio/poem-01.mp3"},
  {poet:"",      read:"القارئ يقرأ الشطر",    card:"بِصُبحٍ وَما الإِصباحُ مِنكَ بِأَمثَلِ",         audio:"audio/poem-02.mp3"},
  {poet:"",      read:"القارئ يقرأ الشطر",         card:"كَجُلمودِ صَخرٍ حَطَّهُ السَّيلُ مِن عَلِ",      audio:"audio/poem-03.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",       card:"وَيَأتيكَ بِالأَخبارِ مَن لَم تُزَوِّدِ",         audio:"audio/poem-04.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",     card:"لَكَالطِّوَلِ المُرخى وَثِنياهُ باليَدِ",         audio:"audio/poem-05.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",        card:"ثَمانينَ حَولاً لا أَبا لَكَ يَسأَمِ",            audio:"audio/poem-06.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",       card:"وَكُلُّ نَعيمٍ لا مَحالَةَ زائِلُ",               audio:"audio/poem-07.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",     card:"يَحورُ رَماداً بَعدَ إِذ هُوَ ساطِعُ",            audio:"audio/poem-08.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",          card:"عَصافيرُ مِن هَذا الأَنامِ المُسَرَّحِ",          audio:"audio/poem-09.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",        card:"أَم هَل عَرَفتَ الدارَ بَعدَ تَوَهُّمِ",          audio:"audio/poem-10.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",           card:"وَعِمي صَباحاً دارَ عَبلَةَ وَاسلَمي",            audio:"audio/poem-11.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",        card:"مِنّي وَبيضُ الهِندِ تَقطُرُ مِن دَمي",           audio:"audio/poem-12.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",          card:"صوالج صدغيها بتفاح خدها",          audio:"audio/poem-13.mp3"},
  {poet:"",   read:"القارئ يقرأ الشطر",               card:"فَنَجهَلَ فَوقَ جَهلِ الجاهِلينا",                audio:"audio/poem-14.mp3"},
    ],
  },

  /* 2 ── الشعر العباسي */
  {
    id:'abbasid', name:'الشعر العباسي', nameEn:'',
    desc:'روائع المتنبي وأبي تمام والبحتري وفحول الشعر العباسي',
    color:'#1a3a6b', icon:'',
    introAudio:['audio/abbasid/intro-1.mp3'],
    poems:[
      {poet:"المتنبي", read:"عَلى قَدرِ أَهلِ العَزمِ تَأتي العَزائِمُ",    card:"وَتَأتي عَلى قَدرِ الكِرامِ المَكارِمُ",      audio:"audio/abbasid/poem-01.mp3"},
      {poet:"المتنبي", read:"الخَيلُ وَاللَّيلُ وَالبَيداءُ تَعرِفُني",     card:"وَالسَّيفُ وَالرُّمحُ وَالقِرطاسُ وَالقَلَمُ",audio:"audio/abbasid/poem-02.mp3"},
      {poet:"المتنبي", read:"أَنا الَّذي نَظَرَ الأَعمى إِلى أَدَبي",       card:"وَأَسمَعَت كَلِماتي مَن بِهِ صَمَمُ",         audio:"audio/abbasid/poem-03.mp3"},
      {poet:"المتنبي", read:"إِذا أَنتَ أَكرَمتَ الكَريمَ مَلَكتَهُ",       card:"وَإِن أَنتَ أَكرَمتَ اللَّئيمَ تَمَرَّدا",    audio:"audio/abbasid/poem-04.mp3"},
      {poet:"المتنبي", read:"وَمَن يَكُ ذا فَمٍ مُرٍّ مَريضٍ",             card:"يَجِد مُرّاً بِهِ الماءَ الزُّلالا",          audio:"audio/abbasid/poem-05.mp3"},
      {poet:"المتنبي", read:"فَإِن تَفُق الأَنامَ وَأَنتَ مِنهُم",          card:"فَإِنَّ المِسكَ بَعضُ دَمِ الغَزالِ",         audio:"audio/abbasid/poem-06.mp3"},
      {poet:"المتنبي", read:"عَيدٌ بِأَيَّةِ حالٍ عُدتَ يا عيدُ",           card:"بِما مَضى أَم بِأَمرٍ فيكَ تَجديدُ",         audio:"audio/abbasid/poem-07.mp3"},
      {poet:"المتنبي", read:"لَيسَ التَّعَزّي بِأَن تُعزّى وَتُصبَرا",      card:"لَكِنَّهُ أَن تَرى المَصابَ فَتَصبِرا",       audio:"audio/abbasid/poem-08.mp3"},
      {poet:"أبو تمام", read:"السَّيفُ أَصدَقُ أَنباءً مِنَ الكُتُبِ",      card:"في حَدِّهِ الحَدُّ بَينَ الجِدِّ وَاللَّعِبِ",audio:"audio/abbasid/poem-09.mp3"},
      {poet:"أبو تمام", read:"لا تَنهَ عَن خُلُقٍ وَتَأتيَ مِثلَهُ",        card:"عارٌ عَلَيكَ إِذا فَعَلتَ عَظيمُ",           audio:"audio/abbasid/poem-10.mp3"},
      {poet:"البحتري",  read:"صُنتُ نَفسي عَمّا يُدَنِّسُ نَفسي",           card:"وَتَرَفَّعتُ عَن جَدا كُلِّ جِبسِ",           audio:"audio/abbasid/poem-11.mp3"},
      {poet:"البحتري",  read:"وَإِذا كانَت النُّفوسُ كِباراً",               card:"تَعِبَت في مُرادِها الأَجسامُ",               audio:"audio/abbasid/poem-12.mp3"},
    ],
  },

  /* 3 ── الشعر الأندلسي */
  {
    id:'andalusian', name:'الشعر الأندلسي', nameEn:'',
    desc:'جمال الأندلس في أشعار ابن زيدون وابن عربي والمعتمد',
    color:'#6b1a3a', icon:'',
    introAudio:['audio/andalusian/intro-1.mp3'],
    poems:[
      {poet:"ابن زيدون",          read:"أَضحى التَّنائي بَديلاً مِن تَدانينا",        card:"وَنابَ عَن طيبِ لُقيانا تَجافينا",             audio:"audio/andalusian/poem-01.mp3"},
      {poet:"ابن زيدون",          read:"إِنّي ذَكَرتُكِ بِالزَّهراءِ مُشتاقاً",      card:"وَالأُفقُ طَلقٌ وَمَرأى الأَرضِ قَد راقا",   audio:"audio/andalusian/poem-02.mp3"},
      {poet:"ابن زيدون",          read:"بِنتُم وَبِنّا فَما اِبتَلَّت جَوانِحُنا",    card:"شَوقاً إِلَيكُم وَلا جَفَّت مَآقينا",        audio:"audio/andalusian/poem-03.mp3"},
      {poet:"لسان الدين ابن الخطيب",read:"جادَكَ الغَيثُ إِذا الغَيثُ هَما",          card:"يا زَمانَ الوَصلِ بِالأَندَلُسِ",             audio:"audio/andalusian/poem-04.mp3"},
      {poet:"ابن عربي",           read:"لَقَد صارَ قَلبي قابِلاً كُلَّ صورَةٍ",       card:"فَمَرعىً لِغِزلانٍ وَدَيرٌ لِرُهبانِ",       audio:"audio/andalusian/poem-05.mp3"},
      {poet:"ولادة بنت المستكفي", read:"أَنا وَاللَّهِ أَصلُحُ لِلمَعالي",            card:"وَأَمشي مِشيَتي وَأُعَزُّ نَفسي",            audio:"audio/andalusian/poem-06.mp3"},
      {poet:"المعتمد بن عباد",    read:"فيكَ يا بَحرُ عِبرَةٌ لِذَوي اللُّبِّ",      card:"أَنتَ في المَدِّ وَالجَزرِ كَالأَيّامِ",      audio:"audio/andalusian/poem-07.mp3"},
      {poet:"ابن زيدون",          read:"كَم قَد تَشَكَّيتُ مِن أَشواقِ مُكتَنِفٍ",   card:"أَضنى الحَشا وَجَوىً لَم يَبقَ مَعهُ صَبرُ", audio:"audio/andalusian/poem-08.mp3"},
    ],
  },

  /* 4 ── الشعر الحديث */
  {
    id:'modern', name:'الشعر الحديث', nameEn:'',
    desc:'شوقي ودرويش وأبو ماضي وحافظ — روائع الشعر العربي الحديث',
    color:'#1a6b5a', icon:'',
    introAudio:['audio/modern/intro-1.mp3'],
    poems:[
      {poet:"أحمد شوقي",    read:"وُلِدَ الهُدى فَالكائِناتُ ضِياءُ",           card:"وَفَمُ الزَّمانِ تَبَسُّمٌ وَثَناءُ",          audio:"audio/modern/poem-01.mp3"},
      {poet:"أحمد شوقي",    read:"رِيمٌ عَلى القاعِ بَينَ البانِ وَالعَلَمِ",   card:"أَحَلَّ سَفكَ دَمي في الأَشهُرِ الحُرُمِ",   audio:"audio/modern/poem-02.mp3"},
      {poet:"أحمد شوقي",    read:"قُم لِلمُعَلِّمِ وَفِّهِ التَّبجيلا",          card:"كادَ المُعَلِّمُ أَن يَكونَ رَسولا",          audio:"audio/modern/poem-03.mp3"},
      {poet:"حافظ إبراهيم", read:"الأُمُّ مَدرَسَةٌ إِذا أَعدَدتَها",           card:"أَعدَدتَ شَعباً طَيِّبَ الأَعراقِ",            audio:"audio/modern/poem-04.mp3"},
      {poet:"إيليا أبو ماضي",read:"جِئتُ لا أَعلَمُ مِن أَينَ وَلَكِنِّي أَتَيتُ",card:"وَلَقَد أَبصَرتُ قُدّامي طَريقاً فَمَشَيتُ",audio:"audio/modern/poem-05.mp3"},
      {poet:"إيليا أبو ماضي",read:"لا تَقُل أَصلي وَفَصلي أَبَداً",             card:"إِنَّما أَصلُ الفَتى ما قَد حَصَل",           audio:"audio/modern/poem-06.mp3"},
      {poet:"محمود درويش",  read:"عَلى هَذِهِ الأَرضِ ما يَستَحِقُّ الحَياةَ",  card:"تَرَدُّدُ أَبريلَ وَرائِحَةُ الخُبزِ في الفَجرِ",audio:"audio/modern/poem-07.mp3"},
      {poet:"محمود درويش",  read:"أَنا مِن هُناكَ وَلي ذِكرَياتٌ",              card:"وُلِدتُ كَما تُولَدُ الأَعشابُ",              audio:"audio/modern/poem-08.mp3"},
    ],
  },

]; // end DECKS

function getDeck(id){ return DECKS.find(d=>d.id===id)||DECKS[0]; }
function getDeckPoems(id){ return getDeck(id).poems; }

/* ── LIBRARY_DECKS ───────────────────────────────────────────────
   Completely separate poem sets for the المكتبة browser.
   Edit these freely — they have zero effect on the game decks above.
   Same structure: id must match a DECKS id (for icon/color/name),
   but poems[] is entirely your own list.
──────────────────────────────────────────────────────────────── */
const LIBRARY_DECKS = [

  /* 1 ── المعلقات library set — add cardImg per poem to use a different card image */
  {
    id:'muallaqat',
    poems:[
      {poet:"امرؤ القيس",      read:"قِفَا نَبْكِ مِن ذِكرى حَبيبٍ وَمَنزِلِ",       card:"بِسِقطِ اللِّوى بَينَ الدَّخولِ فَحَومَلِ",       cardImg:"img/card.png"},
      {poet:"امرؤ القيس",      read:"أَلا أَيُّها اللَّيلُ الطَّويلُ أَلا انجَلِ",    card:"بِصُبحٍ وَما الإِصباحُ مِنكَ بِأَمثَلِ",         cardImg:"img/card.png"},
      {poet:"امرؤ القيس",      read:"أَلا كُلُّ شَيءٍ ما خَلا اللَهَ باطِلُ",        card:"وَكُلُّ نَعيمٍ لا مَحالَةَ زائِلُ",               cardImg:"img/card.png"},
      {poet:"طرفة بن العبد",   read:"سَتُبدي لَكَ الأَيّامُ ما كُنتَ جاهِلاً",       card:"وَيَأتيكَ بِالأَخبارِ مَن لَم تُزَوِّدِ",         cardImg:"img/card.png"},
      {poet:"طرفة بن العبد",   read:"لَعَمرُكَ إِنَّ المَوتَ ما أَخطَأَ الفَتى",     card:"لَكَالطِّوَلِ المُرخى وَثِنياهُ باليَدِ",         cardImg:"img/card.png"},
      {poet:"زهير بن أبي سلمى",read:"سَئِمتُ تَكاليفَ الحَياةِ وَمَن يَعِش",        card:"ثَمانينَ حَولاً لا أَبا لَكَ يَسأَمِ",            cardImg:"img/card.png"},
      {poet:"لبيد بن ربيعة",   read:"أَلا كُلُّ شَيءٍ ما خَلا اللَهَ باطِلُ",       card:"وَكُلُّ نَعيمٍ لا مَحالَةَ زائِلُ",               cardImg:"img/card.png"},
      {poet:"عنترة بن شداد",   read:"هَل غادَرَ الشُّعَراءُ مِن مُتَرَدَّمِ",        card:"أَم هَل عَرَفتَ الدارَ بَعدَ تَوَهُّمِ",          cardImg:"img/card.png"},
      {poet:"عنترة بن شداد",   read:"يا دارَ عَبلَةَ بِالجِواءِ تَكَلَّمي",           card:"وَعِمي صَباحاً دارَ عَبلَةَ وَاسلَمي",            cardImg:"img/card.png"},
      {poet:"عنترة بن شداد",   read:"وَلَقَد ذَكَرتُكِ وَالرِّماحُ نَواهِلٌ",        card:"مِنّي وَبيضُ الهِندِ تَقطُرُ مِن دَمي",           cardImg:"img/card.png"},
      {poet:"عمرو بن كلثوم",   read:"أَلا لا يَجهَلَن أَحَدٌ عَلَينا",               card:"فَنَجهَلَ فَوقَ جَهلِ الجاهِلينا",                cardImg:"img/card.png"},
      {poet:"امرؤ القيس",      read:"مِكَرٍّ مِفَرٍّ مُقبِلٍ مُدبِرٍ مَعاً",         card:"كَجُلمودِ صَخرٍ حَطَّهُ السَّيلُ مِن عَلِ",      cardImg:"img/card.png"},
      {poet:"لبيد بن ربيعة",   read:"وَما المَرءُ إِلّا كَالشِّهابِ وَضَوئِهِ",     card:"يَحورُ رَماداً بَعدَ إِذ هُوَ ساطِعُ",            cardImg:"img/card.png"},
      {poet:"لبيد بن ربيعة",   read:"فَإِن تَسأَلينا فيمَ نَحنُ فَإِنَّنا",          card:"عَصافيرُ مِن هَذا الأَنامِ المُسَرَّحِ",          cardImg:"img/card.png"},
      {poet:"الوأواء الدمشقي",  read:"تَعَلَّقَهَا قَلْبِي كَمَا قَدْ تَعَلَّقَتْ",  card:"صَوَالِجُ صُدْغَيْهَا بِتُفَّاحِ خَدِّهَا",      cardImg:"img/card.png"},
    ],
  },

  /* 2 ── الشعر العباسي library set */
  {
    id:'abbasid',
    poems:[
      {poet:"المتنبي", read:"عَلى قَدرِ أَهلِ العَزمِ تَأتي العَزائِمُ",    card:"وَتَأتي عَلى قَدرِ الكِرامِ المَكارِمُ"},
      {poet:"المتنبي", read:"الخَيلُ وَاللَّيلُ وَالبَيداءُ تَعرِفُني",     card:"وَالسَّيفُ وَالرُّمحُ وَالقِرطاسُ وَالقَلَمُ"},
      {poet:"المتنبي", read:"أَنا الَّذي نَظَرَ الأَعمى إِلى أَدَبي",       card:"وَأَسمَعَت كَلِماتي مَن بِهِ صَمَمُ"},
      {poet:"المتنبي", read:"إِذا أَنتَ أَكرَمتَ الكَريمَ مَلَكتَهُ",       card:"وَإِن أَنتَ أَكرَمتَ اللَّئيمَ تَمَرَّدا"},
      {poet:"المتنبي", read:"وَمَن يَكُ ذا فَمٍ مُرٍّ مَريضٍ",             card:"يَجِد مُرّاً بِهِ الماءَ الزُّلالا"},
      {poet:"المتنبي", read:"فَإِن تَفُق الأَنامَ وَأَنتَ مِنهُم",          card:"فَإِنَّ المِسكَ بَعضُ دَمِ الغَزالِ"},
      {poet:"المتنبي", read:"عَيدٌ بِأَيَّةِ حالٍ عُدتَ يا عيدُ",           card:"بِما مَضى أَم بِأَمرٍ فيكَ تَجديدُ"},
      {poet:"المتنبي", read:"لَيسَ التَّعَزّي بِأَن تُعزّى وَتُصبَرا",      card:"لَكِنَّهُ أَن تَرى المَصابَ فَتَصبِرا"},
      {poet:"أبو تمام", read:"السَّيفُ أَصدَقُ أَنباءً مِنَ الكُتُبِ",      card:"في حَدِّهِ الحَدُّ بَينَ الجِدِّ وَاللَّعِبِ"},
      {poet:"أبو تمام", read:"لا تَنهَ عَن خُلُقٍ وَتَأتيَ مِثلَهُ",        card:"عارٌ عَلَيكَ إِذا فَعَلتَ عَظيمُ"},
      {poet:"البحتري",  read:"صُنتُ نَفسي عَمّا يُدَنِّسُ نَفسي",           card:"وَتَرَفَّعتُ عَن جَدا كُلِّ جِبسِ"},
      {poet:"البحتري",  read:"وَإِذا كانَت النُّفوسُ كِباراً",               card:"تَعِبَت في مُرادِها الأَجسامُ"},
    ],
  },

  /* 3 ── الشعر الأندلسي library set */
  {
    id:'andalusian',
    poems:[
      {poet:"ابن زيدون",          read:"أَضحى التَّنائي بَديلاً مِن تَدانينا",        card:"وَنابَ عَن طيبِ لُقيانا تَجافينا"},
      {poet:"ابن زيدون",          read:"إِنّي ذَكَرتُكِ بِالزَّهراءِ مُشتاقاً",      card:"وَالأُفقُ طَلقٌ وَمَرأى الأَرضِ قَد راقا"},
      {poet:"ابن زيدون",          read:"بِنتُم وَبِنّا فَما اِبتَلَّت جَوانِحُنا",    card:"شَوقاً إِلَيكُم وَلا جَفَّت مَآقينا"},
      {poet:"لسان الدين ابن الخطيب",read:"جادَكَ الغَيثُ إِذا الغَيثُ هَما",          card:"يا زَمانَ الوَصلِ بِالأَندَلُسِ"},
      {poet:"ابن عربي",           read:"لَقَد صارَ قَلبي قابِلاً كُلَّ صورَةٍ",       card:"فَمَرعىً لِغِزلانٍ وَدَيرٌ لِرُهبانِ"},
      {poet:"ولادة بنت المستكفي", read:"أَنا وَاللَّهِ أَصلُحُ لِلمَعالي",            card:"وَأَمشي مِشيَتي وَأُعَزُّ نَفسي"},
      {poet:"المعتمد بن عباد",    read:"فيكَ يا بَحرُ عِبرَةٌ لِذَوي اللُّبِّ",      card:"أَنتَ في المَدِّ وَالجَزرِ كَالأَيّامِ"},
      {poet:"ابن زيدون",          read:"كَم قَد تَشَكَّيتُ مِن أَشواقِ مُكتَنِفٍ",   card:"أَضنى الحَشا وَجَوىً لَم يَبقَ مَعهُ صَبرُ"},
    ],
  },

  /* 4 ── الشعر الحديث library set */
  {
    id:'modern',
    poems:[
      {poet:"أحمد شوقي",    read:"وُلِدَ الهُدى فَالكائِناتُ ضِياءُ",           card:"وَفَمُ الزَّمانِ تَبَسُّمٌ وَثَناءُ"},
      {poet:"أحمد شوقي",    read:"قُم لِلمُعَلِّمِ وَفِّهِ التَّبجيلا",          card:"كادَ المُعَلِّمُ أَن يَكونَ رَسولا"},
      {poet:"أحمد شوقي",    read:"رِيمٌ عَلى القاعِ بَينَ البانِ وَالعَلَمِ",   card:"أَحَلَّ سَفكَ دَمي في الأَشهُرِ الحُرُمِ"},
      {poet:"حافظ إبراهيم", read:"الأُمُّ مَدرَسَةٌ إِذا أَعدَدتَها",           card:"أَعدَدتَ شَعباً طَيِّبَ الأَعراقِ"},
      {poet:"إيليا أبو ماضي",read:"جِئتُ لا أَعلَمُ مِن أَينَ وَلَكِنِّي أَتَيتُ",card:"وَلَقَد أَبصَرتُ قُدّامي طَريقاً فَمَشَيتُ"},
      {poet:"إيليا أبو ماضي",read:"لا تَقُل أَصلي وَفَصلي أَبَداً",             card:"إِنَّما أَصلُ الفَتى ما قَد حَصَل"},
      {poet:"محمود درويش",  read:"عَلى هَذِهِ الأَرضِ ما يَستَحِقُّ الحَياةَ",  card:"تَرَدُّدُ أَبريلَ وَرائِحَةُ الخُبزِ في الفَجرِ"},
      {poet:"محمود درويش",  read:"أَنا مِن هُناكَ وَلي ذِكرَياتٌ",              card:"وُلِدتُ كَما تُولَدُ الأَعشابُ"},
    ],
  },

]; // end LIBRARY_DECKS

// Library helpers — use these in the browser, never in game logic
function getLibraryDeck(id){
  const lib = LIBRARY_DECKS.find(d=>d.id===id) || LIBRARY_DECKS[0];
  const meta = getDeck(lib.id);
  return { ...meta, poems: lib.poems };
}

/* ── THEMES ──────────────────────────────────────────────────────
   Add more themes by appending to this array.
   Each theme overrides CSS custom properties on <body>.
   id must match a CSS class: body.theme-{id}
──────────────────────────────────────────────────────────────── */
const THEMES = [
  {
    id:'emerald', name:'الزمرد', nameEn:'Emerald',
    swatch:['#2d5a27','#8b1a1a','#f7eed8'],
    desc:'المظهر الكلاسيكي الأخضر',
  },
  {
    id:'lapis', name:'اللازورد', nameEn:'Lapis',
    swatch:['#1a3564','#c8962a','#eeeae0'],
    desc:'أزرق ملكي بلمسات ذهبية',
  },
  {
    id:'ruby', name:'العقيق', nameEn:'Ruby',
    swatch:['#6b1a1a','#c8962a','#faf5e8'],
    desc:'دفء الأحمر العميق والذهب',
  },
  {
    id:'night', name:'الليل', nameEn:'Night',
    swatch:['#c8962a','#e8d9a0','#2a2520'],
    desc:'وضع الليل — ذهب على عتمة',
  },
];

/* ── BACKGROUNDS ─────────────────────────────────────────────────
   5 hardcoded CSS backgrounds for body::before.
   Add more by appending to this array.
   id must match a CSS class: body.bg-{id}
──────────────────────────────────────────────────────────────── */
const BACKGROUNDS = [
  { id:'grid',    name:'الشبكة',        nameEn:'Classic Grid',    emoji:'⊞' },
  { id:'desert',  name:'الصحراء',       nameEn:'Desert Dunes',    emoji:'🏜️' },
  { id:'night',   name:'السماء الليلية',nameEn:'Starry Night',    emoji:'✨' },
  { id:'marble',  name:'الرخام',        nameEn:'Marble',          emoji:'🌫️' },
  { id:'forest',  name:'الغابة',        nameEn:'Dark Forest',     emoji:'🌿' },
  // ── Image backgrounds — place your photo at the listed path ──
  { id:'photo1',  name:'صورة ١',         nameEn:'Photo 1',         emoji:'🖼️', isPhoto:true, src:'img/bg-1.jpg' },
  { id:'photo2',  name:'صورة ٢',         nameEn:'Photo 2',         emoji:'🖼️', isPhoto:true, src:'img/bg-2.jpg' },
  { id:'photo3',  name:'صورة ٣',         nameEn:'Photo 3',         emoji:'🖼️', isPhoto:true, src:'img/bg-3.jpg' },
];


/* ═══════════════════════════════════════
   §STATE  —  shared runtime state
   All functions read/write window.G
═══════════════════════════════════════ */
window.G = {
  db:null, auth:null,
  myUid:'', myEmail:'',
  myProfile:{username:'',avatar:'🦁',bio:'',photoURL:'',isAdmin:false,friends:{},stats:{}},
  roomRef:null, roomCode:'', isHost:false,
  subs:[],
  curAudio:null, lastGameRound:-2,
  mmRef:null, mmInterval:null, mmQueueListener:null,
  inviteListener:null,
  selectedAvatar:null, pendingPhotoURL:null,
  pendingInviteTarget:null,
  selectedDeckId:'muallaqat', selectedCardCount:28,
  allUsersCache:{},
};


/* ═══════════════════════════════════════
   §UTILS  —  shared helpers
═══════════════════════════════════════ */
function show(id){
  document.querySelectorAll('.screen').forEach(s=>s.classList.remove('active'));
  document.getElementById('screen-'+id).classList.add('active');
}
function toast(msg,dur=2600){
  const t=document.getElementById('toast');
  t.textContent=msg; t.classList.add('show');
  setTimeout(()=>t.classList.remove('show'),dur);
}
function genCode(){const c='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';let r='';for(let i=0;i<4;i++)r+=c[Math.floor(Math.random()*c.length)];return r;}
function shuffle(a){const b=[...a];for(let i=b.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[b[i],b[j]]=[b[j],b[i]];}return b;}
function stopAudio(){if(G.curAudio){G.curAudio.pause();G.curAudio=null;}}
function clearSubs(){G.subs.forEach(f=>f());G.subs=[];}
function arabErr(code){return({'auth/email-already-in-use':'البريد مستخدم بالفعل','auth/invalid-email':'بريد غير صالح','auth/weak-password':'كلمة المرور ضعيفة (6+)','auth/user-not-found':'لا يوجد حساب بهذا البريد','auth/wrong-password':'كلمة المرور غير صحيحة','auth/too-many-requests':'تجاوزت المحاولات، حاول لاحقاً','auth/invalid-credential':'البريد أو كلمة المرور غير صحيحة'}[code]||'حدث خطأ، حاول مجدداً');}
function avHTML(p,size='28px'){const ph=(p&&p.photoURL)||'';if(ph&&(ph.startsWith('data:')||ph.startsWith('http')))return '<img src="'+ph+'" style="width:'+size+';height:'+size+';border-radius:50%;object-fit:cover;border:1.5px solid var(--green);flex-shrink:0;vertical-align:middle;"/>';return '<span style="font-size:calc('+size+' * 0.75);">'+(p&&p.avatar?p.avatar:'🦁')+'</span>';}
function runCountdown(n,cb){const el=document.getElementById('countdown');el.style.display='block';el.textContent=n;const iv=setInterval(()=>{n--;if(n>0)el.textContent=n;else{clearInterval(iv);el.style.display='none';cb();}},1000);}


/* ═══════════════════════════════════════
   §AUTH
═══════════════════════════════════════ */
function switchTab(t){
  document.getElementById('tab-login').classList.toggle('active',t==='login');
  document.getElementById('tab-register').classList.toggle('active',t==='register');
  document.getElementById('form-login').style.display=t==='login'?'':'none';
  document.getElementById('form-register').style.display=t==='register'?'':'none';
}
async function doLogin(){
  const email=document.getElementById('l-email').value.trim();
  const pass=document.getElementById('l-pass').value;
  document.getElementById('l-err').textContent='';
  try{await G.auth.signInWithEmailAndPassword(email,pass);}
  catch(e){document.getElementById('l-err').textContent=arabErr(e.code);}
}
async function doRegister(){
  const name=document.getElementById('r-name').value.trim();
  const email=document.getElementById('r-email').value.trim();
  const pass=document.getElementById('r-pass').value;
  document.getElementById('r-err').textContent='';
  if(!name||name.length<2){document.getElementById('r-err').textContent='اكتب اسماً صالحاً (حرفان+)';return;}
  try{
    const c=await G.auth.createUserWithEmailAndPassword(email,pass);
    const uid=c.user.uid;
    const isAdmin=email.toLowerCase()===ADMIN_EMAIL.toLowerCase();
    await G.db.ref('users/'+uid).set({username:name,avatar:'🦁',bio:'',photoURL:'',email,isAdmin,banned:false,online:true,stats:{gamesPlayed:0,gamesWon:0,cardsWon:0},createdAt:firebase.database.ServerValue.TIMESTAMP});
  }catch(e){document.getElementById('r-err').textContent=arabErr(e.code);}
}
async function doLogout(){
  clearSubs();stopAudio();cancelMatchmaking();
  if(G.inviteListener&&G.db){G.db.ref('users/'+G.myUid+'/gameInvites').off('value',G.inviteListener);G.inviteListener=null;}
  if(G.roomRef)G.roomRef.child('players/'+G.myUid+'/online').set(false);
  await G.auth.signOut();
}
async function loadMyProfile(){
  const snap=await G.db.ref('users/'+G.myUid).once('value');
  if(snap.exists())G.myProfile={...G.myProfile,...snap.val()};
}


/* ═══════════════════════════════════════
   §PROFILE
═══════════════════════════════════════ */
function updateNavAvatar(){
  const el=document.getElementById('nav-avatar');if(!el)return;
  if(G.myProfile.photoURL)el.innerHTML='<img src="'+G.myProfile.photoURL+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
  else el.textContent=G.myProfile.avatar||'🦁';
}
function showProfile(uid){
  if(uid&&uid!==G.myUid){
    G.db.ref('users/'+uid).once('value').then(snap=>{
      if(!snap.exists())return;
      const p=snap.val();
      document.getElementById('modal-title').textContent=p.username||'لاعب';
      const isFriend=G.myProfile.friends&&G.myProfile.friends[uid]==='accepted';
      const isPending=G.myProfile.friends&&G.myProfile.friends[uid]==='pending_sent';
      const photoEl=p.photoURL?'<img src="'+p.photoURL+'" style="width:72px;height:72px;border-radius:50%;object-fit:cover;border:3px solid var(--green);">'
        :'<div style="font-size:52px;">'+(p.avatar||'🦁')+'</div>';
      document.getElementById('modal-body').innerHTML=
        '<div style="text-align:center;margin-bottom:1rem;">'+photoEl+
        '<div style="font-size:13px;color:var(--ink-dim);margin-top:.5rem;">'+(p.bio||'')+'</div>'+
        '<div class="stats-row" style="margin-top:1rem;">'+
        '<div class="stat-box"><div class="stat-num">'+(p.stats&&p.stats.gamesPlayed||0)+'</div><div class="stat-lbl">مباريات</div></div>'+
        '<div class="stat-box"><div class="stat-num">'+(p.stats&&p.stats.gamesWon||0)+'</div><div class="stat-lbl">انتصارات</div></div>'+
        '<div class="stat-box"><div class="stat-num">'+(p.stats&&p.stats.cardsWon||0)+'</div><div class="stat-lbl">بطاقات</div></div>'+
        '</div></div>'+
        '<div style="display:flex;flex-direction:column;gap:8px;">'+
        (isFriend
          ?'<button class="btn danger" id="modal-invite-btn">🎮 دعوة للعب معاً</button><div style="text-align:center;color:#2d7a2a;font-size:12px;">✓ صديق</div>'
          :isPending
            ?'<div style="text-align:center;color:var(--ink-dim);">طلب مُرسَل…</div>'
            :'<button class="btn primary" id="modal-add-btn">إضافة صديق +</button>'
        )+'</div>';
      if(isFriend)document.getElementById('modal-invite-btn').addEventListener('click',()=>sendGameInvite(uid,p.username));
      else if(!isPending)document.getElementById('modal-add-btn').addEventListener('click',()=>sendFriendReq(uid,p.username));
      document.getElementById('modal-bg').classList.add('open');
    });
    return;
  }
  // Own profile
  const pAv=document.getElementById('p-avatar');
  if(G.myProfile.photoURL)pAv.innerHTML='<img src="'+G.myProfile.photoURL+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
  else{pAv.innerHTML='';pAv.textContent=G.myProfile.avatar||'🦁';}
  document.getElementById('p-name').textContent=G.myProfile.username||'—';
  document.getElementById('p-email').textContent=G.myEmail;
  document.getElementById('p-bio').textContent=G.myProfile.bio||'';
  const s=G.myProfile.stats||{};
  document.getElementById('st-games').textContent=s.gamesPlayed||0;
  document.getElementById('st-wins').textContent=s.gamesWon||0;
  document.getElementById('st-cards').textContent=s.cardsWon||0;
  document.getElementById('edit-name').value=G.myProfile.username||'';
  document.getElementById('edit-bio').value=G.myProfile.bio||'';
  const prev=document.getElementById('p-photo-preview');
  if(G.myProfile.photoURL)prev.innerHTML='<img src="'+G.myProfile.photoURL+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
  else{prev.innerHTML='';prev.textContent=G.myProfile.avatar||'🦁';}
  document.getElementById('remove-photo-btn').style.display=G.myProfile.photoURL?'inline-block':'none';
  G.pendingPhotoURL=null;G.selectedAvatar=null;buildAvatarGrid();
  show('profile');
}
function buildAvatarGrid(){
  const grid=document.getElementById('avatar-grid');if(!grid)return;
  grid.innerHTML='';
  AVATARS.forEach(a=>{
    const d=document.createElement('div');
    d.className='avatar-opt'+(a===G.myProfile.avatar?' selected':'');
    d.textContent=a;
    d.addEventListener('click',()=>{G.selectedAvatar=a;grid.querySelectorAll('.avatar-opt').forEach(el=>el.classList.toggle('selected',el.textContent===a));});
    grid.appendChild(d);
  });
}
function handlePhotoUpload(input){
  const file=input.files[0];if(!file)return;
  const reader=new FileReader();
  reader.onload=e=>{
    const img=new Image();
    img.onload=()=>{
      const canvas=document.createElement('canvas');canvas.width=120;canvas.height=120;
      const ctx=canvas.getContext('2d');const min=Math.min(img.width,img.height);
      ctx.drawImage(img,(img.width-min)/2,(img.height-min)/2,min,min,0,0,120,120);
      const dataURL=canvas.toDataURL('image/jpeg',.75);
      G.pendingPhotoURL=dataURL;
      const prev=document.getElementById('p-photo-preview');
      prev.innerHTML='<img src="'+dataURL+'" style="width:100%;height:100%;object-fit:cover;border-radius:50%;"/>';
      document.getElementById('remove-photo-btn').style.display='inline-block';
    };
    img.src=e.target.result;
  };
  reader.readAsDataURL(file);
}
function removePhoto(){G.pendingPhotoURL='';const prev=document.getElementById('p-photo-preview');prev.innerHTML='';prev.textContent=G.myProfile.avatar||'🦁';document.getElementById('remove-photo-btn').style.display='none';}
async function saveProfile(){
  const name=document.getElementById('edit-name').value.trim();
  const bio=document.getElementById('edit-bio').value.trim();
  const av=G.selectedAvatar||G.myProfile.avatar||'🦁';
  if(!name){toast('اكتب اسماً');return;}
  const updates={username:name,bio,avatar:av};
  if(G.pendingPhotoURL!==null)updates.photoURL=G.pendingPhotoURL;
  await G.db.ref('users/'+G.myUid).update(updates);
  G.myProfile.username=name;G.myProfile.bio=bio;G.myProfile.avatar=av;
  if(G.pendingPhotoURL!==null)G.myProfile.photoURL=G.pendingPhotoURL;
  G.pendingPhotoURL=null;toast('✓ تم حفظ الملف');updateNavAvatar();goHome();
}
function closeModal(){const mb=document.getElementById('modal-bg');mb.classList.remove('open','modal-wide');}


/* ═══════════════════════════════════════
   §FRIENDS
═══════════════════════════════════════ */
function showFriends(){show('friends');loadFriendsList();loadPendingRequests();}
async function searchUser(){
  const q=document.getElementById('friend-search').value.trim().toLowerCase();
  if(!q){toast('اكتب اسماً للبحث');return;}
  const snap=await G.db.ref('users').once('value');
  const users=snap.val()||{};
  const results=Object.entries(users).filter(([uid,u])=>uid!==G.myUid&&(u.username||'').toLowerCase().includes(q));
  const div=document.getElementById('search-result');
  if(!results.length){div.innerHTML='<div class="empty-state">لم يُعثر على أحد</div>';return;}
  div.innerHTML='';
  results.forEach(([uid,u])=>{
    const row=document.createElement('div');row.className='friend-item';
    row.innerHTML='<div class="friend-avatar">'+avHTML(u,'34px')+'</div><div><div class="friend-name">'+(u.username||uid)+'</div></div>';
    const btn=document.createElement('button');btn.className='btn sm';btn.textContent='عرض';
    btn.addEventListener('click',()=>showProfile(uid));
    row.appendChild(btn);div.appendChild(row);
  });
}
async function sendFriendReq(toUid,toName){
  await G.db.ref('users/'+G.myUid+'/friends/'+toUid).set('pending_sent');
  await G.db.ref('users/'+toUid+'/friends/'+G.myUid).set('pending_received');
  if(!G.myProfile.friends)G.myProfile.friends={};
  G.myProfile.friends[toUid]='pending_sent';
  toast('✓ أُرسِل الطلب إلى '+toName);closeModal();
}
async function loadPendingRequests(){
  const snap=await G.db.ref('users/'+G.myUid+'/friends').once('value');
  const friends=snap.val()||{};
  const pending=Object.entries(friends).filter(([,v])=>v==='pending_received');
  const div=document.getElementById('pending-list');
  if(!pending.length){div.innerHTML='<div class="empty-state">لا توجد طلبات</div>';return;}
  div.innerHTML='';
  for(const [uid] of pending){
    const s=await G.db.ref('users/'+uid).once('value');const u=s.val()||{};
    const row=document.createElement('div');row.className='friend-item';
    row.innerHTML='<div class="friend-avatar">'+avHTML(u,'34px')+'</div><div class="friend-name" style="flex:1;">'+(u.username||uid)+'</div>';
    const ab=document.createElement('button');ab.className='btn sm primary';ab.textContent='قبول';
    ab.addEventListener('click',()=>acceptFriend(uid));
    const rb=document.createElement('button');rb.className='btn sm danger';rb.textContent='رفض';
    rb.addEventListener('click',()=>declineFriend(uid));
    row.appendChild(ab);row.appendChild(rb);div.appendChild(row);
  }
}
async function acceptFriend(uid){
  await G.db.ref('users/'+G.myUid+'/friends/'+uid).set('accepted');
  await G.db.ref('users/'+uid+'/friends/'+G.myUid).set('accepted');
  if(!G.myProfile.friends)G.myProfile.friends={};
  G.myProfile.friends[uid]='accepted';
  toast('✓ تمت إضافة الصديق');loadPendingRequests();loadFriendsList();
}
async function declineFriend(uid){
  await G.db.ref('users/'+G.myUid+'/friends/'+uid).remove();
  await G.db.ref('users/'+uid+'/friends/'+G.myUid).remove();
  loadPendingRequests();
}
async function loadFriendsList(){
  const snap=await G.db.ref('users/'+G.myUid+'/friends').once('value');
  const friends=snap.val()||{};
  const accepted=Object.entries(friends).filter(([,v])=>v==='accepted');
  const div=document.getElementById('friends-list');
  if(!accepted.length){div.innerHTML='<div class="empty-state">لا يوجد أصدقاء بعد</div>';return;}
  div.innerHTML='';
  for(const [uid] of accepted){
    const s=await G.db.ref('users/'+uid).once('value');const u=s.val()||{};
    const row=document.createElement('div');row.className='friend-item';
    row.innerHTML='<div class="'+(u.online?'online-dot':'offline-dot')+'"></div>'+
      '<div class="friend-avatar">'+avHTML(u,'34px')+'</div>'+
      '<div style="flex:1;"><div class="friend-name">'+(u.username||uid)+'</div>'+
      '<div class="friend-sub">'+(u.online?'متصل الآن':'غير متصل')+'</div></div>';
    const vb=document.createElement('button');vb.className='btn sm';vb.textContent='عرض';
    vb.addEventListener('click',()=>showProfile(uid));
    const ib=document.createElement('button');ib.className='btn sm danger';ib.textContent='🎮 دعوة';
    ib.addEventListener('click',()=>sendGameInvite(uid,u.username||uid));
    row.appendChild(vb);row.appendChild(ib);div.appendChild(row);
  }
}
// Game invites listener (attached once on login)
function listenForInvites(){
  if(!G.myUid||!G.db||G.inviteListener)return;
  G.inviteListener=G.db.ref('users/'+G.myUid+'/gameInvites').on('value',snap=>{
    const invites=snap.val()||{};const list=Object.entries(invites);
    const panel=document.getElementById('invites-panel');const listEl=document.getElementById('invites-list');
    if(!panel||!listEl)return;
    if(!list.length){panel.style.display='none';return;}
    panel.style.display='block';listEl.innerHTML='';
    list.forEach(([fromUid,inv])=>{
      const row=document.createElement('div');row.className='friend-item';
      row.innerHTML='<div class="friend-avatar">'+(inv.avatar||'🦁')+'</div>'+
        '<div style="flex:1;"><div class="friend-name">'+(inv.username||'لاعب')+'</div>'+
        '<div class="friend-sub" style="direction:ltr;">Room: '+inv.roomCode+'</div></div>';
      const ab=document.createElement('button');ab.className='btn sm primary';ab.textContent='انضمام ✓';
      ab.addEventListener('click',()=>acceptGameInvite(fromUid,inv.roomCode));
      const rb=document.createElement('button');rb.className='btn sm danger';rb.textContent='رفض';
      rb.addEventListener('click',()=>G.db.ref('users/'+G.myUid+'/gameInvites/'+fromUid).remove());
      row.appendChild(ab);row.appendChild(rb);listEl.appendChild(row);
    });
  });
}
async function sendGameInvite(toUid,toName){
  if(!G.myUid)return;
  G.pendingInviteTarget={uid:toUid,name:toName};
  showDeckSelect('invite');
}
async function _sendGameInviteAfterDeck(toUid,toName){
  const code=genCode();G.roomCode=code;G.isHost=true;
  await createRoom([]);
  await G.db.ref('users/'+toUid+'/gameInvites/'+G.myUid).set({username:G.myProfile.username,avatar:G.myProfile.avatar||'🦁',roomCode:code,sentAt:firebase.database.ServerValue.TIMESTAMP});
  toast('✓ تم إرسال الدعوة إلى '+toName);closeModal();
}
async function acceptGameInvite(fromUid,code){
  await G.db.ref('users/'+G.myUid+'/gameInvites/'+fromUid).remove();
  G.roomCode=code;G.isHost=false;G.roomRef=G.db.ref('rooms/'+G.roomCode);
  const snap=await G.roomRef.once('value');
  if(!snap.exists()){toast('انتهت صلاحية الدعوة');return;}
  await G.roomRef.child('players/'+G.myUid).set({name:G.myProfile.username,avatar:G.myProfile.avatar||'🦁',photoURL:G.myProfile.photoURL||'',score:0,online:true});
  G.roomRef.child('players/'+G.myUid+'/online').onDisconnect().set(false);
  document.getElementById('room-code-show').textContent=G.roomCode;
  document.getElementById('start-btn').style.display='none';
  document.getElementById('host-hint').textContent='Waiting for host to start…';
  show('lobby');listenRoom();
}


/* ═══════════════════════════════════════
   §MATCHMAKING
═══════════════════════════════════════ */
function startMatchmaking(){
  if(!G.myUid){toast('يجب تسجيل الدخول');return;}
  showDeckSelect('matchmaking');
}
async function _startMatchmakingAfterDeck(){
  show('matchmaking');
  G.mmRef=G.db.ref('matchmaking/'+G.myUid);
  G.mmRef.set({username:G.myProfile.username,avatar:G.myProfile.avatar,deckId:G.selectedDeckId,joinedAt:firebase.database.ServerValue.TIMESTAMP});
  G.mmRef.onDisconnect().remove();
  document.getElementById('mm-status').textContent='جاري البحث عن لاعبين…';
  document.getElementById('mm-count').textContent='';
  G.mmQueueListener=G.mmRef.on('value',async snap=>{
    if(!snap.exists())return;
    const data=snap.val()||{};
    if(data.roomCode){
      G.mmRef.off('value',G.mmQueueListener);G.mmQueueListener=null;
      clearInterval(G.mmInterval);G.mmInterval=null;
      G.mmRef.remove();G.mmRef=null;
      G.roomCode=data.roomCode;G.isHost=false;G.roomRef=G.db.ref('rooms/'+G.roomCode);
      await G.roomRef.child('players/'+G.myUid).set({name:G.myProfile.username,avatar:G.myProfile.avatar||'🦁',photoURL:G.myProfile.photoURL||'',score:0,online:true});
      G.roomRef.child('players/'+G.myUid+'/online').onDisconnect().set(false);
      document.getElementById('room-code-show').textContent=G.roomCode;
      document.getElementById('start-btn').style.display='none';
      document.getElementById('host-hint').textContent='Waiting for host to start…';
      show('lobby');listenRoom();
    }
  });
  let elapsed=0;
  G.mmInterval=setInterval(async()=>{
    elapsed++;document.getElementById('mm-count').textContent=elapsed+'s';
    const snap=await G.db.ref('matchmaking').once('value');
    const queue=snap.val()||{};
    const others=Object.entries(queue).filter(([uid,v])=>uid!==G.myUid&&!v.roomCode);
    document.getElementById('mm-status').textContent=Object.keys(queue).length+' لاعب في الانتظار…';
    if(others.length>0){
      const allIds=[G.myUid,...others.map(([uid])=>uid)].sort();
      if(allIds[0]===G.myUid){
        clearInterval(G.mmInterval);G.mmInterval=null;
        const partnerUid=others[0][0];const code=genCode();
        await G.db.ref('matchmaking/'+partnerUid).update({roomCode:code});
        G.mmRef.off('value',G.mmQueueListener);G.mmQueueListener=null;
        G.mmRef.remove();G.mmRef=null;
        G.roomCode=code;G.isHost=true;await createRoom([partnerUid]);
      }
    }
  },1500);
}
function cancelMatchmaking(){
  clearInterval(G.mmInterval);G.mmInterval=null;
  if(G.mmRef){if(G.mmQueueListener){G.mmRef.off('value',G.mmQueueListener);G.mmQueueListener=null;}G.mmRef.remove();G.mmRef=null;}
}


/* ═══════════════════════════════════════
   §LOBBY
═══════════════════════════════════════ */
async function openCreate(){
  if(!G.myUid){toast('يجب تسجيل الدخول');return;}
  showDeckSelect('create');
}
async function _openCreateAfterDeck(){G.roomCode=genCode();G.isHost=true;await createRoom([]);}

async function createRoom(extraPlayerUids=[]){
  if(!G.db)return;
  G.roomRef=G.db.ref('rooms/'+G.roomCode);
  const allPoems=getDeckPoems(G.selectedDeckId);
  const count=Math.min(G.selectedCardCount,allPoems.length);
  const deck=shuffle(allPoems).slice(0,count).map((p,i)=>({...p,id:i,matched:false,winnerId:null,winnerName:null}));
  const players={[G.myUid]:{name:G.myProfile.username,avatar:G.myProfile.avatar,photoURL:G.myProfile.photoURL||'',score:0,online:true}};
  await Promise.all(extraPlayerUids.map(async uid=>{
    const s=await G.db.ref('users/'+uid).once('value');const u=s.val()||{};
    players[uid]={name:u.username||uid,avatar:u.avatar||'🦁',photoURL:u.photoURL||'',score:0,online:true};
  }));
  await G.roomRef.set({host:G.myUid,status:'lobby',deckId:G.selectedDeckId,deckName:getDeck(G.selectedDeckId).name,deck,tableCards:deck,round:0,players,currentRead:deck[0],gameIndex:0});
  G.roomRef.child('players/'+G.myUid+'/online').onDisconnect().set(false);
  document.getElementById('room-code-show').textContent=G.roomCode;
  document.getElementById('start-btn').style.display='block';
  document.getElementById('host-hint').textContent='You are the host — start when ready.';
  show('lobby');listenRoom();
}
async function joinRoom(){
  if(!G.myUid){toast('يجب تسجيل الدخول');return;}
  const code=document.getElementById('join-code').value.trim().toUpperCase();
  if(code.length!==4){toast('أدخل رمزاً من 4 أحرف');return;}
  G.roomCode=code;G.isHost=false;G.roomRef=G.db.ref('rooms/'+G.roomCode);
  const snap=await G.roomRef.once('value');
  if(!snap.exists()){toast('الغرفة غير موجودة');return;}
  const data=snap.val();
  if(Object.keys(data.players||{}).length>=6){toast('الغرفة ممتلئة');return;}
  await G.roomRef.child('players/'+G.myUid).set({name:G.myProfile.username,avatar:G.myProfile.avatar||'🦁',photoURL:G.myProfile.photoURL||'',score:0,online:true});
  G.roomRef.child('players/'+G.myUid+'/online').onDisconnect().set(false);
  document.getElementById('room-code-show').textContent=G.roomCode;
  document.getElementById('start-btn').style.display='none';
  document.getElementById('host-hint').textContent='Waiting for host to start…';
  show('lobby');listenRoom();
}
function listenRoom(){
  clearSubs();
  const h=G.roomRef.on('value',snap=>{
    if(!snap.exists()){toast('تم إغلاق الغرفة');goHome();return;}
    const d=snap.val();
    if(d.status==='lobby')renderLobby(d);
    else if(d.status==='intro')renderIntroScreen(d);
    else if(d.status==='playing')renderGame(d);
    else if(d.status==='ended')renderResult(d);
  });
  G.subs.push(()=>G.roomRef.off('value',h));
}
function renderLobby(d){
  show('lobby');
  const ps=Object.entries(d.players||{});
  const list=document.getElementById('player-list');list.innerHTML='';
  ps.forEach(([uid,p])=>{
    const row=document.createElement('div');row.className='player-item';
    row.innerHTML='<div class="dot '+(p.online?'on':'off')+'"></div>'+avHTML(p,'28px')+
      '<span>'+p.name+'</span>'+(uid===d.host?'<span class="host-tag">Host</span>':'');
    list.appendChild(row);
  });
  const di=document.getElementById('lobby-deck-info');
  if(di){const dk=getDeck(d.deckId||'muallaqat');di.textContent=dk.icon+' '+dk.name+' · '+(d.deck&&d.deck.length||28)+' بطاقة';}
  document.getElementById('wait-msg').style.display=ps.length<2?'block':'none';
  document.getElementById('start-btn').style.display=G.myUid===d.host?'block':'none';
}
function copyInvite(){const url=location.origin+location.pathname+'?room='+G.roomCode;navigator.clipboard.writeText(url).then(()=>toast('تم نسخ الرابط! ↗'));}
function leaveLobby(){
  clearSubs();stopAudio();G.lastGameRound=-2;cancelMatchmaking();
  if(G.roomRef)G.roomRef.child('players/'+G.myUid+'/online').set(false);
  G.roomRef=null;G.roomCode='';G.isHost=false;goHome();
}


/* ═══════════════════════════════════════
   §GAME
═══════════════════════════════════════ */
async function hostStart(){
  if(!G.isHost)return;G.lastGameRound=-2;
  const snap=await G.roomRef.once('value');const d=snap.val();
  const players=d.players||{};Object.keys(players).forEach(uid=>{players[uid].score=0;});
  const allPoems=getDeckPoems(d.deckId||G.selectedDeckId);
  const count=d.deck?d.deck.length:Math.min(G.selectedCardCount,allPoems.length);
  const deck=shuffle(allPoems).slice(0,count).map((p,i)=>({...p,id:i,matched:false,winnerId:null,winnerName:null}));
  const nextIdx=((d.gameIndex||0)+1)%4;
  await G.roomRef.update({status:'intro',deck,tableCards:deck,round:0,players,currentRead:deck[0],gameIndex:nextIdx,deckId:d.deckId||G.selectedDeckId,introAt:firebase.database.ServerValue.TIMESTAMP});
}
async function hostRestart(){if(G.isHost)await hostStart();}
async function hostSkip(){
  if(!G.isHost)return;
  const snap=await G.roomRef.once('value');const d=snap.val();
  const nextR=(d.round||0)+1;
  if(nextR>=d.deck.length)await G.roomRef.update({status:'ended'});
  else await G.roomRef.update({round:nextR,currentRead:d.deck[nextR]});
}
function renderIntroScreen(d){
  stopAudio();show('intro');
  const dk=getDeck(d.deckId||'muallaqat');
  const idx=(d.gameIndex||0)%Math.max(1,dk.introAudio.length);
  document.getElementById('intro-num').textContent=dk.icon;
  document.getElementById('intro-lbl').innerHTML=dk.name+'<br><small>استمع إلى القصيدة الافتتاحية\u2026</small>';
  document.getElementById('countdown').style.display='none';
  document.getElementById('tap-play-btn').style.display='none';
  document.getElementById('wave').classList.remove('still');
  document.getElementById('intro-status').textContent='جاري التحميل\u2026';
  document.getElementById('skip-intro-btn').style.display='block';
  const src=dk.introAudio[idx]||'';
  if(!src){
    document.getElementById('wave').classList.add('still');
    document.getElementById('intro-status').textContent='لا يوجد ملف صوتي';
    if(G.isHost)runCountdown(3,()=>G.roomRef.update({status:'playing'}));
    else document.getElementById('intro-status').textContent='انتظار بدء اللعبة\u2026';
    return;
  }
  const a=new Audio(src);G.curAudio=a;
  document.getElementById('intro-status').textContent='🎙 يُقرأ الآن\u2026';
  a.addEventListener('timeupdate',()=>{if(G.curAudio!==a)return;const r=Math.ceil((a.duration||0)-a.currentTime);if(!isNaN(r)&&r>0)document.getElementById('intro-status').textContent='🎙 يُقرأ الآن — '+r+'s';});
  a.addEventListener('ended',()=>{if(G.curAudio!==a)return;document.getElementById('wave').classList.add('still');document.getElementById('intro-status').textContent='انتهت القصيدة\u2026';if(G.isHost)runCountdown(3,()=>G.roomRef.update({status:'playing'}));});
  const p=a.play();
  if(p!==undefined)p.catch(()=>{document.getElementById('wave').classList.add('still');document.getElementById('intro-status').textContent='اضغط للاستماع';document.getElementById('tap-play-btn').style.display='block';});
}
function renderGame(d){
  show('game');
  document.getElementById('scores').innerHTML='';
  Object.entries(d.players||{}).sort((a,b)=>(b[1].score||0)-(a[1].score||0)).forEach(([uid,p])=>{
    const chip=document.createElement('div');chip.className='chip'+(uid===G.myUid?' me':'');
    chip.innerHTML=avHTML(p,'18px')+' '+p.name+': <span>'+(p.score||0)+'</span>';
    document.getElementById('scores').appendChild(chip);
  });
  const r=d.round||0;
  document.getElementById('round-tag').textContent='بيت '+(r+1)+' / '+d.deck.length;
  if(d.currentRead){
    document.getElementById('reader-verse').textContent=d.currentRead.read;
    document.getElementById('reader-poet').textContent='— '+d.currentRead.poet;
    if(r!==G.lastGameRound){
      G.lastGameRound=r;stopAudio();
      if(d.currentRead.audio){
        const a=new Audio(d.currentRead.audio);G.curAudio=a;
        document.getElementById('reading-now').classList.add('show');
        a.play().catch(()=>{});
        a.addEventListener('ended',()=>{document.getElementById('reading-now').classList.remove('show');if(G.curAudio===a)G.curAudio=null;});
      }
    }
  }
  document.getElementById('skip-btn').style.display=G.isHost?'inline-block':'none';
  renderCards(d.tableCards||[]);
}
function renderCards(tc){
  const grid=document.getElementById('cards-grid');
  grid.innerHTML=[...shuffle([...tc.filter(c=>!c.matched)]),...tc.filter(c=>c.matched)].map(c=>
    '<div class="kcard'+(c.matched?' matched':'')+'" data-id="'+c.id+'">'+
    '<div class="kcard-body"><div class="kcard-verse">'+c.card+'</div></div>'+
    '<div class="kcard-footer"><span class="kcard-poet">'+c.poet+'</span>'+
    (c.matched&&c.winnerName?'<span class="kcard-winner">&#10003; '+c.winnerName+'</span>':'')+
    '</div></div>'
  ).join('');
  grid.querySelectorAll('.kcard:not(.matched)').forEach(el=>{
    el.addEventListener('click',()=>pickCard(Number(el.dataset.id)));
  });
}
async function pickCard(cardId){
  const snap=await G.roomRef.once('value');const d=snap.val();
  if(d.status!=='playing')return;
  const tc=d.tableCards||[];const card=tc.find(c=>c.id===cardId);
  if(!card||card.matched)return;
  const correct=card.card===d.currentRead.card&&card.poet===d.currentRead.poet;
  if(correct){
    card.matched=true;card.winnerId=G.myUid;card.winnerName=G.myProfile.username;
    const players=d.players||{};if(players[G.myUid])players[G.myUid].score=(players[G.myUid].score||0)+1;
    const nextR=(d.round||0)+1;const ended=nextR>=d.deck.length||tc.filter(c=>!c.matched).length<=1;
    await G.roomRef.update({tableCards:tc,players,status:ended?'ended':'playing',round:ended?d.round:nextR,currentRead:ended?d.currentRead:d.deck[nextR]});
    G.db.ref('users/'+G.myUid+'/stats').transaction(s=>{if(!s)s={gamesPlayed:0,gamesWon:0,cardsWon:0};s.cardsWon=(s.cardsWon||0)+1;return s;});
    toast('✓ صحيح! أحسنت!');
  }else{
    const el=[...document.querySelectorAll('.kcard')].find(e=>e.querySelector('.kcard-verse')&&e.querySelector('.kcard-verse').textContent===card.card);
    if(el){el.classList.add('wrong');setTimeout(()=>el.classList.remove('wrong'),450);}
    toast('✗ خطأ! حاول مجدداً');
  }
}
async function renderResult(d){
  stopAudio();show('result');
  const ps=Object.entries(d.players||{}).map(([uid,p])=>({uid,name:p.name,avatar:p.avatar,photoURL:p.photoURL,score:p.score||0})).sort((a,b)=>b.score-a.score);
  document.getElementById('result-sub').textContent=ps.length?ps[0].name+' wins with '+ps[0].score+' cards!':'Game over!';
  const cols=['#8b1a1a','#6b5010','#2d5a27','#534ab7','#1d9e75'],hts=[130,95,75,60,50];
  const ord=ps.length>=3?[ps[1],ps[0],ps[2]]:ps;
  const hs=ps.length>=3?[hts[1],hts[0],hts[2]]:[hts[0]];
  const cs=ps.length>=3?[cols[1],cols[0],cols[2]]:[cols[0]];
  document.getElementById('podium').innerHTML=ord.map((p,i)=>
    '<div class="podium-item"><div style="font-size:22px;margin-bottom:4px;">'+avHTML(p,'36px')+'</div>'+
    '<div class="podium-bar" style="height:'+hs[i]+'px;background:'+cs[i]+'">'+p.score+'</div>'+
    '<div class="podium-name">'+p.name+'</div></div>'
  ).join('');
  document.getElementById('again-btn').style.display=G.isHost?'inline-block':'none';
  if(ps.length&&ps[0].uid===G.myUid)G.db.ref('users/'+G.myUid+'/stats').transaction(s=>{if(!s)s={gamesPlayed:0,gamesWon:0,cardsWon:0};s.gamesWon=(s.gamesWon||0)+1;return s;});
  if(d.players&&d.players[G.myUid])G.db.ref('users/'+G.myUid+'/stats/gamesPlayed').transaction(v=>(v||0)+1);
}
function playSolo(){showDeckSelect('solo');}
function _playSoloAfterDeck(){
  G.isHost=true;clearSubs();stopAudio();G.lastGameRound=-2;
  const dk=getDeck(G.selectedDeckId);
  const count=Math.min(G.selectedCardCount,dk.poems.length);
  let deck=shuffle([...dk.poems]).slice(0,count);
  let cards=deck.map((p,i)=>({...p,id:i,matched:false}));
  let round=0,score=0;
  const introSrc=dk.introAudio[Math.floor(Math.random()*Math.max(1,dk.introAudio.length))]||'';
  function startSolo(){
    show('game');G.lastGameRound=-2;
    document.getElementById('skip-btn').style.display='inline-block';
    document.getElementById('skip-btn').onclick=()=>{stopAudio();G.lastGameRound=-2;round++;next();};
    next();
  }
  function next(){
    if(round>=deck.length||cards.filter(c=>!c.matched).length===0){
      stopAudio();show('result');
      document.getElementById('result-sub').textContent='جمعت '+score+' / '+deck.length+' بطاقة!';
      document.getElementById('podium').innerHTML='<div class="podium-item"><div style="font-size:22px;">'+avHTML(G.myProfile,'36px')+'</div><div class="podium-bar" style="height:130px;background:#8b1a1a">'+score+'</div><div class="podium-name">'+G.myProfile.username+'</div></div>';
      document.getElementById('again-btn').style.display='inline-block';
      document.getElementById('again-btn').onclick=()=>playSolo();
      G.db.ref('users/'+G.myUid+'/stats').transaction(s=>{if(!s)s={gamesPlayed:0,gamesWon:0,cardsWon:0};s.gamesPlayed=(s.gamesPlayed||0)+1;s.cardsWon=(s.cardsWon||0)+score;return s;});
      return;
    }
    const cur=deck[round];
    document.getElementById('reader-verse').textContent=cur.read;
    document.getElementById('reader-poet').textContent='— '+cur.poet;
    document.getElementById('round-tag').textContent='بيت '+(round+1)+' / '+deck.length;
    document.getElementById('scores').innerHTML='<div class="chip me">'+avHTML(G.myProfile,'18px')+' '+G.myProfile.username+': <span>'+score+'</span></div>';
    if(cur.audio&&round!==G.lastGameRound){
      G.lastGameRound=round;stopAudio();const a=new Audio(cur.audio);G.curAudio=a;
      document.getElementById('reading-now').classList.add('show');a.play().catch(()=>{});
      a.addEventListener('ended',()=>{document.getElementById('reading-now').classList.remove('show');if(G.curAudio===a)G.curAudio=null;});
    }
    const grid=document.getElementById('cards-grid');
    grid.innerHTML=[...shuffle([...cards.filter(c=>!c.matched)]),...cards.filter(c=>c.matched)].map(c=>
      '<div class="kcard'+(c.matched?' matched':'')+'" data-id="'+c.id+'">'+
      '<div class="kcard-body"><div class="kcard-verse">'+c.card+'</div></div>'+
      '<div class="kcard-footer"><span class="kcard-poet">'+c.poet+'</span></div></div>'
    ).join('');
    grid.querySelectorAll('.kcard:not(.matched)').forEach(el=>{
      el.addEventListener('click',()=>{
        const id=Number(el.dataset.id);const card=cards.find(c=>c.id===id);if(!card||card.matched)return;
        if(card.card===deck[round].card&&card.poet===deck[round].poet){
          card.matched=true;score++;toast('✓ صحيح! أحسنت!');stopAudio();G.lastGameRound=-2;round++;setTimeout(next,800);
        }else{el.classList.add('wrong');setTimeout(()=>el.classList.remove('wrong'),450);toast('✗ خطأ! حاول مجدداً');}
      });
    });
  }
  if(introSrc){
    show('intro');
    document.getElementById('intro-num').textContent=dk.icon;
    document.getElementById('intro-lbl').innerHTML=dk.name+'<br><small>الوضع المنفرد</small>';
    document.getElementById('skip-intro-btn').style.display='block';
    document.getElementById('tap-play-btn').style.display='none';
    document.getElementById('wave').classList.remove('still');
    const oldS=document.getElementById('skip-intro-btn');const newS=oldS.cloneNode(true);
    oldS.parentNode.replaceChild(newS,oldS);
    newS.addEventListener('click',()=>{stopAudio();document.getElementById('tap-play-btn').style.display='none';startSolo();});
    document.getElementById('tap-play-btn').addEventListener('click',()=>{if(G.curAudio){G.curAudio.play().catch(()=>{});document.getElementById('tap-play-btn').style.display='none';document.getElementById('wave').classList.remove('still');}},{once:true});
    const a=new Audio(introSrc);G.curAudio=a;
    const pp=a.play();if(pp!==undefined)pp.catch(()=>{document.getElementById('wave').classList.add('still');document.getElementById('intro-status').textContent='اضغط للاستماع';document.getElementById('tap-play-btn').style.display='block';});
    a.addEventListener('timeupdate',()=>{const r=Math.ceil((a.duration||0)-a.currentTime);if(!isNaN(r)&&r>0)document.getElementById('intro-status').textContent='🎙 يُقرأ الآن — '+r+'s';});
    a.addEventListener('ended',()=>{if(G.curAudio!==a)return;document.getElementById('wave').classList.add('still');runCountdown(3,startSolo);});
  }else{startSolo();}
}
function leaveGame(){leaveLobby();}


/* ═══════════════════════════════════════
   §CARDS BROWSER
   Independent from game deck/count selection.
   Always shows every poem in the chosen deck.
═══════════════════════════════════════ */

// Browser keeps its own deck state — never linked to G.selectedDeckId
let _browseDeckId = DECKS[0].id;

function showCardsBrowser(){
  // Reset search and always start fresh — independent of game settings
  const searchEl = document.getElementById('browser-search');
  if(searchEl) searchEl.value = '';
  _renderBrowserTabs();
  _renderBrowserCards(_browseDeckId);
  show('cards-browser');
}

function _renderBrowserTabs(){
  const tabs = document.getElementById('browser-tabs');
  tabs.innerHTML = '';
  DECKS.forEach(deck=>{
    const btn = document.createElement('button');
    btn.className = 'browser-tab' + (deck.id === _browseDeckId ? ' active' : '');
    btn.style.setProperty('--deck-color', deck.color);
    btn.innerHTML = deck.icon + ' ' + deck.name;
    btn.addEventListener('click', ()=>{
      _browseDeckId = deck.id;
      tabs.querySelectorAll('.browser-tab').forEach(b => b.classList.toggle('active', b === btn));
      const searchEl = document.getElementById('browser-search');
      if(searchEl) searchEl.value = ''; // clear search on tab switch
      _renderBrowserCards(deck.id);
    });
    tabs.appendChild(btn);
  });
}

function _renderBrowserCards(deckId){
  const deck = getLibraryDeck(deckId); // uses LIBRARY_DECKS poems, not game DECKS
  const container = document.getElementById('browser-cards');
  const q = (document.getElementById('browser-search') || {value:''}).value.toLowerCase();

  // Always use ALL library poems — completely independent from game card count
  const allPoems = deck.poems;
  const filtered = allPoems.filter(p =>
    !q || p.read.includes(q) || p.card.includes(q) || p.poet.includes(q)
  );

  container.innerHTML = '';

  // Deck header
  const header = document.createElement('div');
  header.style.cssText = 'text-align:center;padding:1.5rem 0 1rem;';
  header.innerHTML =
    '<div style="font-size:48px;margin-bottom:.5rem;">' + deck.icon + '</div>' +
    '<h2 style="font-family:Amiri,serif;font-size:26px;color:' + deck.color + ';">' + deck.name + '</h2>' +
    '<p style="font-size:13px;color:var(--ink-dim);margin:.25rem 0;">' + deck.desc + '</p>' +
    '<p style="font-size:12px;color:var(--ink-dim);direction:ltr;">' +
      filtered.length + ' / ' + allPoems.length + ' أبيات' +
    '</p>';
  container.appendChild(header);

  if(!filtered.length){
    container.innerHTML += '<div class="empty-state">لا توجد نتائج</div>';
    return;
  }

  // Each poem shown as a single combined card — click opens detail modal
  const grid = document.createElement('div');
  grid.className = 'poem-list';

  filtered.forEach(p => {
    const card = document.createElement('div');
    card.className = 'poem-list-item';
    card.style.setProperty('--deck-color', deck.color);
    card.innerHTML =
      '<div class="poem-list-verses">' +
        '<div class="poem-list-read amiri">' + p.read + '</div>' +
        '<div class="poem-list-card amiri">' + p.card + '</div>' +
      '</div>' +
      '<div class="poem-list-poet">' +
        '<span>— ' + p.poet + '</span>' +
        '<span class="poem-list-hint">اضغط لعرض البطاقتين</span>' +
      '</div>';

    card.addEventListener('click', () => _openPoemDetail(p, deck));
    grid.appendChild(card);
  });

  container.appendChild(grid);
}

// Opens a full-screen modal showing both game cards rendered on card.png.
// Each poem can have its own cardImg — falls back to img/card.png.
function _openPoemDetail(p, deck){
  const cardImg = (p.cardImg || 'img/card.png');
  // Use single quotes inside url() so they don't collide with the HTML double-quote attribute
  const bgStyle = "background-image:url('" + cardImg + "')";

  document.getElementById('modal-bg').classList.add('open','modal-wide');
  document.getElementById('modal-title').textContent = '— ' + p.poet;

  const body = document.getElementById('modal-body');
  body.innerHTML = '';

  const row = document.createElement('div');
  row.className = 'lib-cards-row';

  [[p.read, 'بطاقة القراءة · Reading'],[p.card, 'بطاقة اللعب · Playing']].forEach(([verse,label])=>{
    const wrap = document.createElement('div');
    wrap.className = 'lib-card-wrap';

    const lbl = document.createElement('div');
    lbl.className = 'lib-card-type';
    lbl.textContent = label;

    const img = document.createElement('div');
    img.className = 'lib-card-img';
    img.setAttribute('style', bgStyle);

    const v = document.createElement('div');
    v.className = 'lib-card-verse amiri';
    v.textContent = verse;

    const poet = document.createElement('div');
    poet.className = 'lib-card-poet';
    poet.textContent = p.poet;

    img.appendChild(v);
    img.appendChild(poet);
    wrap.appendChild(lbl);
    wrap.appendChild(img);
    row.appendChild(wrap);
  });

  body.appendChild(row);
}

function onBrowserSearch(){ _renderBrowserCards(_browseDeckId); }


/* ═══════════════════════════════════════
   §DECK SELECT
═══════════════════════════════════════ */
let _deckSelectCaller='create';
function showDeckSelect(caller){_deckSelectCaller=caller;_renderDeckSelect();show('deck-select');}
function _renderDeckSelect(){
  const grid=document.getElementById('deck-options');grid.innerHTML='';
  DECKS.forEach(deck=>{
    const card=document.createElement('div');card.className='deck-card'+(G.selectedDeckId===deck.id?' selected':'');
    card.style.setProperty('--deck-color',deck.color);card.dataset.id=deck.id;
    card.innerHTML='<div class="deck-icon">'+deck.icon+'</div><div class="deck-name">'+deck.name+'</div>'+
      '<div class="deck-name-en">'+deck.nameEn+'</div><div class="deck-desc">'+deck.desc+'</div>'+
      '<div class="deck-count">'+deck.poems.length+' بطاقة</div>';
    card.addEventListener('click',()=>{
      G.selectedDeckId=deck.id;
      document.querySelectorAll('.deck-card').forEach(c=>c.classList.toggle('selected',c.dataset.id===deck.id));
      _renderCountOptions(deck.poems.length);
    });
    grid.appendChild(card);
  });
  _renderCountOptions(getDeck(G.selectedDeckId).poems.length);
}
function _renderCountOptions(maxCount){
  const wrap=document.getElementById('count-options');wrap.innerHTML='';
  if(G.selectedCardCount>maxCount)G.selectedCardCount=maxCount;
  [{label:'٨ بطاقات',value:8},{label:'١٦ بطاقة',value:16},{label:'الكاملة ('+maxCount+')',value:maxCount}]
    .filter((o,i,a)=>a.findIndex(x=>x.value===o.value)===i&&o.value<=maxCount)
    .forEach(opt=>{
      const btn=document.createElement('button');btn.className='count-opt'+(G.selectedCardCount===opt.value?' selected':'');
      btn.textContent=opt.label;
      btn.addEventListener('click',()=>{G.selectedCardCount=opt.value;wrap.querySelectorAll('.count-opt').forEach(b=>b.classList.toggle('selected',b===btn));});
      wrap.appendChild(btn);
    });
}
function confirmDeckSelection(){
  switch(_deckSelectCaller){
    case 'create':      _openCreateAfterDeck();      break;
    case 'solo':        _playSoloAfterDeck();         break;
    case 'matchmaking': _startMatchmakingAfterDeck(); break;
    case 'invite':
      if(G.pendingInviteTarget)_sendGameInviteAfterDeck(G.pendingInviteTarget.uid,G.pendingInviteTarget.name);
      break;
  }
}


/* ═══════════════════════════════════════
   §ADMIN
═══════════════════════════════════════ */
async function showAdmin(){
  if(!G.myProfile.isAdmin){toast('ليس لديك صلاحية');return;}
  show('admin');
  const snap=await G.db.ref('users').once('value');G.allUsersCache=snap.val()||{};renderAdminTable(G.allUsersCache);
  const rsnap=await G.db.ref('rooms').once('value');const rooms=rsnap.val()||{};
  const active=Object.entries(rooms).filter(([,r])=>r.status!=='ended');
  const div=document.getElementById('admin-rooms');
  if(!active.length){div.innerHTML='<div class="empty-state">لا توجد غرف نشطة</div>';return;}
  div.innerHTML='';
  active.forEach(([code,r])=>{
    const row=document.createElement('div');row.className='friend-item';
    const dk=getDeck(r.deckId||'muallaqat');
    row.innerHTML='<div style="flex:1;"><strong>'+code+'</strong> '+dk.icon+'<span style="font-size:12px;color:var(--ink-dim);margin-right:8px;"> '+r.status+' · '+Object.keys(r.players||{}).length+' لاعبين · '+dk.name+'</span></div>';
    const b=document.createElement('button');b.className='btn sm danger';b.textContent='إغلاق';
    b.addEventListener('click',async()=>{await G.db.ref('rooms/'+code).remove();toast('✓ أُغلقت '+code);b.closest('.friend-item').remove();});
    row.appendChild(b);div.appendChild(row);
  });
}
function renderAdminTable(users){
  const tbody=document.getElementById('admin-tbody');tbody.innerHTML='';
  Object.entries(users).forEach(([uid,u])=>{
    const tr=document.createElement('tr');tr.dataset.name=(u.username||'').toLowerCase();tr.dataset.email=(u.email||'').toLowerCase();
    tr.innerHTML='<td>'+(u.photoURL?'<img src="'+u.photoURL+'" style="width:24px;height:24px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-left:6px;"/>':u.avatar||'🦁')+(u.username||'—')+'</td>'+
      '<td style="direction:ltr;font-size:12px;">'+(u.email||'—')+'</td><td>'+(u.stats&&u.stats.gamesPlayed||0)+'</td><td>'+(u.stats&&u.stats.cardsWon||0)+'</td>'+
      '<td>'+(u.banned?'<span class="ban-tag">محظور</span>':'<span class="ok-tag">نشط</span>')+(u.isAdmin?'<span class="admin-tag" style="margin-right:4px;">ADMIN</span>':'')+'</td><td></td>';
    const actions=tr.lastElementChild;
    if(uid!==G.myUid){
      if(u.banned){const b=document.createElement('button');b.className='btn sm primary';b.textContent='رفع الحظر';b.addEventListener('click',async()=>{await G.db.ref('users/'+uid+'/banned').set(false);toast('✓ رُفع الحظر');showAdmin();});actions.appendChild(b);}
      else{const b=document.createElement('button');b.className='btn sm danger';b.textContent='حظر';b.addEventListener('click',async()=>{if(!confirm('حظر هذا المستخدم؟'))return;await G.db.ref('users/'+uid+'/banned').set(true);toast('✓ تم الحظر');showAdmin();});actions.appendChild(b);}
      if(!u.isAdmin){const b=document.createElement('button');b.className='btn sm blue-btn';b.style.marginRight='4px';b.textContent='ترقية';b.addEventListener('click',async()=>{if(!confirm('ترقية إلى مشرف؟'))return;await G.db.ref('users/'+uid+'/isAdmin').set(true);toast('✓ تمت الترقية');showAdmin();});actions.appendChild(b);}
    }else{actions.textContent='أنت';actions.style.cssText='color:var(--ink-dim);font-size:11px;';}
    tbody.appendChild(tr);
  });
}
function filterAdminTable(){const q=document.getElementById('admin-search').value.toLowerCase();document.querySelectorAll('#admin-tbody tr').forEach(tr=>{tr.style.display=(tr.dataset.name.includes(q)||tr.dataset.email.includes(q))?'':'none';});}


/* ═══════════════════════════════════════
   §SETTINGS  —  themes, backgrounds, persistence
═══════════════════════════════════════ */

function showSettings(){
  _renderThemeOptions();
  _renderBgOptions();
  show('settings');
}

function _renderThemeOptions(){
  const wrap = document.getElementById('theme-options');
  if(!wrap) return;
  wrap.innerHTML = '';
  const saved = localStorage.getItem('karuta-theme') || 'emerald';
  THEMES.forEach(t=>{
    const btn = document.createElement('button');
    btn.className = 'theme-swatch' + (t.id === saved ? ' selected' : '');
    btn.title = t.nameEn;
    btn.innerHTML =
      '<div class="swatch-colors">' +
        t.swatch.map(col=>'<span style="background:'+col+'"></span>').join('') +
      '</div>' +
      '<div class="swatch-name">' + t.name + '</div>' +
      '<div class="swatch-desc">' + t.desc + '</div>';
    btn.addEventListener('click', ()=>{
      applyTheme(t.id);
      wrap.querySelectorAll('.theme-swatch').forEach(b=>b.classList.toggle('selected', b===btn));
      localStorage.setItem('karuta-theme', t.id);
    });
    wrap.appendChild(btn);
  });
}

function _renderBgOptions(){
  const wrap = document.getElementById('bg-options');
  if(!wrap) return;
  wrap.innerHTML = '';
  const saved = localStorage.getItem('karuta-bg') || 'grid';
  BACKGROUNDS.forEach(bg=>{
    const btn = document.createElement('button');
    btn.className = 'bg-swatch' + (bg.id === saved ? ' selected' : '');
    const previewStyle = bg.isPhoto
      ? 'background-image:url("' + bg.src + '");background-size:cover;background-position:center;'
      : '';
    btn.innerHTML =
      '<div class="bg-preview bg-preview-' + bg.id + '" style="' + previewStyle + '"></div>' +
      '<div class="swatch-name">' + bg.emoji + ' ' + bg.name + '</div>' +
      (bg.isPhoto ? '<div class="swatch-desc" style="font-size:10px;">' + bg.src + '</div>' : '');
    btn.addEventListener('click', ()=>{
      applyBackground(bg.id);
      wrap.querySelectorAll('.bg-swatch').forEach(b=>b.classList.toggle('selected', b===btn));
      localStorage.setItem('karuta-bg', bg.id);
    });
    wrap.appendChild(btn);
  });
}

function applyTheme(id){
  // Remove all theme classes, add the chosen one
  document.body.classList.remove(...THEMES.map(t=>'theme-'+t.id));
  document.body.classList.add('theme-'+id);
}

function applyBackground(id){
  // Remove all bg classes and any photo background
  document.body.classList.remove(...BACKGROUNDS.map(b=>'bg-'+b.id));
  document.body.style.removeProperty('--bg-photo');
  document.body.classList.remove('bg-photo-active');

  const bg = BACKGROUNDS.find(b=>b.id===id);
  if(bg && bg.isPhoto){
    // Photo background — set CSS variable for body::before
    document.body.style.setProperty('--bg-photo', 'url("' + bg.src + '")');
    document.body.classList.add('bg-photo-active');
  } else {
    document.body.classList.add('bg-'+id);
  }
}

function loadSavedPreferences(){
  const theme = localStorage.getItem('karuta-theme') || 'emerald';
  const bg    = localStorage.getItem('karuta-bg')    || 'grid';
  applyTheme(theme);
  applyBackground(bg);
}


/* ═══════════════════════════════════════
   §MAIN  —  entry point
   loadPartials() fetches html/*.html and
   injects them before wiring any buttons.
═══════════════════════════════════════ */

function goHome(){
  clearSubs();stopAudio();G.lastGameRound=-2;cancelMatchmaking();
  document.getElementById('join-panel').style.display='none';
  updateNavAvatar();
  document.getElementById('nav-admin').style.display=G.myProfile.isAdmin?'inline':'none';
  // Settings icon always visible once logged in
  listenForInvites();
  show('home');
}

document.addEventListener('DOMContentLoaded',()=>{

  // 0. Apply saved theme + background immediately (before Firebase)
  loadSavedPreferences();

  // 1. Init Firebase
  try{
    const app=firebase.initializeApp(FIREBASE_CONFIG);
    G.db=firebase.database(app);G.auth=firebase.auth(app);
  }catch(e){console.warn('Firebase:',e.message);}

  // 3. Auth state observer (runs AFTER html is ready)
  G.auth&&G.auth.onAuthStateChanged(async user=>{
    if(user){
      G.myUid=user.uid;G.myEmail=user.email;
      await loadMyProfile();
      if(G.myProfile.banned){await G.auth.signOut();toast('حسابك محظور.');show('auth');return;}
      G.db.ref('users/'+G.myUid+'/online').set(true);
      G.db.ref('users/'+G.myUid+'/online').onDisconnect().set(false);
      goHome();
    }else{
      G.myUid='';G.myEmail='';
      G.myProfile={username:'',avatar:'🦁',bio:'',photoURL:'',isAdmin:false,friends:{},stats:{}};
      show('auth');
    }
  });

  // 4. Wire all buttons (no inline onclick anywhere — all CSP-safe)

  // AUTH
  document.getElementById('tab-login').addEventListener('click',()=>switchTab('login'));
  document.getElementById('tab-register').addEventListener('click',()=>switchTab('register'));
  document.getElementById('login-btn').addEventListener('click',doLogin);
  document.getElementById('register-btn').addEventListener('click',doRegister);
  document.getElementById('l-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doLogin();});
  document.getElementById('r-pass').addEventListener('keydown',e=>{if(e.key==='Enter')doRegister();});

  // HOME NAV
  document.getElementById('home-brand').addEventListener('click',goHome);
  document.getElementById('nav-friends').addEventListener('click',showFriends);
  document.getElementById('nav-profile').addEventListener('click',()=>showProfile());
  document.getElementById('nav-admin').addEventListener('click',showAdmin);
  document.getElementById('nav-avatar').addEventListener('click',()=>showProfile());
  document.getElementById('nav-logout').addEventListener('click',doLogout);
  document.getElementById('nav-cards-browser').addEventListener('click',showCardsBrowser);
  document.getElementById('nav-settings').addEventListener('click',showSettings);

  // HOME GAME BUTTONS
  document.getElementById('btn-create').addEventListener('click',openCreate);
  document.getElementById('btn-join-toggle').addEventListener('click',()=>{const p=document.getElementById('join-panel');p.style.display=p.style.display==='none'?'block':'none';});
  document.getElementById('btn-do-join').addEventListener('click',joinRoom);
  document.getElementById('btn-matchmake').addEventListener('click',startMatchmaking);
  document.getElementById('btn-solo').addEventListener('click',playSolo);
  document.getElementById('join-code').addEventListener('keydown',e=>{if(e.key==='Enter')joinRoom();});
  document.getElementById('join-code').addEventListener('input',e=>{e.target.value=e.target.value.toUpperCase().replace(/[^A-Z0-9]/g,'');});

  // PROFILE
  document.getElementById('profile-back').addEventListener('click',goHome);
  document.getElementById('profile-logout').addEventListener('click',doLogout);
  document.getElementById('save-profile-btn').addEventListener('click',saveProfile);
  document.getElementById('remove-photo-btn').addEventListener('click',removePhoto);
  document.getElementById('photo-input').addEventListener('change',function(){handlePhotoUpload(this);});
  buildAvatarGrid();

  // FRIENDS
  document.getElementById('friends-back').addEventListener('click',goHome);
  document.getElementById('search-btn').addEventListener('click',searchUser);
  document.getElementById('friend-search').addEventListener('keydown',e=>{if(e.key==='Enter')searchUser();});

  // DECK SELECT
  document.getElementById('deck-select-back').addEventListener('click',goHome);
  document.getElementById('deck-cancel-btn').addEventListener('click',goHome);
  document.getElementById('deck-confirm-btn').addEventListener('click',confirmDeckSelection);

  // CARDS BROWSER
  document.getElementById('browser-back').addEventListener('click',goHome);
  document.getElementById('browser-search').addEventListener('input',onBrowserSearch);

  // MATCHMAKING
  document.getElementById('mm-back').addEventListener('click',()=>{cancelMatchmaking();goHome();});
  document.getElementById('btn-cancel-mm').addEventListener('click',()=>{cancelMatchmaking();goHome();});

  // LOBBY
  document.getElementById('lobby-back').addEventListener('click',leaveLobby);
  document.getElementById('leave-lobby-btn').addEventListener('click',leaveLobby);
  document.getElementById('copy-invite-btn').addEventListener('click',copyInvite);
  document.getElementById('start-btn').addEventListener('click',hostStart);

  // INTRO — skip + tap-to-play (CSP-safe)
  document.getElementById('skip-intro-btn').addEventListener('click',()=>{
    stopAudio();document.getElementById('tap-play-btn').style.display='none';
    if(G.isHost&&G.roomRef)G.roomRef.update({status:'playing'});
  });
  document.getElementById('tap-play-btn').addEventListener('click',()=>{
    if(G.curAudio){G.curAudio.play().catch(()=>{});document.getElementById('tap-play-btn').style.display='none';document.getElementById('wave').classList.remove('still');}
  });

  // GAME
  document.getElementById('skip-btn').addEventListener('click',hostSkip);
  document.getElementById('leave-game-btn').addEventListener('click',leaveGame);

  // RESULT
  document.getElementById('again-btn').addEventListener('click',hostRestart);
  document.getElementById('result-lobby-btn').addEventListener('click',leaveLobby);

  // SETTINGS
  document.getElementById('settings-back').addEventListener('click',goHome);

  // ADMIN
  document.getElementById('admin-back').addEventListener('click',goHome);
  document.getElementById('admin-search').addEventListener('input',filterAdminTable);

  // MODAL
  document.getElementById('modal-close-btn').addEventListener('click',closeModal);
  document.getElementById('modal-bg').addEventListener('click',e=>{if(e.target===document.getElementById('modal-bg'))closeModal();});

  // AUTO-JOIN FROM URL  e.g. ?room=ABCD
  const urlRoom=new URLSearchParams(location.search).get('room');
  if(urlRoom&&urlRoom.length===4){
    document.getElementById('join-code').value=urlRoom.toUpperCase();
    document.getElementById('join-panel').style.display='block';
    toast('رمز الغرفة جاهز — سجّل دخولك ثم انضم!');
  }

});
