/**
 * BEKOR QILISH — HAR QANDAY OQIMNI to'xtatadi.
 *
 * ⚠️ ALOHIDA HANDLER VA ENG BIRINCHI RO'YXATDAN O'TADI. Avval bu
 * murojaat oqimining ichida edi va PROFIL oqimida ISHLAMAY qolardi:
 * profil handler'i `message:text` ni oldinroq tinglaydi va "❌ Bekor
 * qilish" matnini TUMAN NOMI deb tekshirardi. Nom topilmagach
 * `next()` chaqirilardi — ya'ni tugma hech narsa qilmaganga
 * o'xshardi, fuqaro esa oqimdan chiqa olmasdi.
 *
 * ⚠️ IKKALA QORALAMA HAM tozalanadi: fuqaro qaysi oqimda turganini
 * bilmaydi va tugma har ikkisida ham bir xil ishlashi kerak.
 */

import type { Composer } from "grammy";

import { mainMenu } from "../../shared/keyboards";
import { BUTTONS, TEXTS } from "../../shared/texts";
import type { BotContext } from "../../shared/context";

export const registerCancel = (bot: Composer<BotContext>): void => {
  bot.hears(BUTTONS.CANCEL, async (ctx) => {
    // ⚠️ HOLAT BOR-YO'QLIGIDAN QAT'IY NAZAR tozalanadi: tugma
    // mijozda qolib, oqim allaqachon tugagan bo'lishi mumkin va
    // o'shanda ham javob berish kerak.
    delete ctx.session.appeal;
    delete ctx.session.profile;

    await ctx.reply(TEXTS.CANCELLED, { reply_markup: mainMenu() });
  });
};
