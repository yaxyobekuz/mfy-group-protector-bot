/**
 * ADMIN PANELI — TARQATMA YUBORISH.
 *
 *   /admin → auditoriya → tuman → MFY → xabar → usul → tasdiq
 *
 * ── NIMA UCHUN BOTGA XODIM OQIMI QAYTDI ───────────────────────────────
 *
 * ⚠️ ESKI XODIM OQIMI (`bot/issues/*`) OLIB TASHLANGAN EDI va sababi
 * aniq: u FUQARONI boshi berk ko'chaga olib borardi — "Telegram
 * id'ingizni ma'muriyatga yuboring" degan xabar ko'rgan odam
 * ma'muriyatga yozmasdi, shunchaki botni tashlab ketardi. Ya'ni
 * muammo xodim oqimida emas, uning FUQARO YO'LIGA ARALASHIB
 * ketganida edi.
 *
 * ⚠️ BU OQIM BOSHQACHA: u faqat `/admin` buyrug'i bilan ochiladi,
 * buyruqlar ro'yxatida KO'RINMAYDI (`setMyCommands` ga qo'shilmagan)
 * va tanilmagan odam uchun oddiy "tushunmadim" javobini beradi. Fuqaro
 * oqimi umuman o'zgarmaydi.
 *
 * ── "BOT GURUHDA HECH NARSA YOZMAYDI" ─────────────────────────────────
 *
 * ⚠️ QOIDA KUCHDA QOLADI. Bu handler `privateChat` kompozeriga
 * ro'yxatdan o'tadi (`main.ts`), ya'ni guruhda UMUMAN ishlamaydi.
 * Tarqatmani esa bot emas, SERVER yuboradi (`common/telegram.ts`) va
 * guruhga ketgan e'lon kuzatuvga tushmaydi — `group-watch` bot yozgan
 * xabarni olmaydi (`ctx.from?.is_bot`). Ya'ni e'lon keyingi tahlilda
 * signalga aylanib ketmaydi.
 *
 * ── RUXSAT BOTDA TEKSHIRILMAYDI ───────────────────────────────────────
 *
 * ⚠️ HAR QADAMDA SERVER TEKSHIRADI: `telegramId` bo'yicha xodim
 * topiladi va `broadcast.send` huquqi o'qiladi. Botda "men adminman"
 * degan belgi SAQLANMAYDI — panelda huquq olib tashlangandan keyin
 * ham oqim davom etardi.
 */

import type { Composer } from "grammy";

import {
  adminBroadcast,
  adminBroadcastList,
  adminMe,
  adminPreview,
  adminTerritory,
  type BroadcastAudience,
  type BroadcastMode,
} from "../../shared/api";
import { formatDateTimeUz } from "../../shared/date";
import {
  adminAreaKeyboard,
  adminConfirmKeyboard,
  adminContentKeyboard,
  adminMenu,
  adminModeKeyboard,
  audienceKeyboard,
  mainMenu,
} from "../../shared/keyboards";
import {
  ADMIN_BUTTONS,
  ADMIN_TEXTS,
  AUDIENCE_LABELS,
  BROADCAST_STATUS_LABELS,
  MODE_LABELS,
  MENU_VALUES,
  TEXTS,
} from "../../shared/texts";
import { isAlive, type AdminDraft, type BotContext } from "../../shared/context";

export const registerAdmin = (bot: Composer<BotContext>): void => {
  // ═════════════════════════════════════════════════════════════════
  //  KIRISH
  // ═════════════════════════════════════════════════════════════════

  bot.command("admin", async (ctx) => {
    // ⚠️ FUQARO OQIMLARI TASHLANADI: xodim admin bo'limiga o'tyapti
    // va yarim qolgan murojaat qoralamasi unga xalaqit bermasligi
    // kerak.
    delete ctx.session.appeal;
    delete ctx.session.profile;

    const me = await adminMe(String(ctx.from!.id));

    if (!me.ok) {
      /**
       * ⚠️ 403 — ODATIY JAVOB, XATO EMAS: `/admin` ni istalgan fuqaro
       * yozishi mumkin. Shuning uchun bu yerda "xatolik yuz berdi"
       * emas, tushuntirish chiqadi va fuqaro menyusi QAYTARILADI.
       */
      delete ctx.session.admin;

      await ctx.reply(me.status === 403 ? ADMIN_TEXTS.DENIED : (me.error ?? TEXTS.ERROR_GENERIC), {
        parse_mode: "HTML",
        reply_markup: mainMenu(),
      });
      return;
    }

    ctx.session.admin = { step: "audience", startedAt: Date.now() };

    await ctx.reply(
      ADMIN_TEXTS.MENU({
        name: `${me.data!.firstName} ${me.data!.lastName}`.trim(),
        scope: me.data!.provinceWide
          ? "Butun viloyat"
          : (me.data!.districtName ?? "Tuman ko'rsatilmagan"),
      }),
      { parse_mode: "HTML", reply_markup: adminMenu() },
    );
  });

  // ═════════════════════════════════════════════════════════════════
  //  TUGMALAR — faqat admin oqimi FAOL bo'lganda
  // ═════════════════════════════════════════════════════════════════

  /**
   * ⚠️ `bot.on("message")`, `bot.hears` EMAS. Sabab: tarqatma mazmuni
   * ISTALGAN tur bo'lishi mumkin (surat, video, fayl, forward) va
   * `hears` faqat matnni ko'radi. Oqim faol bo'lmasa — `next()`, ya'ni
   * fuqaro oqimi butunlay tegilmaydi.
   */
  bot.on("message", async (ctx, next) => {
    const draft = ctx.session.admin;
    if (!isAlive(draft)) return next();

    const text = ctx.message.text?.trim() ?? "";

    // ⚠️ BUYRUQLAR O'TKAZILADI: `/start` oqim o'rtasida ham ishlashi
    // kerak (`appeal/handler.ts` dagi ayni qoida).
    if (text.startsWith("/")) {
      delete ctx.session.admin;
      return next();
    }

    // ⚠️ FUQARO MENYUSI BOSILSA — ADMIN OQIMI TASHLANADI: xodim
    // "Murojaat yuborish" ni bosgan bo'lsa, u fuqaro sifatida
    // yozmoqchi.
    if (MENU_VALUES.has(text)) {
      delete ctx.session.admin;
      return next();
    }

    if (text === ADMIN_BUTTONS.EXIT) {
      delete ctx.session.admin;
      await ctx.reply(ADMIN_TEXTS.EXITED, { reply_markup: mainMenu() });
      return;
    }

    if (text === ADMIN_BUTTONS.BACK) {
      await goBack(ctx, draft);
      return;
    }

    if (text === ADMIN_BUTTONS.BROADCAST) {
      draft.step = "audience";
      await ctx.reply(ADMIN_TEXTS.PICK_AUDIENCE, {
        parse_mode: "HTML",
        reply_markup: audienceKeyboard(),
      });
      return;
    }

    if (text === ADMIN_BUTTONS.HISTORY) {
      await showHistory(ctx);
      return;
    }

    switch (draft.step) {
      case "audience":
        return handleAudience(ctx, draft, text);
      case "district":
        return handleDistrict(ctx, draft, text);
      case "mahalla":
        return handleMahalla(ctx, draft, text);
      case "content":
        return handleContent(ctx, draft, text);
      case "mode":
        return handleMode(ctx, draft, text);
      case "confirm":
        return handleConfirm(ctx, draft, text);
      default:
        return next();
    }
  });
};

// ═══════════════════════════════════════════════════════════════════
//  1-QADAM: AUDITORIYA
// ═══════════════════════════════════════════════════════════════════

async function handleAudience(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  const audience: BroadcastAudience | null =
    text === ADMIN_BUTTONS.TO_CITIZENS
      ? "citizens"
      : text === ADMIN_BUTTONS.TO_GROUPS
        ? "groups"
        : text === ADMIN_BUTTONS.TO_BOTH
          ? "both"
          : null;

  if (!audience) {
    await ctx.reply(ADMIN_TEXTS.PICK_AUDIENCE, {
      parse_mode: "HTML",
      reply_markup: audienceKeyboard(),
    });
    return;
  }

  draft.audience = audience;
  await askDistrict(ctx, draft);
}

// ═══════════════════════════════════════════════════════════════════
//  2-QADAM: TUMAN
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ RO'YXAT SERVERDAN HAR SAFAR O'QILADI, botda keshlanmaydi: hudud
 * — SOZLAMA va panelda o'zgarishi mumkin (`appeal/handler.ts` dagi
 * kategoriya ro'yxati bilan ayni sabab).
 *
 * ⚠️ RO'YXAT XODIM QAMROVI BO'YICHA KESILGAN HOLDA KELADI: tuman
 * xodimi boshqa tumanlarni ko'rmaydi va "Butun viloyat" tugmasi ham
 * unga berilmaydi — bosilsa server 403 qaytarardi.
 */
async function askDistrict(ctx: BotContext, draft: AdminDraft): Promise<void> {
  const [me, territory] = await Promise.all([
    adminMe(String(ctx.from!.id)),
    adminTerritory(String(ctx.from!.id)),
  ]);

  if (!me.ok || !territory.ok) {
    await ctx.reply(territory.error ?? me.error ?? TEXTS.ERROR_GENERIC, {
      reply_markup: adminMenu(),
    });
    return;
  }

  const districts = territory.data?.districts ?? [];

  draft.step = "district";
  delete draft.districtId;
  delete draft.districtName;
  delete draft.mahallaId;
  delete draft.mahallaName;

  await ctx.reply(ADMIN_TEXTS.PICK_DISTRICT, {
    parse_mode: "HTML",
    reply_markup: adminAreaKeyboard(
      districts.map((district) => district.name),
      me.data!.provinceWide ? ADMIN_BUTTONS.ALL_PROVINCE : null,
    ),
  });
}

async function handleDistrict(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  if (text === ADMIN_BUTTONS.ALL_PROVINCE) {
    draft.step = "content";
    await ctx.reply(ADMIN_TEXTS.ASK_CONTENT, {
      parse_mode: "HTML",
      reply_markup: adminContentKeyboard(),
    });
    return;
  }

  const territory = await adminTerritory(String(ctx.from!.id));
  if (!territory.ok) {
    await ctx.reply(territory.error ?? TEXTS.ERROR_GENERIC, {
      reply_markup: adminMenu(),
    });
    return;
  }

  const district = (territory.data?.districts ?? []).find(
    (item) => item.name.trim().toLowerCase() === text.toLowerCase(),
  );

  // ⚠️ TOPILMASA RO'YXAT QAYTA KO'RSATILADI: oqim FAOL va matn shu
  // oqimga tegishli (`profile/handler.ts` dagi ayni qoida).
  if (!district) {
    await askDistrict(ctx, draft);
    return;
  }

  draft.districtId = district.id;
  draft.districtName = district.name;

  const mahallas = (territory.data?.mahallas ?? []).filter(
    (item) => item.districtId === district.id,
  );

  // ⚠️ MFY YO'Q BO'LSA QADAM O'TKAZIB YUBORILADI: bo'sh ro'yxat
  // ko'rsatish xodimni "nima bosay" degan holatga tushirardi.
  if (mahallas.length === 0) {
    draft.step = "content";
    await ctx.reply(ADMIN_TEXTS.ASK_CONTENT, {
      parse_mode: "HTML",
      reply_markup: adminContentKeyboard(),
    });
    return;
  }

  draft.step = "mahalla";

  await ctx.reply(ADMIN_TEXTS.PICK_MAHALLA(district.name), {
    parse_mode: "HTML",
    reply_markup: adminAreaKeyboard(
      mahallas.map((item) => item.name),
      ADMIN_BUTTONS.WHOLE_DISTRICT,
    ),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  3-QADAM: MFY
// ═══════════════════════════════════════════════════════════════════

async function handleMahalla(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  if (text !== ADMIN_BUTTONS.WHOLE_DISTRICT) {
    const territory = await adminTerritory(String(ctx.from!.id));
    if (!territory.ok) {
      await ctx.reply(territory.error ?? TEXTS.ERROR_GENERIC, {
        reply_markup: adminMenu(),
      });
      return;
    }

    const mahalla = (territory.data?.mahallas ?? [])
      .filter((item) => item.districtId === draft.districtId)
      .find((item) => item.name.trim().toLowerCase() === text.toLowerCase());

    if (!mahalla) {
      const list = (territory.data?.mahallas ?? []).filter(
        (item) => item.districtId === draft.districtId,
      );

      await ctx.reply(ADMIN_TEXTS.PICK_MAHALLA(draft.districtName ?? ""), {
        parse_mode: "HTML",
        reply_markup: adminAreaKeyboard(
          list.map((item) => item.name),
          ADMIN_BUTTONS.WHOLE_DISTRICT,
        ),
      });
      return;
    }

    draft.mahallaId = mahalla.id;
    draft.mahallaName = mahalla.name;
  }

  draft.step = "content";

  await ctx.reply(ADMIN_TEXTS.ASK_CONTENT, {
    parse_mode: "HTML",
    reply_markup: adminContentKeyboard(),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  4-QADAM: XABAR
// ═══════════════════════════════════════════════════════════════════

/**
 * XABARNI QABUL QILADI.
 *
 * ⚠️ IKKI YO'L:
 *   oddiy matn       → `mode: text`, matn serverda saqlanadi
 *   boshqa har narsa → manba (`chat.id`, `message_id`) eslab qolinadi
 *
 * ⚠️ BAYTLAR BOT ORQALI O'TMAYDI: 25 MB li video ham, surat ham
 * Telegram ichida qoladi — server faqat `copyMessage`/`forwardMessage`
 * chaqiradi. Aks holda bir xil fayl tarmoqdan ikki marta o'tardi
 * (`bot-citizens.controller.ts` dagi fayl qoidasi bilan ayni mantiq).
 *
 * ⚠️ MANBA XABARI SHU CHATDA QOLISHI KERAK: admin uni o'chirsa,
 * tarqatma ishlamay qoladi. Shuning uchun tasdiq ekrani darhol
 * ko'rsatiladi va yuborish uzoq kutilmaydi.
 */
async function handleContent(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  const message = ctx.message;

  // ⚠️ BO'LMASLIGI KERAK (handler `message` ga ulangan), lekin
  // TypeScript uni ixtiyoriy deb biladi — tekshiruvsiz qolsa,
  // `undefined` ustidan o'qish ish vaqtida yiqilardi.
  if (!message) return;

  /**
   * ⚠️ FORWARD QILINGAN MATN HAM "NUSXA" YO'LIDAN KETADI: uning
   * formatlashi (qalin matn, havolalar, emoji) matn sifatida qayta
   * yozilganda YO'QOLARDI. `forward_origin` borligi aynan shuni
   * bildiradi.
   */
  const isForwarded = "forward_origin" in message && Boolean(message.forward_origin);
  const isPlainText = Boolean(message.text) && !isForwarded;

  if (isPlainText) {
    if (text.length < 3) {
      await ctx.reply(ADMIN_TEXTS.NEED_CONTENT, {
        reply_markup: adminContentKeyboard(),
      });
      return;
    }

    draft.mode = "text";
    draft.message = text;
    delete draft.fromChatId;
    delete draft.sourceMessageId;

    await showConfirm(ctx, draft);
    return;
  }

  draft.fromChatId = String(ctx.chat!.id);
  draft.sourceMessageId = String(message.message_id);
  delete draft.message;

  draft.step = "mode";

  await ctx.reply(ADMIN_TEXTS.PICK_MODE, {
    parse_mode: "HTML",
    reply_markup: adminModeKeyboard(),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  5-QADAM: USUL
// ═══════════════════════════════════════════════════════════════════

async function handleMode(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  const mode: BroadcastMode | null =
    text === ADMIN_BUTTONS.MODE_COPY
      ? "copy"
      : text === ADMIN_BUTTONS.MODE_FORWARD
        ? "forward"
        : null;

  if (!mode) {
    await ctx.reply(ADMIN_TEXTS.PICK_MODE, {
      parse_mode: "HTML",
      reply_markup: adminModeKeyboard(),
    });
    return;
  }

  draft.mode = mode;
  await showConfirm(ctx, draft);
}

// ═══════════════════════════════════════════════════════════════════
//  6-QADAM: TASDIQ
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ AUDITORIYA HAJMI YUBORISHDAN OLDIN SO'RALADI: "1 240 kishiga
 * yuboriladi" degan son hudud noto'g'ri tanlanganini TO'XTATADI.
 * Usiz xato faqat yuborilgandan KEYIN bilinardi — qaytarib
 * bo'lmaydigan paytda.
 */
async function showConfirm(ctx: BotContext, draft: AdminDraft): Promise<void> {
  const size = await adminPreview(String(ctx.from!.id), {
    audience: draft.audience!,
    districtId: draft.districtId,
    mahallaId: draft.mahallaId,
  });

  if (!size.ok) {
    await ctx.reply(size.error ?? TEXTS.ERROR_GENERIC, { reply_markup: adminMenu() });
    return;
  }

  draft.citizens = size.data!.citizens;
  draft.groups = size.data!.groups;

  // ⚠️ BO'SH AUDITORIYAGA YUBORISHGA RUXSAT BERILMAYDI: natija "0
  // yuborildi" bo'lardi va xodim buni xato deb o'ylardi.
  if (size.data!.total === 0) {
    draft.step = "audience";

    await ctx.reply(ADMIN_TEXTS.EMPTY_AUDIENCE, {
      parse_mode: "HTML",
      reply_markup: audienceKeyboard(),
    });
    return;
  }

  draft.step = "confirm";

  await ctx.reply(
    ADMIN_TEXTS.CONFIRM({
      audience: AUDIENCE_LABELS[draft.audience!] ?? draft.audience!,
      area: areaLabel(draft),
      mode: MODE_LABELS[draft.mode!] ?? draft.mode!,
      citizens: size.data!.citizens,
      groups: size.data!.groups,
      preview: draft.message ?? null,
    }),
    { parse_mode: "HTML", reply_markup: adminConfirmKeyboard() },
  );
}

async function handleConfirm(
  ctx: BotContext,
  draft: AdminDraft,
  text: string,
): Promise<void> {
  if (text !== ADMIN_BUTTONS.CONFIRM) {
    await showConfirm(ctx, draft);
    return;
  }

  const result = await adminBroadcast(String(ctx.from!.id), {
    audience: draft.audience!,
    mode: draft.mode!,
    message: draft.message,
    fromChatId: draft.fromChatId,
    sourceMessageId: draft.sourceMessageId,
    districtId: draft.districtId,
    mahallaId: draft.mahallaId,
  });

  if (!result.ok) {
    /**
     * ⚠️ HOLAT TOZALANMAYDI: server vaqtincha yiqilgan bo'lsa, xodim
     * xabarni QAYTA yozmasligi kerak — u shunchaki yana "Yuborish"
     * ni bosadi (`appeal/handler.ts` dagi ayni qoida).
     */
    await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, {
      reply_markup: adminConfirmKeyboard(),
    });
    return;
  }

  const total = (draft.citizens ?? 0) + (draft.groups ?? 0);

  ctx.session.admin = { step: "audience", startedAt: Date.now() };

  await ctx.reply(ADMIN_TEXTS.STARTED(total), {
    parse_mode: "HTML",
    reply_markup: adminMenu(),
  });
}

// ═══════════════════════════════════════════════════════════════════
//  TARIX
// ═══════════════════════════════════════════════════════════════════

async function showHistory(ctx: BotContext): Promise<void> {
  const result = await adminBroadcastList(String(ctx.from!.id), 5);

  if (!result.ok) {
    await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, { reply_markup: adminMenu() });
    return;
  }

  const items = result.data?.items ?? [];

  if (items.length === 0) {
    await ctx.reply(ADMIN_TEXTS.HISTORY_EMPTY, { reply_markup: adminMenu() });
    return;
  }

  await ctx.reply(
    ADMIN_TEXTS.HISTORY(
      items.map((item) => ({
        at: formatDateTimeUz(item.createdAt),
        audience: AUDIENCE_LABELS[item.audience] ?? item.audience,
        area: item.mahalla?.name ?? item.district?.name ?? "Butun viloyat",
        status: BROADCAST_STATUS_LABELS[item.status] ?? item.status,
        sent: item.sent,
        failed: item.failed,
        total: item.total,
        preview: item.text,
      })),
    ),
    { parse_mode: "HTML", reply_markup: adminMenu() },
  );
}

// ═══════════════════════════════════════════════════════════════════
//  Ichki
// ═══════════════════════════════════════════════════════════════════

const areaLabel = (draft: AdminDraft): string =>
  draft.mahallaName ?? draft.districtName ?? "Butun viloyat";

/**
 * BIR QADAM ORTGA.
 *
 * ⚠️ KERAK, CHUNKI OQIM UZUN: xodim tumanni noto'g'ri tanlab,
 * boshidan boshlashga majbur bo'lmasligi kerak — ayniqsa xabar
 * allaqachon forward qilingan bo'lsa (uni qayta topish kerak
 * bo'lardi).
 */
async function goBack(ctx: BotContext, draft: AdminDraft): Promise<void> {
  switch (draft.step) {
    case "district":
      draft.step = "audience";
      await ctx.reply(ADMIN_TEXTS.PICK_AUDIENCE, {
        parse_mode: "HTML",
        reply_markup: audienceKeyboard(),
      });
      return;

    case "mahalla":
      await askDistrict(ctx, draft);
      return;

    case "content":
      if (draft.districtId) {
        await handleDistrict(ctx, draft, draft.districtName ?? "");
        return;
      }
      await askDistrict(ctx, draft);
      return;

    case "mode":
    case "confirm":
      draft.step = "content";
      await ctx.reply(ADMIN_TEXTS.ASK_CONTENT, {
        parse_mode: "HTML",
        reply_markup: adminContentKeyboard(),
      });
      return;

    default:
      await ctx.reply(ADMIN_TEXTS.CANCELLED, { reply_markup: adminMenu() });
  }
}
