/**
 * MUROJAAT YUBORISH — fuqaro oqimi.
 *
 *   matn → yo'nalish (AI taklifi) → surat/video → joy → belgilar → tasdiq
 *
 * ── MINI-ILOVA BILAN AYNI OQIM ────────────────────────────────────────
 *
 * ⚠️ QADAMLAR MINI-ILOVANIKI BILAN BIR XIL va bu ataylab: bitta odam
 * bugun botdan, ertaga ilovadan yuborishi mumkin va ikki joyda ikki
 * xil narsa so'ralsa, murojaatlar ham boshqa-boshqa to'liqlikda
 * bo'lardi.
 *
 * ⚠️ TARTIB ESA BOSHQACHA — MATN BIRINCHI. Mini-ilovada yo'nalish
 * birinchi (ekranda butun ro'yxat ko'rinadi), botda esa ro'yxat 12 ta
 * tugma bo'lardi. Matn birinchi bo'lsa, AI yo'nalishni TAKLIF qiladi
 * va fuqaro odatda bitta tugma bosadi.
 *
 * ── TARTIB MUHIM ──────────────────────────────────────────────────────
 *
 * ⚠️ MENYU TUGMALARI OQIM HOLATIDAN OLDIN tekshiriladi. Bu nozik joy:
 * odam matn yozish o'rniga "ℹ️ Yordam" tugmasini bosishi mumkin. Agar
 * holat avval tekshirilsa, bosilgan tugmaning MATNI murojaat mazmuni
 * bo'lib ketardi — va u shtab paneliga shundayligicha tushardi.
 *
 * ── AI TAKLIF QILADI, QAROR QILMAYDI ──────────────────────────────────
 *
 * ⚠️ TAKLIFNI FUQARO TASDIQLAYDI. Bu "signal — muammo emas"
 * doktrinasini buzmaydi: muammo borligini AI emas, fuqaroning O'ZI
 * aytyapti va yo'nalishni ham o'zi tasdiqlaydi. Odam qarori oqimdan
 * chiqmaydi.
 *
 * ⚠️ TAKLIF `analysisToken` (SERVER IMZOSI) orqali uzatiladi: bot
 * aytgan foizga ishonilsa, panelda soxta dalil paydo bo'lardi.
 */

import type { Composer } from "grammy";

import {
  analyzeBody,
  createAppeal,
  getCategories,
  uploadFile,
  type Category,
} from "../../shared/api";
import { formatDateTimeUz } from "../../shared/date";
import {
  cancelKeyboard,
  flagsKeyboard,
  listKeyboard,
  locationKeyboard,
  mainMenu,
  mediaKeyboard,
  reviewKeyboard,
  suggestionKeyboard,
} from "../../shared/keyboards";
import { BUTTONS, MENU_VALUES, TEXTS } from "../../shared/texts";
import {
  identityOf,
  isAlive,
  type AppealDraft,
  type BotContext,
} from "../../shared/context";

/**
 * MATN CHEGARALARI.
 *
 * ⚠️ SERVERDAGI `CreateAppealDto` BILAN AYNI (10–2000). Ikkisi
 * ajralsa, bot qabul qilgan matn serverda rad etilib, fuqaro
 * "yuborildi" deb o'ylab qolardi.
 */
const BODY_MIN = 10;
const BODY_MAX = 2000;
const ADDRESS_MAX = 300;

/**
 * ⚠️ SERVERDAGI `mobileMaxAttachments` STANDART QIYMATI bilan ayni
 * (5). Server baribir o'zi kesadi (`create` dagi `.slice`), bu yerda
 * esa fuqaroga OLDINDAN aytiladi — 10 ta surat yuborib, 5 tasi jim
 * tashlanib ketmasligi uchun.
 */
const MAX_ATTACHMENTS = 5;

/** Taklif shu foizdan past bo'lsa ko'rsatilmaydi. */
const AI_MIN_CONFIDENCE = 0.5;

/**
 * BAND QILINGAN, LEKIN HALI YUKLANMAGAN FAYL O'RNI.
 *
 * ⚠️ YUBORISHDAN OLDIN FILTRLANADI: bu belgi serverga ketsa, u
 * imzolanmagan token sifatida jim tashlanardi — fuqaro esa surat
 * ilova qilindi deb o'ylardi.
 */
const PENDING = "pending:__band_qilingan__";

export const registerAppeal = (bot: Composer<BotContext>): void => {
  // ═════════════════════════════════════════════════════════════════
  //  1-QADAM: oqim boshlanadi → matn so'raladi
  // ═════════════════════════════════════════════════════════════════

  bot.hears(BUTTONS.SUBMIT_ISSUE, async (ctx) => {
    // ⚠️ YANGI OQIM ESKISINI TASHLAYDI: fuqaro bir vaqtda ikki
    // murojaat yozmaydi va yarim qolgan oqim yangisiga xalaqit
    // bermasligi kerak.
    ctx.session.appeal = { step: "body", attachments: [], startedAt: Date.now() };
    delete ctx.session.profile;

    await ctx.reply(TEXTS.ASK_BODY(BODY_MIN, BODY_MAX), {
      parse_mode: "HTML",
      reply_markup: cancelKeyboard(),
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  SURAT / VIDEO — 3-qadam
  // ═════════════════════════════════════════════════════════════════
  //
  // ⚠️ `on("message:photo")` MATNDAN OLDIN turadi: surat bilan
  // birga izoh (`caption`) kelishi mumkin va matn handler'i uni
  // murojaat matni deb olib ketardi.

  bot.on(["message:photo", "message:video"], async (ctx) => {
    const draft = ctx.session.appeal;

    // ⚠️ OQIMDAN TASHQARIDAGI SURAT — TUSHUNTIRILADI, JIM
    // TASHLANMAYDI: fuqaro suratni birinchi yuborib, keyin yozmoqchi
    // bo'lishi mumkin va javobsiz qolsa "bot ishlamayapti" deb
    // o'ylardi.
    if (!isAlive(draft) || draft.step !== "media") {
      await ctx.reply(TEXTS.UNKNOWN, { reply_markup: mainMenu() });
      return;
    }

    // ── Telegram fayl id'si ──────────────────────────────────────
    //
    // ⚠️ SURAT UCHUN ENG KATTA O'LCHAM olinadi: Telegram bir
    // suratni bir necha o'lchamda beradi va birinchisi (eng
    // kichigi) dalil sifatida yaroqsiz — unda tafsilot ko'rinmaydi.
    const photo = ctx.message.photo?.at(-1);
    const fileId = photo?.file_id ?? ctx.message.video?.file_id;

    if (!fileId) {
      await ctx.reply(TEXTS.MEDIA_WRONG_TYPE, {
        reply_markup: mediaKeyboard(draft.attachments.length > 0),
      });
      return;
    }

    await acceptFile(ctx, draft, fileId, ctx.message.media_group_id);
  });

  /**
   * ⚠️ HUJJAT ALOHIDA USHLANADI: fuqaro suratni "fayl sifatida"
   * yuborishi mumkin (Telegram'da shunday imkon bor) va u
   * `message:document` bo'lib keladi. Jim tashlansa, fuqaro surat
   * ilova qilindi deb o'ylardi.
   *
   * ⚠️ SERVER BARIBIR BAYTDAN TEKSHIRADI: hujjat ichida haqiqiy
   * surat bo'lsa qabul qilinadi, `.apk` esa rad etiladi — qaror
   * taxminga emas, DALILGA tayanadi (`uploads.service.ts`).
   */
  bot.on("message:document", async (ctx) => {
    const draft = ctx.session.appeal;

    if (!isAlive(draft) || draft.step !== "media") {
      await ctx.reply(TEXTS.UNKNOWN, { reply_markup: mainMenu() });
      return;
    }

    await acceptFile(
      ctx,
      draft,
      ctx.message.document.file_id,
      ctx.message.media_group_id,
    );
  });

  // ═════════════════════════════════════════════════════════════════
  //  JOYLASHUV — 4-qadam
  // ═════════════════════════════════════════════════════════════════

  bot.on("message:location", async (ctx) => {
    const draft = ctx.session.appeal;

    if (!isAlive(draft) || draft.step !== "location") {
      await ctx.reply(TEXTS.UNKNOWN, { reply_markup: mainMenu() });
      return;
    }

    draft.lat = ctx.message.location.latitude;
    draft.lng = ctx.message.location.longitude;

    await ctx.reply(TEXTS.LOCATION_SAVED);
    await askFlags(ctx, draft);
  });

  // ═════════════════════════════════════════════════════════════════
  //  MATNLI BOSQICHLAR
  // ═════════════════════════════════════════════════════════════════

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    // ⚠️ BUYRUQLAR O'TKAZILADI: `/start` oqim o'rtasida ham ishlashi
    // kerak (fuqaro yo'lni yo'qotganda shuni bosadi).
    if (text.startsWith("/")) return next();

    // ⚠️ ASOSIY MENYU TUGMASI OQIMNI TASHLAYDI — fayl boshidagi izoh.
    if (MENU_VALUES.has(text)) {
      delete ctx.session.appeal;
      return next();
    }

    const draft = ctx.session.appeal;
    if (!isAlive(draft)) return next();

    switch (draft.step) {
      case "body":
        return handleBody(ctx, draft, text);
      case "category":
        return handleCategory(ctx, draft, text);
      case "media":
        return handleMediaStep(ctx, draft, text);
      case "location":
        return handleLocationStep(ctx, draft, text);
      case "flags":
        return handleFlags(ctx, draft, text);
      case "review":
        return handleReview(ctx, draft, text);
      default:
        return next();
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  FAYL QABULI — surat, video va hujjat uchun UMUMIY
// ═══════════════════════════════════════════════════════════════════

/**
 * FAYLNI QABUL QILADI va qoralamaga qo'shadi.
 *
 * ── ALBOM BIR VAQTDA KELADI ───────────────────────────────────────────
 *
 * ⚠️ TELEGRAM ALBOMNI BITTA XABAR SIFATIDA YUBORMAYDI: har surat
 * ALOHIDA `message` bo'lib keladi va grammY ularni BIR VAQTDA ishga
 * tushiradi. Shuning uchun "joy bormi" tekshiruvi va qo'shish
 * ORASIDA `await` bo'lishi MUMKIN EMAS: har handler yuklashdan
 * OLDIN uzunlikni o'qib, hammasi "joy bor" deb qaror qilardi va
 * chegaradan OSHIB ketardi.
 *
 * Shuning uchun JOY AVVAL BAND QILINADI (`push`), keyin yuklanadi.
 * Yuklash muvaffaqiyatsiz bo'lsa — band qilingan joy QAYTARILADI.
 */
async function acceptFile(
  ctx: BotContext,
  draft: AppealDraft,
  fileId: string,
  mediaGroupId: string | undefined,
): Promise<void> {
  if (draft.attachments.length >= MAX_ATTACHMENTS) {
    // ⚠️ ALBOMDA CHEGARA HAQIDA BIR MARTA aytiladi: 10 suratli
    // albomda har ortiqcha suratga xabar yozilsa, 5 ta bir xil
    // ogohlantirish chiqardi.
    if (mediaGroupId && ctx.session.lastMediaGroupId === mediaGroupId) return;
    if (mediaGroupId) ctx.session.lastMediaGroupId = mediaGroupId;

    await ctx.reply(TEXTS.MEDIA_LIMIT(MAX_ATTACHMENTS), {
      reply_markup: mediaKeyboard(true),
    });
    return;
  }

  // ⚠️ JOY BAND QILINADI — yuqoridagi izoh. Belgi HAR CHAQIRUVDA
  // NOYOB: albomda bir nechta joy bir vaqtda band bo'ladi va ularni
  // bir-biridan ajratish kerak.
  const slot = `${PENDING}:${Date.now()}:${Math.random()}`;
  draft.attachments.push(slot);

  const result = await uploadFile(identityOf(ctx), fileId);

  // ⚠️ O'RIN INDEKS BO'YICHA EMAS, QIYMAT bo'yicha topiladi: albomda
  // boshqa yuklash shu orada tugab, massiv surilgan bo'lishi mumkin
  // va saqlangan indeks BOSHQA faylni ko'rsatardi — ya'ni xato
  // yuklash muvaffaqiyatli suratni o'chirib yuborardi.
  const at = draft.attachments.indexOf(slot);

  if (!result.ok) {
    // ⚠️ BAND QILINGAN JOY QAYTARILADI, aks holda rad etilgan
    // fayl o'rni egallab turib, fuqaro 5 ta surat yubora olmasdi.
    if (at !== -1) draft.attachments.splice(at, 1);

    await ctx.reply(TEXTS.MEDIA_REJECTED(result.error ?? TEXTS.MEDIA_WRONG_TYPE), {
      reply_markup: mediaKeyboard(draft.attachments.length > 0),
    });
    return;
  }

  // ⚠️ `-1` — OQIM BEKOR QILINGAN (qoralama tozalangan): token
  // yozilmaydi, aks holda u yangi oqimga tushib ketardi.
  if (at === -1) return;

  draft.attachments[at] = result.data!.token;

  // ⚠️ ALBOMDA FAQAT BIR MARTA JAVOB BERILADI: har suratga javob
  // yozilsa, 5 suratli albom 5 ta xabar chiqarardi.
  if (mediaGroupId && ctx.session.lastMediaGroupId === mediaGroupId) return;
  if (mediaGroupId) ctx.session.lastMediaGroupId = mediaGroupId;

  await ctx.reply(TEXTS.MEDIA_ADDED(draft.attachments.length, MAX_ATTACHMENTS), {
    reply_markup: mediaKeyboard(true),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  1-QADAM: MATN
// ═══════════════════════════════════════════════════════════════════

async function handleBody(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  if (text.length < BODY_MIN) {
    await ctx.reply(TEXTS.BODY_TOO_SHORT(BODY_MIN), { reply_markup: cancelKeyboard() });
    return;
  }

  // ⚠️ UZUN MATN KESILMAYDI: kesilsa fuqaro yozganining yarmi
  // JIMGINA yo'qolardi va u buni bilmasdi.
  if (text.length > BODY_MAX) {
    await ctx.reply(TEXTS.BODY_TOO_LONG(BODY_MAX, text.length), {
      reply_markup: cancelKeyboard(),
    });
    return;
  }

  draft.body = text;

  // ── AI TAKLIFI ───────────────────────────────────────────────────
  //
  // ⚠️ TAKLIF QULAYLIK, SHART EMAS: AI yiqilsa yoki ishonchi past
  // bo'lsa, fuqaro ro'yxatdan O'ZI tanlaydi. Oqim to'xtamaydi.
  await ctx.reply(TEXTS.AI_THINKING);

  const analysis = await analyzeBody(identityOf(ctx), text);
  const suggestion = analysis.ok ? analysis.data?.suggestion : null;

  if (suggestion && suggestion.confidence >= AI_MIN_CONFIDENCE) {
    draft.step = "category";
    draft.categoryId = suggestion.categoryId;
    draft.categoryName = suggestion.categoryName;
    draft.categoryOrg = suggestion.orgName;
    draft.categorySla = suggestion.slaHours;
    draft.analysisToken = analysis.data?.token ?? undefined;

    await ctx.reply(TEXTS.AI_SUGGESTION(suggestion.categoryName, suggestion.orgName), {
      parse_mode: "HTML",
      reply_markup: suggestionKeyboard(),
    });
    return;
  }

  await askCategoryList(ctx, draft);
}

// ═══════════════════════════════════════════════════════════════════
//  2-QADAM: YO'NALISH
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ RO'YXAT SERVERDAN HAR SAFAR O'QILADI, botda keshlanmaydi:
 * yo'nalish — SOZLAMA va panelda o'chirilishi mumkin. Keshlansa,
 * o'chirilgan yo'nalishga murojaat tushib qolardi.
 */
async function askCategoryList(ctx: BotContext, draft: AppealDraft): Promise<void> {
  const categories = await getCategories();

  if (!categories.ok) {
    await ctx.reply(categories.error ?? TEXTS.ERROR_GENERIC, {
      reply_markup: cancelKeyboard(),
    });
    return;
  }

  const list = categories.data ?? [];

  // ⚠️ YO'NALISH YO'Q — OQIM DAVOM ETMAYDI: serverda `categoryId`
  // majburiy va yo'nalishsiz so'rov baribir rad etilardi.
  if (list.length === 0) {
    delete ctx.session.appeal;
    await ctx.reply(TEXTS.NO_CATEGORIES, { reply_markup: mainMenu() });
    return;
  }

  // ⚠️ TAKLIF TOZALANADI: fuqaro "boshqa yo'nalish" dedi, ya'ni AI
  // taklifi RAD ETILDI va uni `sourceMeta.ai` ga yozish panelda
  // "AI shuni aytgan edi" degan noto'g'ri dalil bo'lardi.
  draft.step = "category";
  delete draft.categoryId;
  delete draft.categoryName;
  delete draft.analysisToken;

  await ctx.reply(TEXTS.PICK_CATEGORY, {
    parse_mode: "HTML",
    reply_markup: listKeyboard(list.map((category) => category.name)),
  });
}

async function handleCategory(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  // ── AI taklifi tasdiqlandi ──────────────────────────────────────
  if (text === BUTTONS.AI_ACCEPT && draft.categoryId) {
    await askMedia(ctx, draft);
    return;
  }

  // ── AI taklifi rad etildi → to'liq ro'yxat ──────────────────────
  if (text === BUTTONS.AI_PICK) {
    await askCategoryList(ctx, draft);
    return;
  }

  // ── Ro'yxatdan tanlandi ─────────────────────────────────────────
  //
  // ⚠️ NOM BO'YICHA va faqat FAOLLAR orasidan topiladi: klaviatura
  // MIJOZDA qoladi va fuqaro uni ochiq qoldirib, yo'nalish
  // o'chirilgandan keyin tugmani bosishi mumkin.
  const categories = await getCategories();
  if (!categories.ok) {
    await ctx.reply(categories.error ?? TEXTS.ERROR_GENERIC);
    return;
  }

  const matched = findByName(categories.data ?? [], text);

  if (!matched) {
    await ctx.reply(TEXTS.CATEGORY_NOT_FOUND, {
      reply_markup: listKeyboard((categories.data ?? []).map((c) => c.name)),
    });
    return;
  }

  draft.categoryId = matched.id;
  draft.categoryName = matched.name;
  draft.categoryOrg = matched.orgName;
  draft.categorySla = matched.slaHours;

  await askMedia(ctx, draft);
}

const findByName = (list: Category[], text: string): Category | undefined => {
  const needle = text.trim().toLowerCase();
  return list.find((item) => item.name.trim().toLowerCase() === needle);
};

// ═══════════════════════════════════════════════════════════════════
//  3-QADAM: SURAT / VIDEO
// ═══════════════════════════════════════════════════════════════════

async function askMedia(ctx: BotContext, draft: AppealDraft): Promise<void> {
  draft.step = "media";

  await ctx.reply(TEXTS.ASK_MEDIA(MAX_ATTACHMENTS), {
    parse_mode: "HTML",
    reply_markup: mediaKeyboard(draft.attachments.length > 0),
  });
}

async function handleMediaStep(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  if (text === BUTTONS.DONE || text === BUTTONS.SKIP) {
    await askLocation(ctx, draft);
    return;
  }

  // ⚠️ BOSHQA MATN — ESLATMA: fuqaro surat o'rniga yozishda davom
  // etishi mumkin va javobsiz qolsa, oqim qotib qolgandek
  // ko'rinardi.
  await ctx.reply(TEXTS.ASK_MEDIA(MAX_ATTACHMENTS), {
    parse_mode: "HTML",
    reply_markup: mediaKeyboard(draft.attachments.length > 0),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  4-QADAM: JOY
// ═══════════════════════════════════════════════════════════════════

async function askLocation(ctx: BotContext, draft: AppealDraft): Promise<void> {
  draft.step = "location";

  await ctx.reply(TEXTS.ASK_LOCATION, {
    parse_mode: "HTML",
    reply_markup: locationKeyboard(),
  });
}

async function handleLocationStep(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  if (text === BUTTONS.SKIP) {
    await askFlags(ctx, draft);
    return;
  }

  if (text.length > ADDRESS_MAX) {
    await ctx.reply(TEXTS.ADDRESS_TOO_LONG(ADDRESS_MAX), {
      reply_markup: locationKeyboard(),
    });
    return;
  }

  // ⚠️ QO'LDA YOZILGAN MANZIL HAM QABUL QILINADI: hamma ham
  // joylashuvini ulashishni istamaydi va "manzil yo'q" degan
  // murojaat xodimga kamroq ma'lumot berardi.
  draft.address = text;

  await ctx.reply(TEXTS.ADDRESS_SAVED(text), { parse_mode: "HTML" });
  await askFlags(ctx, draft);
}

// ═══════════════════════════════════════════════════════════════════
//  5-QADAM: BELGILAR
// ═══════════════════════════════════════════════════════════════════

async function askFlags(ctx: BotContext, draft: AppealDraft): Promise<void> {
  draft.step = "flags";

  await ctx.reply(TEXTS.ASK_FLAGS, {
    parse_mode: "HTML",
    reply_markup: flagsKeyboard({
      hazard: draft.isHazard,
      longStanding: draft.isLongStanding,
      repeat: draft.isRepeatAppeal,
    }),
  });
}

async function handleFlags(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  // ⚠️ QAYTA BOSILSA OLIB TASHLANADI: oddiy klaviaturada tugma
  // "bosilgan" holatini KO'RSATMAYDI va fuqaro tasodifan bosganini
  // qaytara olishi kerak.
  const toggle = (
    current: boolean | undefined,
    label: string,
  ): boolean => {
    const next = !current;
    void ctx.reply(next ? TEXTS.FLAG_ON(label) : TEXTS.FLAG_OFF(label));
    return next;
  };

  switch (text) {
    case BUTTONS.FLAG_HAZARD:
      draft.isHazard = toggle(draft.isHazard, "Xavfli");
      return;
    case BUTTONS.FLAG_LONG:
      draft.isLongStanding = toggle(draft.isLongStanding, "Uzoq davom etyapti");
      return;
    case BUTTONS.FLAG_REPEAT:
      draft.isRepeatAppeal = toggle(draft.isRepeatAppeal, "Takroriy murojaat");
      return;
    case BUTTONS.DONE:
      await showReview(ctx, draft);
      return;
    default:
      await ctx.reply(TEXTS.ASK_FLAGS, {
        parse_mode: "HTML",
        reply_markup: flagsKeyboard({
          hazard: draft.isHazard,
          longStanding: draft.isLongStanding,
          repeat: draft.isRepeatAppeal,
        }),
      });
  }
}

// ═══════════════════════════════════════════════════════════════════
//  6-QADAM: TASDIQ VA YUBORISH
// ═══════════════════════════════════════════════════════════════════

/**
 * Yuklab bo'lingan (haqiqiy imzosi bor) fayllar.
 *
 * ⚠️ `PENDING` — PREFIKS, to'liq qiymat emas: har band qilingan o'rin
 * noyob qo'shimchaga ega (`acceptFile` izohi).
 */
const readyAttachments = (draft: AppealDraft): string[] =>
  draft.attachments.filter((token) => !token.startsWith(PENDING));

async function showReview(ctx: BotContext, draft: AppealDraft): Promise<void> {
  draft.step = "review";

  const flags: string[] = [];
  if (draft.isHazard) flags.push("Xavfli");
  if (draft.isLongStanding) flags.push("Uzoq davom etyapti");
  if (draft.isRepeatAppeal) flags.push("Takroriy");

  const place =
    draft.address ??
    (draft.lat !== undefined && draft.lng !== undefined
      ? `${draft.lat.toFixed(5)}, ${draft.lng.toFixed(5)}`
      : null);

  await ctx.reply(
    TEXTS.REVIEW({
      category: draft.categoryName ?? "—",
      body: draft.body ?? "",
      // ⚠️ HAQIQIY FAYLLAR SANALADI: band qilingan, lekin hali
      // yuklanmagan o'rin (`PENDING`) sanoqqa kirmasligi kerak.
      photos: readyAttachments(draft).length,
      place,
      flags,
      org: draft.categoryOrg ?? null,
      slaHours: draft.categorySla ?? 0,
    }),
    { parse_mode: "HTML", reply_markup: reviewKeyboard() },
  );
}

async function handleReview(
  ctx: BotContext,
  draft: AppealDraft,
  text: string,
): Promise<void> {
  if (text !== BUTTONS.SEND) {
    await showReview(ctx, draft);
    return;
  }

  if (!draft.categoryId || !draft.body) {
    // ⚠️ BO'LMASLIGI KERAK, lekin tekshiriladi: sessiya
    // qisman tozalangan holat serverda 400 bo'lib qaytardi va
    // fuqaro sababini bilmasdi.
    delete ctx.session.appeal;
    await ctx.reply(TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
    return;
  }

  await ctx.reply(TEXTS.SENDING);

  const result = await createAppeal(identityOf(ctx), {
    categoryId: draft.categoryId,
    body: draft.body,
    lat: draft.lat,
    lng: draft.lng,
    address: draft.address,
    isHazard: draft.isHazard,
    isLongStanding: draft.isLongStanding,
    isRepeatAppeal: draft.isRepeatAppeal,
    // ⚠️ `PENDING` FILTRLANADI: band qilingan, lekin yuklanmagan
    // o'rin serverda imzosiz token bo'lib jim tashlanardi.
    attachments: readyAttachments(draft),
    analysisToken: draft.analysisToken,
  });

  if (!result.ok) {
    // ⚠️ HOLAT TOZALANMAYDI: server vaqtincha yiqilgan yoki kunlik
    // chegara ishlagan bo'lsa, fuqaro matnni QAYTA YOZMASLIGI
    // kerak — u shunchaki yana yuborib ko'radi.
    await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, {
      reply_markup: reviewKeyboard(),
    });
    return;
  }

  delete ctx.session.appeal;

  await ctx.reply(
    TEXTS.SENT({
      publicNo: result.data!.publicNo,
      org: result.data!.orgName,
      due: result.data!.dueAt ? formatDateTimeUz(result.data!.dueAt) : null,
    }),
    { parse_mode: "HTML", reply_markup: mainMenu() },
  );
}
