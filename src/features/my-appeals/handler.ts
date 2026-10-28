/**
 * MUROJAATLARIM — fuqaro o'z murojaatlarini va ularning holatini
 * ko'radi.
 *
 * ⚠️ FUQARO FAQAT O'ZINIKINI KO'RADI va buni SERVER ta'minlaydi
 * (`citizenId` bo'yicha filtr). Botda tekshiruv YO'Q: u yerda
 * qilinsa, qoida ikki joyda bo'lib, ajralib ketardi.
 *
 * ⚠️ RO'YXAT SAHIFALANMAYDI, lekin KESILADI: fuqaroning murojaatlari
 * o'nlab bo'lishi mumkin va Telegram xabari 4096 belgi bilan
 * cheklangan. Eng yangi N tasi ko'rsatiladi va qolgani borligi
 * AYTILADI — jim kesilsa, fuqaro eski murojaati yo'qolgan deb
 * o'ylardi.
 */

import type { Composer } from "grammy";

import { listAppeals } from "../../shared/api";
import { formatDateUz } from "../../shared/date";
import { mainMenu } from "../../shared/keyboards";
import { BUTTONS, TEXTS } from "../../shared/texts";
import { identityOf, type BotContext } from "../../shared/context";

/**
 * ⚠️ BITTA XABARDA NECHTA: Telegram chegarasi 4096 belgi va bitta
 * murojaat ~200 belgi. 10 ta xavfsiz chegara.
 */
const PAGE_SIZE = 10;

export const registerMyAppeals = (bot: Composer<BotContext>): void => {
  bot.hears(BUTTONS.MY_ISSUES, async (ctx) => {
    // ⚠️ HOLAT TOZALANADI: menyu tugmasi bosilgani oqim tashlab
    // ketilganini bildiradi (`appeal/handler.ts` izohi).
    delete ctx.session.appeal;
    delete ctx.session.profile;

    const result = await listAppeals(identityOf(ctx));

    if (!result.ok) {
      await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
      return;
    }

    const items = result.data?.items ?? [];

    if (items.length === 0) {
      await ctx.reply(TEXTS.APPEALS_EMPTY, { reply_markup: mainMenu() });
      return;
    }

    const counts = result.data!.counts;

    const shown = items.slice(0, PAGE_SIZE);
    const blocks = shown.map((item) =>
      TEXTS.APPEAL_ITEM({
        publicNo: item.publicNo,
        title: item.title,
        status: item.status,
        category: item.category.name,
        createdAt: formatDateUz(item.createdAt),
        place: item.address,
      }),
    );

    // ⚠️ KESILGANI AYTILADI — jim tashlanmaydi.
    const footer =
      items.length > PAGE_SIZE
        ? `\n\n<i>Eng yangi ${PAGE_SIZE} tasi ko'rsatildi (jami ${items.length} ta).</i>`
        : "";

    await ctx.reply(
      `${TEXTS.APPEALS_HEADER(counts)}\n\n${blocks.join("\n\n")}${footer}`,
      { parse_mode: "HTML", reply_markup: mainMenu() },
    );
  });
};
