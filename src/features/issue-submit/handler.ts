/**
 * MUAMMO YUBORISH — ikki bosqichli oqim.
 *
 *   tugma bosildi  →  kategoriya tanlanadi  →  matn yoziladi  →  yuborildi
 *
 * ── TARTIB MUHIM ──────────────────────────────────────────────────────
 *
 * ⚠️ MENYU TUGMALARI OQIM HOLATIDAN OLDIN tekshiriladi. Bu nozik joy:
 * odam kategoriya tanlab, matn yozish o'rniga "Yordam" tugmasini
 * bosishi mumkin. Agar holat avval tekshirilsa, bosilgan tugmaning
 * MATNI ("ℹ️ Yordam") muammo mazmuni bo'lib ketardi — va u shtab
 * paneliga shundayligicha tushardi.
 *
 * Shuning uchun: menyu tugmasi bosilsa, oqim TASHLAB KETILGAN deb
 * hisoblanadi va holat tozalanadi.
 *
 * ── KATEGORIYA NOM BO'YICHA TOPILADI ──────────────────────────────────
 *
 * ⚠️ Oddiy klaviatura tugmasi — MATNLI XABAR, ya'ni bizga faqat NOM
 * qaytadi, `id` emas. Qidiruv FAQAT FAOL kategoriyalar orasidan:
 * klaviatura MIJOZDA qoladi va odam uni ochiq qoldirib, kategoriya
 * o'chirilgandan keyin tugmani bosishi mumkin. O'shanda murojaat
 * o'chirilgan kategoriyaga tushib qolmasligi kerak.
 */

import type { Composer } from "grammy";

import { checkLink, getCategories, submitIssue } from "../../shared/api";
import { cancelKeyboard, categoryKeyboard, mainMenu } from "../../shared/keyboards";
import { BUTTONS, BUTTON_VALUES, TEXTS } from "../../shared/texts";
import { isDraftAlive, type BotContext } from "../../shared/context";

/**
 * MATN CHEGARALARI.
 *
 * ⚠️ SERVERDAGI `BotSubmitDto` BILAN AYNI (10–1500). Ikkisi
 * ajralsa, bot qabul qilgan matn serverda rad etilib, foydalanuvchi
 * "yuborildi" deb o'ylab qolardi.
 *
 * ⚠️ YUQORI CHEGARA Telegram'ning 4096 idan KICHIK va bu ataylab:
 * panelda ro'yxat ko'rinishi o'qilishi kerak.
 */
const BODY_MIN = 10;
const BODY_MAX = 1500;

export const registerIssueSubmit = (bot: Composer<BotContext>): void => {
  // ═════════════════════════════════════════════════════════════════
  //  BEKOR QILISH — har bosqichda ishlaydi
  // ═════════════════════════════════════════════════════════════════

  bot.hears(BUTTONS.CANCEL, async (ctx) => {
    // ⚠️ HOLAT BOR-YO'QLIGIDAN QAT'IY NAZAR tozalanadi: tugma
    // mijozda qolib, oqim allaqachon tugagan bo'lishi mumkin va
    // o'shanda ham javob berish kerak.
    delete ctx.session.issueDraft;

    await ctx.reply(TEXTS.ISSUE_CANCELLED, { reply_markup: mainMenu() });
  });

  // ═════════════════════════════════════════════════════════════════
  //  1-BOSQICH: tugma bosildi → kategoriyalar
  // ═════════════════════════════════════════════════════════════════

  bot.hears(BUTTONS.SUBMIT_ISSUE, async (ctx) => {
    const telegramId = String(ctx.from!.id);

    const link = await checkLink(telegramId);
    if (!link.ok) {
      await ctx.reply(link.error ?? TEXTS.ERROR_GENERIC);
      return;
    }

    if (!link.data?.linked) {
      await ctx.reply(TEXTS.NOT_LINKED);
      return;
    }

    const categories = await getCategories();
    if (!categories.ok) {
      await ctx.reply(categories.error ?? TEXTS.ERROR_GENERIC);
      return;
    }

    const list = categories.data ?? [];

    // ⚠️ KATEGORIYA YO'Q — OQIM BOSHLANMAYDI. Serverda `categoryId`
    // majburiy va kategoriyasiz so'rov baribir rad etilardi; buni
    // oldindan aytish foydalanuvchini matn yozib, keyin xato
    // olishdan saqlaydi.
    if (list.length === 0) {
      await ctx.reply(TEXTS.ISSUE_NO_CATEGORIES, { reply_markup: mainMenu() });
      return;
    }

    // ⚠️ YANGI OQIM ESKISINI TASHLAYDI: odam bir vaqtda ikki
    // muammo yozmaydi va yarim qolgan oqim yangisiga xalaqit
    // bermasligi kerak.
    delete ctx.session.issueDraft;

    await ctx.reply(TEXTS.ISSUE_PICK_CATEGORY, {
      parse_mode: "HTML",
      reply_markup: categoryKeyboard(list.map((category) => category.name)),
    });
  });

  // ═════════════════════════════════════════════════════════════════
  //  2–3-BOSQICH: kategoriya tanlandi / matn yozildi
  // ═════════════════════════════════════════════════════════════════

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    // ⚠️ BUYRUQLAR O'TKAZILADI: `/start` oqim o'rtasida ham
    // ishlashi kerak (odam yo'lni yo'qotganda shuni bosadi).
    if (text.startsWith("/")) return next();

    // ⚠️ MENYU TUGMASI OQIM HOLATIDAN OLDIN — fayl boshidagi izoh.
    // Bu `hears` handler'lari allaqachon javob bergan tugmalar
    // uchun ham kerak: ular `next()` chaqirmaydi, lekin bu
    // tekshiruv ularni qo'shimcha himoya qiladi.
    if (BUTTON_VALUES.has(text)) {
      delete ctx.session.issueDraft;
      return next();
    }

    const draft = ctx.session.issueDraft;

    // ── 3-BOSQICH: matn yozildi ─────────────────────────────────
    if (isDraftAlive(draft)) {
      if (text.length < BODY_MIN) {
        await ctx.reply(TEXTS.ISSUE_TOO_SHORT(BODY_MIN), {
          reply_markup: cancelKeyboard(),
        });
        return;
      }

      // ⚠️ UZUN MATN KESILMAYDI: kesilsa odam yozganining yarmi
      // JIMGINA yo'qolardi va u buni bilmasdi.
      if (text.length > BODY_MAX) {
        await ctx.reply(TEXTS.ISSUE_TOO_LONG(BODY_MAX, text.length), {
          reply_markup: cancelKeyboard(),
        });
        return;
      }

      const result = await submitIssue({
        telegramId: String(ctx.from!.id),
        // ⚠️ JAVOB AYNAN SHU CHATGA qaytadi — server uni
        // muhrlaydi, keyin bog'lanish uzilsa ham.
        chatId: String(ctx.chat.id),
        categoryId: draft.categoryId,
        body: text,
      });

      if (!result.ok) {
        // ⚠️ HOLAT TOZALANMAYDI: server vaqtincha yiqilgan bo'lsa,
        // odam matnni QAYTA YOZMASLIGI kerak — u shunchaki yana
        // yuborib ko'radi.
        await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, {
          reply_markup: cancelKeyboard(),
        });
        return;
      }

      delete ctx.session.issueDraft;

      await ctx.reply(TEXTS.ISSUE_SENT(result.data!.publicNo), {
        parse_mode: "HTML",
        reply_markup: mainMenu(),
      });
      return;
    }

    // ── 2-BOSQICH: kategoriya tanlanganmi? ──────────────────────
    //
    // ⚠️ HAR MATNDA SERVERGA BORILMAYDI: faqat kategoriyalar
    // ro'yxatida mos keladigan nom bo'lsa. Aks holda har tasodifiy
    // xabar serverga so'rov bo'lib ketardi.
    const categories = await getCategories();
    if (!categories.ok) {
      await ctx.reply(categories.error ?? TEXTS.ERROR_GENERIC);
      return;
    }

    const needle = text.toLowerCase();
    const matched = (categories.data ?? []).find(
      (category) => category.name.trim().toLowerCase() === needle,
    );

    if (!matched) {
      // Tanilmagan matn — `next()` orqali umumiy handler'ga.
      return next();
    }

    ctx.session.issueDraft = {
      categoryId: matched.id,
      categoryName: matched.name,
      startedAt: Date.now(),
    };

    await ctx.reply(TEXTS.ISSUE_ASK_BODY(matched.name, BODY_MIN, BODY_MAX), {
      parse_mode: "HTML",
      reply_markup: cancelKeyboard(),
    });
  });
};
