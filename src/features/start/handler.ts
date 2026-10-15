/**
 * KIRISH VA YORDAM.
 *
 * ⚠️ BU HANDLER'LAR FAQAT SHAXSIY CHATDA ishlaydi
 * (`main.ts` dagi filtr). Guruhda `/start` bosilsa bot JIM TURADI:
 * u guruhda KUZATUVCHI va hech narsa yozmasligi kerak
 * (`group-watch/handler.ts` izohi).
 */

import type { Composer } from "grammy";

import { checkLink } from "../../shared/api";
import { mainMenu } from "../../shared/keyboards";
import { BUTTONS, TEXTS } from "../../shared/texts";
import type { BotContext } from "../../shared/context";

export const registerStart = (bot: Composer<BotContext>): void => {
  bot.command("start", async (ctx) => {
    // ⚠️ YARIM QOLGAN OQIM TOZALANADI: `/start` — "boshidan
    // boshlaymiz" degani va eski holat yangi oqimga xalaqit
    // bermasligi kerak.
    delete ctx.session.issueDraft;

    const telegramId = String(ctx.from!.id);
    const link = await checkLink(telegramId);

    if (!link.ok) {
      await ctx.reply(link.error ?? TEXTS.ERROR_GENERIC);
      return;
    }

    // ⚠️ BOG'LANMAGAN ODAMGA NIMA QILISH KERAKLIGI AYTILADI va
    // Telegram id'si KO'RSATILADI: u uni o'zi topa olmaydi, lekin
    // ma'muriyat uni bog'lash uchun aynan shu raqamni so'raydi.
    if (!link.data?.linked) {
      await ctx.reply(TEXTS.START_NOT_LINKED(telegramId), { parse_mode: "HTML" });
      return;
    }

    const name = [link.data.firstName, link.data.lastName].filter(Boolean).join(" ");

    await ctx.reply(TEXTS.START_LINKED(name, link.data.districtName ?? null), {
      parse_mode: "HTML",
      reply_markup: mainMenu(),
    });
  });

  bot.command("help", async (ctx) => {
    await ctx.reply(TEXTS.HELP, { parse_mode: "HTML", reply_markup: mainMenu() });
  });

  bot.hears(BUTTONS.HELP, async (ctx) => {
    // ⚠️ HOLAT TOZALANADI: menyu tugmasi bosilgani oqim tashlab
    // ketilganini bildiradi (`issue-submit/handler.ts` izohi).
    delete ctx.session.issueDraft;

    await ctx.reply(TEXTS.HELP, { parse_mode: "HTML", reply_markup: mainMenu() });
  });
};
