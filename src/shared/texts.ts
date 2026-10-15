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
 */

export const BUTTONS = {
  SUBMIT_ISSUE: "📨 Muammo yuborish",
  MY_ISSUES: "📋 Murojaatlarim",
  HELP: "ℹ️ Yordam",
  CANCEL: "❌ Bekor qilish",
} as const;

/** Tugma matnlari to'plami — menyu bosilganini aniqlash uchun. */
export const BUTTON_VALUES: ReadonlySet<string> = new Set(Object.values(BUTTONS));

export const TEXTS = {
  // ── KIRISH ──────────────────────────────────────────────────────
  START_LINKED: (name: string, district: string | null) =>
    [
      `Assalomu alaykum, ${name}!`,
      "",
      district ? `Hudud: <b>${district}</b>` : null,
      "",
      "Quyidagi tugmalardan foydalaning.",
    ]
      .filter((line) => line !== null)
      .join("\n"),

  /**
   * ⚠️ BOG'LANMAGAN ODAMGA NIMA QILISH KERAKLIGI AYTILADI, shunchaki
   * "ruxsat yo'q" emas: u Telegram id'sini ma'muriyatga berishi
   * kerak va uni o'zi topa olmaydi. Shuning uchun id xabarda
   * KO'RSATILADI.
   */
  START_NOT_LINKED: (telegramId: string) =>
    [
      "Assalomu alaykum!",
      "",
      "Bu bot — <b>viloyat shtabi</b> xodimlari uchun.",
      "",
      "Sizning Telegram hisobingiz tizimga bog'lanmagan. Bog'lash uchun",
      "quyidagi raqamni ma'muriyatga yuboring:",
      "",
      `<code>${telegramId}</code>`,
    ].join("\n"),

  HELP: [
    "<b>Bot nima qiladi</b>",
    "",
    "1. <b>Muammo yuborish</b> — kategoriya tanlaysiz, so'ng muammo",
    "   matnini yozasiz. Murojaat shtab paneliga tushadi va javob",
    "   shu chatga qaytadi.",
    "",
    "2. <b>MFY guruhlarini kuzatish</b> — bot rasmiy deb belgilangan",
    "   guruhlardagi xabarlarni o'qib, ularning orasidan shikoyat va",
    "   takliflarni ajratadi. Bot guruhda hech narsa yozmaydi.",
  ].join("\n"),

  // ── MUAMMO YUBORISH ─────────────────────────────────────────────
  ISSUE_PICK_CATEGORY: "Murojaat <b>yo'nalishini</b> tanlang:",

  /**
   * ⚠️ KATEGORIYA YO'Q — OQIM BOSHLANMAYDI. Serverda `categoryId`
   * majburiy va kategoriyasiz so'rov baribir rad etilardi. Buni
   * oldindan aytish foydalanuvchini matn yozib, keyin xato olishdan
   * saqlaydi.
   */
  ISSUE_NO_CATEGORIES:
    "Hozircha murojaat yo'nalishlari sozlanmagan. Ma'muriyatga murojaat qiling.",

  ISSUE_ASK_BODY: (category: string, min: number, max: number) =>
    [
      `Yo'nalish: <b>${category}</b>`,
      "",
      "Endi muammoni <b>batafsil</b> yozing: nima bo'ldi, qayerda,",
      "qachondan beri davom etyapti.",
      "",
      `<i>${min}–${max} belgi.</i>`,
    ].join("\n"),

  ISSUE_TOO_SHORT: (min: number) =>
    `Matn juda qisqa. Kamida ${min} belgi yozing — qisqa matndan muammoni tushunib bo'lmaydi.`,

  /**
   * ⚠️ UZUN MATN KESILMAYDI, QAYTA YOZISH TAKLIF QILINADI: kesilsa
   * odam yozganining yarmi JIMGINA yo'qolardi va u buni bilmasdi.
   */
  ISSUE_TOO_LONG: (max: number, actual: number) =>
    [
      `Matn juda uzun: ${actual} belgi (eng ko'pi ${max}).`,
      "",
      "Eng muhim qismini qoldirib, qisqartirib yuboring.",
    ].join("\n"),

  ISSUE_CATEGORY_NOT_FOUND:
    "Bu yo'nalish topilmadi. Ro'yxat yangilangan bo'lishi mumkin — qaytadan boshlang.",

  ISSUE_SENT: (publicNo: string) =>
    [
      "✅ <b>Murojaatingiz qabul qilindi</b>",
      "",
      `Raqam: <code>${publicNo}</code>`,
      "",
      "Javob shu chatga keladi.",
    ].join("\n"),

  ISSUE_CANCELLED: "Bekor qilindi.",

  // ── UMUMIY ──────────────────────────────────────────────────────
  NOT_LINKED: "Sizning hisobingiz tizimga bog'lanmagan. /start ni bosing.",

  UNKNOWN: "Buyruq tushunilmadi. Tugmalardan foydalaning yoki /start ni bosing.",

  ERROR_GENERIC: "Xatolik yuz berdi. Keyinroq qayta urinib ko'ring.",
} as const;
