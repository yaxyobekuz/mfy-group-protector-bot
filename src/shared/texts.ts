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
      "viloyat shtabiga yuborishingiz mumkin.",
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
  AI_SUGGESTION: (category: string, org: string | null) =>
    [
      "Murojaatingiz quyidagi yo'nalishga tegishli ko'rinadi:",
      "",
      `📂 <b>${category}</b>`,
      org ? `🏛 ${org}` : null,
      "",
      "To'g'rimi?",
    ]
      .filter((line) => line !== null)
      .join("\n"),

  PICK_CATEGORY: "Murojaat <b>yo'nalishini</b> tanlang:",

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

  // ── UMUMIY ──────────────────────────────────────────────────────
  UNKNOWN:
    "Tushunmadim. Pastdagi tugmalardan foydalaning yoki /start ni bosing.",

  ERROR_GENERIC: "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
} as const;

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
