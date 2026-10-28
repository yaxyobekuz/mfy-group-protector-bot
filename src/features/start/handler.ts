/**
 * KIRISH VA YORDAM.
 *
 * ⚠️ BU HANDLER'LAR FAQAT SHAXSIY CHATDA ishlaydi
 * (`main.ts` dagi filtr). Guruhda `/start` bosilsa bot JIM TURADI:
 * u guruhda KUZATUVCHI va hech narsa yozmasligi kerak
 * (`group-watch/handler.ts` izohi).
 *
 * ── "BOG'LANMAGANSIZ" HOLATI YO'Q ─────────────────────────────────────
 *
 * ⚠️ BOT FUQARO UCHUN. Avval bu yerda xodim tekshiruvi bor edi
 * (`link-check` → "Telegram id'ingizni ma'muriyatga yuboring") va u
 * OLIB TASHLANDI: botga yozgan odam fuqaro va undan hech narsa talab
 * qilinmaydi. Eski oqim fuqaroni boshi berk ko'chaga olib borardi —
 * u ma'muriyatga yozmasdi, shunchaki botni tashlab ketardi.
 *
 * Fuqaro `/start` bosganda SERVERDA yaratiladi (`bot/citizens/start`),
 * xuddi mini-ilovada birinchi kirishda bo'lgani kabi.
 */

import type { Composer } from "grammy";

import { citizenStart } from "../../shared/api";
import { mainMenu } from "../../shared/keyboards";
import { BUTTONS, TEXTS } from "../../shared/texts";
import { identityOf, type BotContext } from "../../shared/context";

export const registerStart = (bot: Composer<BotContext>): void => {
  bot.command("start", async (ctx) => {
    // ⚠️ YARIM QOLGAN OQIM TOZALANADI: `/start` — "boshidan
    // boshlaymiz" degani va eski holat yangi oqimga xalaqit
    // bermasligi kerak.
    delete ctx.session.appeal;
    delete ctx.session.profile;

    const result = await citizenStart(identityOf(ctx));

    if (!result.ok) {
      // ⚠️ BLOKLANGAN FUQARO SABABNI KO'RADI (server 403 bilan
      // sababni qaytaradi): sababsiz jimlik "bot buzilgan" degan
      // taassurot qoldirardi (CLAUDE.md — "cheklash sababi
      // majburiy").
      await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC);
      return;
    }

    await ctx.reply(TEXTS.START(result.data!.firstName), {
      parse_mode: "HTML",
      reply_markup: mainMenu(),
    });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(TEXTS.HELP, { parse_mode: "HTML", reply_markup: mainMenu() });
  });

  bot.hears(BUTTONS.HELP, async (ctx) => {
    // ⚠️ HOLAT TOZALANADI: menyu tugmasi bosilgani oqim tashlab
    // ketilganini bildiradi (`appeal/handler.ts` izohi).
    delete ctx.session.appeal;
    delete ctx.session.profile;

    await ctx.reply(TEXTS.HELP, { parse_mode: "HTML", reply_markup: mainMenu() });
  });
};
