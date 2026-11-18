/**
 * TASHKILOTNI SHU CHATGA ULASH — `/ulash <KOD>`.
 *
 * ── NIMA UCHUN BOT KERAK ──────────────────────────────────────────────
 *
 * Murojaat tashkilotga yo'naltirilganda unga Telegram xabarnomasi
 * ketadi, lekin server MANZILNI bilishi kerak. Oddiy odam o'z chat
 * id'sini bilmaydi va panelda qo'lda yozdirilsa, tashkilot rahbari
 * "chat id" degan so'zni tushunmay, ma'muriyatga qayta qo'ng'iroq
 * qilardi.
 *
 * ⚠️ YECHIM — BIR MARTALIK KOD: panel kod beradi, tashkilot botga
 * `/ulash <KOD>` deb yozadi va manzilni TELEGRAM'ning o'zi aytadi
 * (`message.from.id`). Ya'ni xato yozish imkoni yo'q.
 *
 * ── "BOT GURUHDA HECH NARSA YOZMAYDI" ─────────────────────────────────
 *
 * ⚠️ QOIDA KUCHDA QOLADI. Handler `privateChat` kompozeriga ro'yxatdan
 * o'tadi (`main.ts`) — ya'ni guruhda UMUMAN ishlamaydi. Agar
 * to'g'ridan-to'g'ri `bot` ga qo'shilsa, u MFY guruhida ham javob
 * yozib, doktrinani buzardi.
 *
 * ⚠️ SERVER MFY GURUHINING chat id'sini RAD ETADI
 * (`organizations.service.ts#linkTelegram`): aks holda bot
 * kuzatiladigan guruhga xabarnoma yozib, o'sha xabar keyingi AI
 * tahlilida SIGNALGA aylanardi.
 *
 * ── XABARNOMANI BOT YUBORMAYDI ────────────────────────────────────────
 *
 * ⚠️ XABARNI SERVER YUBORADI (`common/telegram.ts`), bot esa faqat
 * ULANISHNI qabul qiladi. Botga topshirilsa, (1) bot qayta ishga
 * tushganda navbat yo'qolardi, (2) `getUpdates` oqimi sekinlashib,
 * xavfsizlik qalqoni ham kechikardi.
 *
 * ── BUYRUQLAR RO'YXATIDA KO'RINMAYDI ──────────────────────────────────
 *
 * ⚠️ `setMyCommands` GA QO'SHILMAGAN (`/admin` bilan AYNI qaror): bu
 * buyruq FUQARO uchun emas va ro'yxatda ko'rinsa, har kim kod izlab
 * urinib ko'rardi. Kodsiz yozilganda esa oqim OCHILMAYDI — faqat
 * qanday yozish kerakligi aytiladi.
 */

import type { Composer } from "grammy";

import { linkOrganization } from "../../shared/api";
import { ORG_TEXTS } from "../../shared/texts";
import type { BotContext } from "../../shared/context";

export const registerOrgLink = (bot: Composer<BotContext>): void => {
  bot.command("ulash", async (ctx) => {
    /**
     * ⚠️ KOD BUYRUQ BILAN BIRGA KELADI, SESSIYA OCHILMAYDI:
     * "kodni yuboring" deb kutib turish oqimi fuqaro murojaat
     * oqimi bilan to'qnashardi — keyingi yozilgan har qanday matn
     * kod deb o'qilib, murojaat matni YO'QOLARDI.
     */
    const code = (ctx.match ?? "").toString().trim();

    if (!code) {
      await ctx.reply(ORG_TEXTS.ASK_CODE, { parse_mode: "HTML" });
      return;
    }

    const telegramId = ctx.from?.id;
    if (!telegramId) return;

    const result = await linkOrganization(String(telegramId), code);

    /**
     * ⚠️ SERVERNING XATO MATNI KO'RSATILADI, agar bo'lsa: u
     * "bu chat MFY guruhi sifatida ro'yxatda" yoki "bu chat
     * boshqa tashkilotga ulangan" kabi AMAL QILSA BO'LADIGAN
     * sabablarni aytadi. Umumiy matn bilan almashtirilsa,
     * tashkilot nima qilishini bilmasdi.
     */
    if (!result.ok || !result.data) {
      await ctx.reply(result.error ?? ORG_TEXTS.FAILED, { parse_mode: "HTML" });
      return;
    }

    await ctx.reply(ORG_TEXTS.LINKED(result.data.organizationName), {
      parse_mode: "HTML",
    });
  });
};
