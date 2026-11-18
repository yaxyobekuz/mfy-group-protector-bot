/**
 * BOT MATNLARI — YAGONA MANBA.
 *
 * ⚠️ MATN KOD ICHIDA YOZILMAYDI. Sabab tugmalarda ko'rinadi: oddiy
 * klaviatura tugmasi — bu MATNLI XABAR va biz uni nom bo'yicha
 * taniymiz. Tugma matni ikki joyda yozilsa (klaviaturada va
 * tekshiruvda), ular ajralib ketganda tugma shunchaki ISHLAMAY
 * qoladi — xato ham chiqmaydi.
 *
 * ⚠️ TUGMA MATNLARI O'ZARO TAKRORLANMASLIGI KERAK. Bir xil satr
 * bo'lsa, bosilgan tugma boshqa oqimni ochib yuborardi.
 *
 * ⚠️ BOT FUQARO UCHUN. Bu yerda "xodim", "ruxsat", "hisobingiz
 * bog'lanmagan" degan matnlar YO'Q va bo'lmaydi: fuqaro botga
 * yozganida u allaqachon tanilgan va undan boshqa hech narsa talab
 * qilinmaydi (mini-ilova va mobil ilova bilan AYNI qoida).
 */

export const BUTTONS = {
  SUBMIT_ISSUE: "📝 Murojaat yuborish",
  MY_ISSUES: "📋 Murojaatlarim",
  PROFILE: "👤 Profilim",
  HELP: "ℹ️ Yordam",

  // ── Oqim ichidagi tugmalar ──────────────────────────────────────
  CANCEL: "❌ Bekor qilish",
  SKIP: "⏭ O'tkazib yuborish",
  DONE: "✅ Tayyor",
  SEND: "📨 Yuborish",

  // ⚠️ AI TAKLIFINI TASDIQLASH — ALOHIDA TUGMA: taklif QAROR emas,
  // fuqaroning O'ZI tasdiqlaydi (CLAUDE.md — "mobil AI: taklif,
  // qaror emas").
  AI_ACCEPT: "✅ Ha, shu yo'nalish",
  AI_PICK: "📂 Boshqa yo'nalish",

  // ⚠️ BAYROQLAR — TAXMIN, ustuvorlikni O'ZGARTIRMAYDI: panelda
  // faqat ko'rsatiladi (CLAUDE.md).
  FLAG_HAZARD: "⚠️ Xavfli",
  FLAG_LONG: "🕰 Uzoq davom etyapti",
  FLAG_REPEAT: "🔁 Takroriy murojaat",
} as const;

/** Tugma matnlari to'plami — menyu bosilganini aniqlash uchun. */
export const BUTTON_VALUES: ReadonlySet<string> = new Set(Object.values(BUTTONS));

/** Asosiy menyu tugmalari — oqimni TASHLAB KETADI. */
export const MENU_VALUES: ReadonlySet<string> = new Set<string>([
  BUTTONS.SUBMIT_ISSUE,
  BUTTONS.MY_ISSUES,
  BUTTONS.PROFILE,
  BUTTONS.HELP,
]);

/** Fuqaroga ko'rinadigan holat nomlari. */
export const STATUS_LABELS: Record<string, string> = {
  new: "🆕 Qabul qilindi",
  in_progress: "⏳ Bajarilmoqda",
  resolved: "✅ Hal qilindi",
  rejected: "❌ Rad etildi",
};

export const TEXTS = {
  // ── KIRISH ──────────────────────────────────────────────────────
  START: (name: string) =>
    [
      `Assalomu alaykum, ${name}!`,
      "",
      "Bu bot orqali <b>muammo va murojaatlaringizni</b> to'g'ridan-to'g'ri",
      "E Murojaat tizimiga yuborishingiz mumkin.",
      "",
      "Murojaatingiz ko'rib chiqiladi va <b>javob shu chatga</b> keladi.",
      "",
      "Boshlash uchun «📝 Murojaat yuborish» tugmasini bosing.",
    ].join("\n"),

  HELP: [
    "<b>Bot qanday ishlaydi</b>",
    "",
    "1️⃣ <b>Murojaat yuborish</b> — muammoni yozasiz, surat yoki video",
    "   qo'shasiz, joyini belgilaysiz. Murojaat shtab paneliga tushadi.",
    "",
    "2️⃣ <b>Murojaatlarim</b> — yuborganlaringiz va ularning holati:",
    "   qabul qilindi → bajarilmoqda → hal qilindi.",
    "",
    "3️⃣ <b>Profilim</b> — tuman va MFY ni ko'rsatsangiz, murojaat",
    "   to'g'ri hududga tezroq yetib boradi.",
    "",
    "<b>Javob qayerga keladi?</b>",
    "Shu chatga. Alohida hech qayerga qarashingiz shart emas.",
    "",
    "<i>Murojaatingiz uchun ball beriladi — reytingda ko'rinadi.</i>",
  ].join("\n"),

  // ── MUROJAAT: 1-QADAM, MATN ─────────────────────────────────────
  //
  // ⚠️ MATN BIRINCHI, YO'NALISH KEYIN: mini-ilovada yo'nalish
  // birinchi, chunki u yerda ekranda butun ro'yxat ko'rinadi. Botda
  // esa AI matndan yo'nalishni TAKLIF qila oladi va bu fuqarodan
  // 12 ta tugmani o'qishni talab qilmaydi.
  ASK_BODY: (min: number, max: number) =>
    [
      "<b>Muammoni batafsil yozing.</b>",
      "",
      "Nima bo'ldi, qayerda, qachondan beri davom etyapti?",
      "",
      `<i>${min}–${max} belgi.</i>`,
    ].join("\n"),

  BODY_TOO_SHORT: (min: number) =>
    `Matn juda qisqa. Kamida ${min} ta belgi yozing — qisqa matndan muammoni tushunib bo'lmaydi.`,

  /**
   * ⚠️ UZUN MATN KESILMAYDI, QAYTA YOZISH TAKLIF QILINADI: kesilsa
   * odam yozganining yarmi JIMGINA yo'qolardi va u buni bilmasdi.
   */
  BODY_TOO_LONG: (max: number, actual: number) =>
    [
      `Matn juda uzun: ${actual} ta belgi (eng ko'pi ${max}).`,
      "",
      "Eng muhim qismini qoldirib, qisqartirib yuboring.",
    ].join("\n"),

  // ── MUROJAAT: 2-QADAM, YO'NALISH ────────────────────────────────
  AI_THINKING: "🤖 Yo'nalish aniqlanmoqda…",

  /**
   * ⚠️ TAKLIF — QAROR EMAS: fuqaro uni tasdiqlaydi yoki o'zi
   * tanlaydi. Shuning uchun matn SAVOL shaklida va ikkala yo'l ham
   * ochiq turadi (CLAUDE.md — "odam qarori oqimdan chiqmaydi").
   */
  /**
   * ⚠️ ASOSIY YO'NALISH HAM KO'RSATILADI ("Kommunal xizmatlar →
   * Ichimlik suvi"): yakka "Ichimlik suvi" degan taklif kontekstsiz
   * qolardi va fuqaro uni "Tozalik" bilan adashtirishi mumkin edi.
   */
  AI_SUGGESTION: (category: string, parent: string | null, org: string | null) =>
    [
      "Murojaatingiz quyidagi yo'nalishga tegishli ko'rinadi:",
      "",
      parent
        ? `📂 ${escapeHtml(parent)} → <b>${escapeHtml(category)}</b>`
        : `📂 <b>${escapeHtml(category)}</b>`,
      org ? `🏛 ${escapeHtml(org)}` : null,
      "",
      "To'g'rimi?",
    ]
      .filter((line) => line !== null)
      .join("\n"),

  PICK_CATEGORY: "Murojaat <b>yo'nalishini</b> tanlang:",

  /**
   * IKKINCHI QADAM — KICHIK YO'NALISH.
   *
   * ⚠️ TANLANGAN ASOSIY YO'NALISH NOMI QAYTA KO'RSATILADI: fuqaro
   * ikki ekran o'tgandan keyin "men nimani bosgandim" degan savolga
   * tushib qolmasligi kerak. Telegram'da oldingi xabar ko'rinmay
   * ketishi mumkin.
   */
  PICK_SUBCATEGORY: (parent: string) =>
    [
      `📂 <b>${escapeHtml(parent)}</b>`,
      "",
      "Endi <b>aniqroq</b> yo'nalishni tanlang:",
    ].join("\n"),

  /**
   * ⚠️ KATEGORIYA YO'Q — OQIM BOSHLANMAYDI. Serverda `categoryId`
   * majburiy va kategoriyasiz so'rov baribir rad etilardi. Buni
   * oldindan aytish fuqaroni matn yozib, keyin xato olishdan
   * saqlaydi.
   */
  NO_CATEGORIES:
    "Hozircha murojaat yo'nalishlari sozlanmagan. Keyinroq urinib ko'ring.",

  CATEGORY_NOT_FOUND:
    "Bu yo'nalish topilmadi. Ro'yxatdagi tugmalardan birini tanlang.",

  // ── MUROJAAT: 3-QADAM, SURAT/VIDEO ──────────────────────────────
  //
  // ⚠️ FAYL — DALIL: "chiqindi uyumi" degan murojaatning asosi aynan
  // surat. Shuning uchun so'raladi, lekin MAJBURIY emas — ba'zi
  // muammoning surati bo'lmaydi (masalan, hujjat yuritish).
  ASK_MEDIA: (max: number) =>
    [
      "📷 <b>Surat yoki video yuboring.</b>",
      "",
      "Muammoni ko'rsatadigan surat murojaatni tezroq hal qilishga",
      "yordam beradi.",
      "",
      `<i>Eng ko'pi ${max} ta. Surat shart emas — «⏭ O'tkazib yuborish» ni bosing.</i>`,
    ].join("\n"),

  MEDIA_ADDED: (count: number, max: number) =>
    `✅ Qabul qilindi (${count}/${max}). Yana yuboring yoki «✅ Tayyor» ni bosing.`,

  MEDIA_LIMIT: (max: number) =>
    `Eng ko'pi ${max} ta fayl. «✅ Tayyor» ni bosing.`,

  /**
   * ⚠️ FAYL QABUL QILINMAGANDA SABAB AYTILADI: tur baytdan
   * aniqlanadi va `.pdf`/`.apk` rad etiladi. Jim tashlab yuborilsa,
   * fuqaro "yuborildi" deb o'ylardi.
   */
  MEDIA_REJECTED: (reason: string) => `⚠️ ${reason}`,

  MEDIA_WRONG_TYPE:
    "Faqat surat yoki video qabul qilinadi. Hujjat va boshqa fayllar ilova qilinmaydi.",

  // ── MUROJAAT: 4-QADAM, JOY ──────────────────────────────────────
  //
  // ⚠️ TELEGRAM'NING O'Z JOY TUGMASI ishlatiladi: u aniq koordinata
  // beradi va fuqarodan manzilni yozishni talab qilmaydi. Qo'lda
  // yozilgan manzil ham qabul qilinadi — hamma ham joylashuvini
  // ulashishni istamaydi.
  ASK_LOCATION: [
    "📍 <b>Muammo qayerda?</b>",
    "",
    "Pastdagi «📍 Joylashuvni yuborish» tugmasini bosing —",
    "yoki manzilni matn bilan yozing (masalan: «Navoiy ko'chasi, 12-uy»).",
    "",
    "<i>Joy ko'rsatilmasa ham murojaat qabul qilinadi.</i>",
  ].join("\n"),

  LOCATION_SAVED: "📍 Joylashuv qabul qilindi.",
  ADDRESS_SAVED: (address: string) => `📍 Manzil: <b>${address}</b>`,

  ADDRESS_TOO_LONG: (max: number) =>
    `Manzil juda uzun (eng ko'pi ${max} ta belgi). Qisqaroq yozing.`,

  // ── MUROJAAT: 5-QADAM, BAYROQLAR VA TASDIQ ──────────────────────
  //
  // ⚠️ BAYROQLAR USTUVORLIKNI O'ZGARTIRMAYDI: ular TAXMIN va panelda
  // faqat ko'rsatiladi. Aks holda "shoshilinch" tugmasini har kim
  // bosib, navbat ma'nosini yo'qotardi (CLAUDE.md).
  ASK_FLAGS: [
    "Murojaatingizga tegishli belgilarni tanlang:",
    "",
    "<i>Belgilar navbatni o'zgartirmaydi — ular xodimga muammoni</i>",
    "<i>to'g'ri tushunishga yordam beradi.</i>",
    "",
    "Hech biri tegishli bo'lmasa — «✅ Tayyor».",
  ].join("\n"),

  FLAG_ON: (label: string) => `✅ Belgilandi: ${label}`,
  FLAG_OFF: (label: string) => `⬜️ Olib tashlandi: ${label}`,

  REVIEW: (data: {
    category: string;
    body: string;
    photos: number;
    place: string | null;
    flags: string[];
    org: string | null;
    slaHours: number;
  }) =>
    [
      "<b>Murojaatingizni tekshiring</b>",
      "",
      `📂 Yo'nalish: <b>${data.category}</b>`,
      data.org ? `🏛 Ijrochi: ${data.org}` : null,
      `⏱ Ko'rib chiqish muddati: ${data.slaHours} soat`,
      "",
      `📝 ${escapeHtml(truncate(data.body, 400))}`,
      "",
      data.photos > 0 ? `📷 Ilova: ${data.photos} ta fayl` : "📷 Ilova: yo'q",
      data.place ? `📍 ${escapeHtml(data.place)}` : "📍 Joy ko'rsatilmagan",
      data.flags.length > 0 ? `🏷 ${data.flags.join(", ")}` : null,
      "",
      "Hammasi to'g'ri bo'lsa — «📨 Yuborish».",
    ]
      .filter((line) => line !== null)
      .join("\n"),

  SENDING: "📨 Yuborilmoqda…",

  SENT: (data: { publicNo: string; org: string | null; due: string | null }) =>
    [
      "✅ <b>Murojaatingiz qabul qilindi</b>",
      "",
      `Raqam: <code>${data.publicNo}</code>`,
      data.org ? `Ijrochi: <b>${data.org}</b>` : null,
      data.due ? `Muddat: <b>${data.due}</b>` : null,
      "",
      "Javob shu chatga keladi.",
      "Holatini «📋 Murojaatlarim» bo'limida kuzatishingiz mumkin.",
    ]
      .filter((line) => line !== null)
      .join("\n"),

  CANCELLED: "Bekor qilindi.",

  // ── MUROJAATLARIM ───────────────────────────────────────────────
  APPEALS_EMPTY: [
    "Sizda hali murojaat yo'q.",
    "",
    "«📝 Murojaat yuborish» tugmasi orqali birinchisini yuboring.",
  ].join("\n"),

  APPEALS_HEADER: (counts: { all: number; open: number; resolved: number }) =>
    [
      "<b>📋 Murojaatlaringiz</b>",
      "",
      `Jami: <b>${counts.all}</b> · Jarayonda: <b>${counts.open}</b> · Hal qilingan: <b>${counts.resolved}</b>`,
    ].join("\n"),

  APPEAL_ITEM: (data: {
    publicNo: string;
    title: string;
    status: string;
    category: string;
    createdAt: string;
    place: string | null;
  }) =>
    [
      `<code>${data.publicNo}</code> — ${STATUS_LABELS[data.status] ?? data.status}`,
      `📂 ${escapeHtml(data.category)}`,
      `📝 ${escapeHtml(truncate(data.title, 100))}`,
      data.place ? `📍 ${escapeHtml(data.place)}` : null,
      `🗓 ${data.createdAt}`,
    ]
      .filter((line) => line !== null)
      .join("\n"),

  // ── PROFIL ──────────────────────────────────────────────────────
  PROFILE: (data: {
    name: string;
    phone: string | null;
    district: string | null;
    mahalla: string | null;
    points: number;
    stats: { total: number; open: number; resolved: number };
  }) =>
    [
      "<b>👤 Profilingiz</b>",
      "",
      `Ism: <b>${escapeHtml(data.name)}</b>`,
      `Telefon: ${data.phone ? `<b>${escapeHtml(data.phone)}</b>` : "<i>ko'rsatilmagan</i>"}`,
      `Tuman: ${data.district ? `<b>${escapeHtml(data.district)}</b>` : "<i>ko'rsatilmagan</i>"}`,
      `MFY: ${data.mahalla ? `<b>${escapeHtml(data.mahalla)}</b>` : "<i>ko'rsatilmagan</i>"}`,
      "",
      `⭐️ Ball: <b>${data.points}</b>`,
      `📋 Murojaat: <b>${data.stats.total}</b> (jarayonda ${data.stats.open}, hal qilingan ${data.stats.resolved})`,
      "",
      "<i>Tuman va MFY ni ko'rsatsangiz, murojaatingiz to'g'ri</i>",
      "<i>hududga tezroq yetib boradi.</i>",
    ].join("\n"),

  PROFILE_PICK_DISTRICT: "Tumaningizni tanlang:",
  PROFILE_PICK_MAHALLA: (district: string) =>
    `<b>${escapeHtml(district)}</b> — MFY ni tanlang:`,
  PROFILE_ASK_PHONE: [
    "📞 Telefon raqamingizni yuboring.",
    "",
    "Pastdagi tugmani bosing yoki raqamni yozing.",
    "",
    "<i>Raqam faqat murojaatingiz bo'yicha bog'lanish uchun kerak.</i>",
  ].join("\n"),

  PROFILE_SAVED: "✅ Profilingiz yangilandi.",

  /**
   * ⚠️ RAQAM NOTO'G'RI — SABAB AYTILADI. "Xatolik yuz berdi" degan
   * umumiy matn fuqaroga nima qilishni ko'rsatmasdi va u bir xil
   * noto'g'ri raqamni qayta-qayta yuborardi.
   */
  PHONE_INVALID: [
    "Raqam noto'g'ri ko'rinyapti. Namuna: <b>+998 90 123 45 67</b>",
    "",
    "<i>Pastdagi tugma orqali ulashish eng ishonchli yo'l.</i>",
  ].join("\n"),

  // ── MUROJAAT: TELEFON QADAMI ────────────────────────────────────
  //
  // ⚠️ SABAB AYTILADI, QURUQ TALAB QO'YILMAYDI. "Raqam majburiy"
  // degan gap odamni botdan qaytarardi; "xodim shu raqam orqali
  // bog'lanadi" esa nima uchun kerakligini tushuntiradi.
  APPEAL_ASK_PHONE: [
    "📞 <b>Avval telefon raqamingizni yuboring.</b>",
    "",
    "Murojaatingiz bo'yicha xodim siz bilan shu raqam orqali",
    "bog'lanadi — shuning uchun u majburiy.",
    "",
    "Pastdagi tugmani bosing yoki raqamni yozing.",
  ].join("\n"),

  APPEAL_PHONE_SAVED: (phone: string) =>
    `✅ Raqam saqlandi: <b>${escapeHtml(phone)}</b>`,

  // ── UMUMIY ──────────────────────────────────────────────────────
  UNKNOWN:
    "Tushunmadim. Pastdagi tugmalardan foydalaning yoki /start ni bosing.",

  ERROR_GENERIC: "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
} as const;

/* ══════════════════════════════════════════════════════════════════════
 * ADMIN PANELI — XODIM UCHUN
 * ══════════════════════════════════════════════════════════════════════
 *
 * ⚠️ BU MATNLAR `TEXTS` DAN ALOHIDA va bu ataylab: yuqoridagi to'plam
 * FUQARO uchun ("bu yerda xodim, ruxsat degan matnlar yo'q" — fayl
 * boshidagi izoh). Aralashtirilsa, fuqaro oqimiga xodim tili sizib
 * kirardi.
 *
 * ⚠️ TUGMALARI HAM ALOHIDA va `MENU_VALUES` GA QO'SHILMAYDI: ular
 * faqat admin oqimida ko'rinadi.
 */

export const ADMIN_BUTTONS = {
  BROADCAST: "📢 Xabar yuborish",
  HISTORY: "🗂 Oxirgi tarqatmalar",
  EXIT: "🚪 Chiqish",

  // ── Auditoriya ──────────────────────────────────────────────────
  TO_CITIZENS: "👥 Bot foydalanuvchilariga",
  TO_GROUPS: "💬 MFY guruhlariga",
  TO_BOTH: "📣 Ikkalasiga",

  // ── Hudud ───────────────────────────────────────────────────────
  ALL_PROVINCE: "🌐 Butun viloyat",
  WHOLE_DISTRICT: "🏙 Butun tuman",

  // ── Uzatish usuli ───────────────────────────────────────────────
  //
  // ⚠️ IKKI USUL — MIJOZ TALABI: "forward qilish orqali, asl holatda
  // ham yuborish". Forward manbani ko'rsatadi, nusxa esa botning o'z
  // xabari bo'lib ko'rinadi.
  MODE_FORWARD: "↪️ Uzatish (manba ko'rinadi)",
  MODE_COPY: "📄 Asl holatda (manbasiz)",

  CONFIRM: "✅ Yuborish",
  BACK: "⬅️ Ortga",
} as const;

export const ADMIN_BUTTON_VALUES: ReadonlySet<string> = new Set(
  Object.values(ADMIN_BUTTONS),
);

export const ADMIN_TEXTS = {
  DENIED: [
    "Bu bo'lim faqat tizim xodimlari uchun.",
    "",
    "<i>Agar siz xodim bo'lsangiz, panelda Telegram hisobingiz",
    "bog'langanini tekshiring (Adminlar → tahrirlash → Telegram ID).</i>",
  ].join("\n"),

  MENU: (data: { name: string; scope: string }) =>
    [
      `<b>⚙️ Admin paneli</b> — ${escapeHtml(data.name)}`,
      `Qamrov: <b>${escapeHtml(data.scope)}</b>`,
      "",
      "Bu yerdan tuman yoki MFY kesimida xabar tarqatishingiz mumkin.",
      "",
      "<i>Fuqaro bo'limiga qaytish uchun «🚪 Chiqish».</i>",
    ].join("\n"),

  PICK_AUDIENCE: [
    "<b>Kimga yuboriladi?</b>",
    "",
    "👥 <b>Bot foydalanuvchilariga</b> — shaxsiy chatga, har kimga alohida.",
    "💬 <b>MFY guruhlariga</b> — guruh yozishmasiga, hamma ko'radi.",
    "",
    "<i>Guruhga yuborilgan xabarni o'chirib bo'lmaydi.</i>",
  ].join("\n"),

  PICK_DISTRICT: "<b>Qaysi tuman?</b>",
  PICK_MAHALLA: (district: string) =>
    `<b>${escapeHtml(district)}</b> — MFY ni tanlang yoki butun tumanga yuboring:`,

  ASK_CONTENT: [
    "<b>Endi xabarni yuboring.</b>",
    "",
    "• Oddiy matn yozsangiz — u matn sifatida tarqatiladi.",
    "• Biror xabarni <b>forward</b> qilsangiz — uni asl holida yoki",
    "  manbasi bilan uzatish mumkin (surat, video, fayl ham bo'ladi).",
  ].join("\n"),

  PICK_MODE: [
    "<b>Qanday yuborilsin?</b>",
    "",
    "↪️ <b>Uzatish</b> — xabarda «Forwarded from …» yozuvi qoladi.",
    "📄 <b>Asl holatda</b> — manba ko'rinmaydi, xabar botdan kelgandek.",
  ].join("\n"),

  /**
   * ⚠️ TASDIQ EKRANIDA SON KO'RSATILADI. "1 240 kishiga yuboriladi"
   * degan raqam hudud noto'g'ri tanlanganini TO'XTATADI — usiz xato
   * faqat yuborilgandan KEYIN bilinardi.
   */
  CONFIRM: (data: {
    audience: string;
    area: string;
    mode: string;
    citizens: number;
    groups: number;
    preview: string | null;
  }) =>
    [
      "<b>Tekshiring</b>",
      "",
      `Kimga: <b>${escapeHtml(data.audience)}</b>`,
      `Hudud: <b>${escapeHtml(data.area)}</b>`,
      `Usul: <b>${escapeHtml(data.mode)}</b>`,
      "",
      `👥 Fuqaro: <b>${data.citizens}</b>`,
      `💬 Guruh: <b>${data.groups}</b>`,
      ...(data.preview
        ? ["", "<b>Matn:</b>", `<i>${escapeHtml(truncate(data.preview, 400))}</i>`]
        : []),
      "",
      "<i>Yuborilgan xabarni qaytarib bo'lmaydi.</i>",
    ].join("\n"),

  EMPTY_AUDIENCE: [
    "Bu kesimda hech kim topilmadi.",
    "",
    "<i>Boshqa hudud yoki auditoriyani tanlab ko'ring.</i>",
  ].join("\n"),

  /**
   * ⚠️ "YUBORILDI" EMAS, "BOSHLANDI": tarqatma fon'da ketadi va
   * minglab xabar bir necha daqiqa davom etadi. "Yuborildi" deyilsa,
   * xodim darhol natija kutib, "ishlamadi" deb o'ylardi.
   */
  STARTED: (total: number) =>
    [
      "📨 <b>Tarqatma boshlandi.</b>",
      "",
      `Manzillar soni: <b>${total}</b>`,
      "",
      "<i>Natijani «🗂 Oxirgi tarqatmalar» dan ko'rishingiz mumkin.</i>",
    ].join("\n"),

  HISTORY_EMPTY: "Hali tarqatma yuborilmagan.",

  HISTORY: (
    items: {
      at: string;
      audience: string;
      area: string;
      status: string;
      sent: number;
      failed: number;
      total: number;
      preview: string | null;
    }[],
  ) =>
    [
      "<b>🗂 Oxirgi tarqatmalar</b>",
      "",
      ...items.flatMap((item) => [
        `${item.at} · <b>${escapeHtml(item.audience)}</b> · ${escapeHtml(item.area)}`,
        `${escapeHtml(item.status)} — ${item.sent}/${item.total} yuborildi${
          item.failed > 0 ? `, ${item.failed} xato` : ""
        }`,
        ...(item.preview ? [`<i>${escapeHtml(truncate(item.preview, 120))}</i>`] : []),
        "",
      ]),
    ].join("\n"),

  CANCELLED: "Tarqatma bekor qilindi.",
  EXITED: "Admin bo'limidan chiqdingiz.",

  NEED_CONTENT: "Avval xabarni yuboring yoki forward qiling.",
} as const;

/**
 * TASHKILOT ULANISHI — `/ulash <KOD>`.
 *
 * ⚠️ MATNLAR SHU FAYLDA, handler ichida EMAS (`TEXTS` va
 * `ADMIN_TEXTS` bilan AYNI qoida): bot matnini o'zgartirish uchun
 * kodni kovlash kerak bo'lmasligi kerak va bitta matn ikki joyda
 * yozilsa, bittasi albatta eskirardi.
 */
export const ORG_TEXTS = {
  ASK_CODE: [
    "<b>Tashkilotni ulash</b>",
    "",
    "Kodni buyruq bilan birga yuboring:",
    "<code>/ulash ABC123</code>",
    "",
    "<i>Kodni ma'muriyat panelda yasab beradi.</i>",
  ].join("\n"),

  LINKED: (name: string) =>
    [
      `✅ <b>${escapeHtml(name)}</b> shu chatga ulandi.`,
      "",
      "Endi tashkilotingizga yo'naltirilgan har yangi murojaat haqida",
      "shu yerga xabar keladi.",
      "",
      // ⚠️ CHEGARA DARHOL AYTILADI: aks holda tashkilot xabarga
      // javob yozib, uni fuqaro o'qiydi deb o'ylardi — bot esa
      // javobni hech qayerga uzatmaydi.
      "<i>Bu chatga javob yozilmaydi. Ishni bajargach, panelda",
      "«Bajarildi» deb belgilang — rasmiy javobni shtab yozadi.</i>",
    ].join("\n"),

  /**
   * ⚠️ "KOD XATO" VA "TASHKILOT ARXIVLANGAN" — AYNI JAVOB
   * (serverda ham): ikkisini ajratib ko'rsatish begona odamga
   * "bu kod tizimda bor" degan ma'lumot berardi.
   */
  FAILED: [
    "Kod topilmadi yoki allaqachon ishlatilgan.",
    "",
    "<i>Ma'muriyatdan yangi kod so'rang.</i>",
  ].join("\n"),
} as const;

/** Auditoriya nomlari — panel va botda AYNI atama ishlatiladi. */
export const AUDIENCE_LABELS: Record<string, string> = {
  citizens: "Bot foydalanuvchilari",
  groups: "MFY guruhlari",
  both: "Fuqarolar va guruhlar",
};

export const MODE_LABELS: Record<string, string> = {
  text: "Matn",
  forward: "Uzatish (manba bilan)",
  copy: "Asl holatda",
};

export const BROADCAST_STATUS_LABELS: Record<string, string> = {
  pending: "⏳ Navbatda",
  sending: "📨 Yuborilmoqda",
  done: "✅ Tugadi",
  failed: "❌ Xato",
};

/**
 * ⚠️ HTML QALQONI: fuqaro matni `parse_mode: "HTML"` bilan
 * yuborilganda `<` belgisi xabarni BUZADI — Telegram butun xabarni
 * rad etadi va fuqaro javob ko'rmay qolardi. Matn bizniki emas,
 * shuning uchun har doim qalqondan o'tkaziladi.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/** Uzun matnni ko'rsatish uchun qisqartiradi (SAQLASHDA emas). */
export function truncate(value: string, max: number): string {
  const trimmed = value.trim();
  return trimmed.length > max ? `${trimmed.slice(0, max - 1)}…` : trimmed;
}
