/**
 * XAVFSIZLIK QALQONI — zararli fayl va havolalarni o'chirish.
 *
 * ── "BOT GURUHDA HECH NARSA YOZMAYDI" QOIDASI BUZILMAYDI ──────────────
 *
 * ⚠️ O'CHIRISH — YOZISH EMAS. Bot guruh yozishmasiga YANGI xabar
 * qo'shmaydi: na ogohlantirish, na "men o'chirdim" degan javob.
 * Shuning uchun "bot o'z aksini muammo deb topadi" xavfi tug'ilmaydi
 * va asosiy doktrina kuchida qoladi.
 *
 * ⚠️ OGOHLANTIRISH YOZILMAYDI va bu ataylab: "⚠️ Zararli fayl
 * o'chirildi" degan xabar guruh yozishmasiga tushib, keyingi AI
 * tahlilida "guruhda muammo bor" degan signalga aylanardi. Ma'muriyat
 * nima bo'lganini PANELDAN ko'radi.
 *
 * ── TARTIB: QALQON BIRINCHI ──────────────────────────────────────────
 *
 * ⚠️ BU HANDLER KUZATUVDAN OLDIN ishlaydi (`main.ts`). Sabab: zararli
 * havolali xabar avval navbatga tushib, keyin o'chirilsa — matn
 * baribir AI'ga borardi va signal sifatida panelda paydo bo'lardi.
 * Ya'ni firibgarning matni rasmiy murojaatga aylanib ketishi mumkin
 * edi.
 *
 * ── QALQON `isOfficial` GA BOG'LIQ EMAS ──────────────────────────────
 *
 * ⚠️ `isOfficial` — yozishmani O'QISHGA rozilik; qalqon esa aholini
 * himoya qiladi. Guruh kuzatuvga yopiq bo'lsa ham undagi odamlarni
 * virusdan himoya qilish mumkin, shuning uchun ikki belgi ALOHIDA
 * (`TelegramGroup.guardEnabled`).
 *
 * ── KANALDA QALQON UMUMAN ISHGA TUSHMAYDI ────────────────────────────
 *
 * ⚠️ KANALDA ZARARLI KONTENTNI O'SHA KANALNING O'Z ADMINI YOZADI:
 * guruhda qalqon begona odamdan (firibgardan) aholini himoya qiladi,
 * kanalda esa "himoya qilinadigan" va "tahdid soladigan" tomon BIR
 * XIL bo'lib qoladi — ya'ni bot ma'muriyatning o'z e'lonini
 * o'chirishga urinardi. Rais e'lonida havola bo'lishi esa ODATIY
 * hol.
 *
 * ⚠️ TEKSHIRUV `channel_post` NI RO'YXATGA OLMASLIK BILAN
 * CHEKLANMAYDI: `chat.type` ham tekshiriladi. Sabab — kanalga
 * ulangan muhokama guruhidagi xabar `message` bo'lib keladi va
 * bir kun kelib `channel_post` ni ham shu handler'ga ulash
 * vasvasasi paydo bo'lishi mumkin. Shart ikki qavat bo'lsa, o'sha
 * o'zgarish qalqonni kanalga ochib yubormaydi.
 *
 * ⚠️ KUZATUVGA O'TADI (`next()`), TO'XTAMAYDI: kanal posti AI
 * tahliliga borishi KERAK — signal oqimi kanalda ham ishlaydi
 * (`shared/chat-type.ts`).
 */

import type { Composer } from "grammy";

import { getGuardConfig, reportThreat, type GuardConfig } from "../../shared/api";
import type { BotContext } from "../../shared/context";
import { feedHosts, refreshBlocklist } from "./blocklist";
import { diagnoseDeleteFailure } from "./delete-failure";
import { inspectFile, inspectText, inspectUrl, type ThreatVerdict } from "./detect";
import { guardApplies, WATCHED_CHAT_TYPES } from "../../shared/chat-type";

/**
 * QALQON SOZLAMASI KESHI — `chatId` → `{ config, at }`.
 *
 * ⚠️ KESH KERAK: faol guruhda daqiqada o'nlab xabar bo'ladi va har
 * biri uchun serverga borish so'rovlar sonini xabar soniga
 * tenglashtirardi.
 *
 * ⚠️ MUDDATI QISQA (2 daqiqa) — kuzatuv keshi bilan AYNI sabab:
 * qalqon panelda istalgan payt O'CHIRILISHI mumkin va o'shandan
 * keyin bot xabar o'chirishda davom etmasligi kerak. O'chirish
 * qaytarib bo'lmaydigan amal, ya'ni bu yerda eskirgan kesh
 * kuzatuvdagidan ham jiddiyroq.
 */
const CONFIG_CACHE_TTL_MS = 2 * 60 * 1000;
const configCache = new Map<string, { config: GuardConfig; at: number }>();

const readCache = (chatId: string): GuardConfig | null => {
  const entry = configCache.get(chatId);
  if (!entry) return null;

  if (Date.now() - entry.at > CONFIG_CACHE_TTL_MS) {
    configCache.delete(chatId);
    return null;
  }

  return entry.config;
};

/** Dalil sifatida saqlanadigan matn uzunligi. */
const MAX_EVIDENCE = 2000;

export const registerGuard = (bot: Composer<BotContext>): void => {
  bot.on("message", async (ctx, next) => {
    const chat = ctx.chat;

    // Shaxsiy chat — qalqon u yerda ishlamaydi (guruh emas).
    if (!WATCHED_CHAT_TYPES.has(chat.type)) return next();

    /**
     * ⚠️ KANAL — QALQONDAN TASHQARIDA (fayl boshidagi doktrina).
     * Bu BIRINCHI shart: sozlama ham so'ralmaydi, qora ro'yxat ham
     * yangilanmaydi, hodisa ham yozilmaydi. Server baribir rad
     * etadi (`security.service.ts#report`), lekin botda ham
     * to'xtatish KERAK — aks holda har kanal posti uchun bekorga
     * HTTP so'rov ketardi va server yiqilgan paytda eski kesh
     * bo'yicha o'chirish urinishi ham bo'lib ketardi.
     */
    if (!guardApplies(chat.type)) return next();

    const chatId = String(chat.id);

    // ⚠️ BOT XABARI TEKSHIRILMAYDI: o'z xabarini yoki boshqa
    // rasmiy botning hisobotini o'chirish mumkin emas.
    if (ctx.from?.is_bot) return next();

    // ── SOZLAMA ─────────────────────────────────────────────────
    let config = readCache(chatId);

    if (!config) {
      const result = await getGuardConfig(chatId);

      if (!result.ok || !result.data) {
        /**
         * ⚠️ SERVER YO'Q — XABAR O'CHIRILMAYDI va oqim DAVOM
         * ETADI (`next()`). "Shubhada o'chir" degan yo'l tanlansa,
         * server uzilgan paytda bot butun guruh yozishmasini
         * qirib tashlashi mumkin edi.
         */
        console.error(`[guard] ${chatId} sozlama olinmadi: ${result.error}`);
        return next();
      }

      config = result.data;
      configCache.set(chatId, { config, at: Date.now() });
    }

    // ⚠️ QALQON O'CHIQ — HECH NARSA QILINMAYDI. Standart holat
    // aynan shu: ma'muriyat uni ATAYLAB yoqadi.
    if (!config.guardEnabled) return next();

    /**
     * ── TASHQI QORA RO'YXAT ─────────────────────────────
     *
     * ⚠️ `await` QILINMAYDI: guruh xabari qalqondan TEZ o'tishi
     * kerak va ro'yxat yangilanishini kutib turish har soatda bitta
     * xabarni sekinlashtirardi. Yangilanish fon'da ketadi, shu
     * xabar esa ESKI ro'yxat bilan tekshiriladi — to'g'ri murosa.
     *
     * ⚠️ QALQON YOQILGAN GURUH BO'LGANDA CHAQIRILADI: bot
     * qalqonsiz guruhlarda ham ishlaydi va ro'yxat u yerda umuman
     * kerak emas.
     */
    refreshBlocklist();

    const rules = { ...config, feedHosts: feedHosts() };

    // ── TEKSHIRUV ───────────────────────────────────────────────
    const message = ctx.message;
    const text = (message.text ?? message.caption ?? "").trim();

    let verdict: ThreatVerdict | null = null;

    /**
     * ⚠️ FAYL BIRINCHI: apk — eng jiddiy tahdid va u ko'pincha
     * izoh (caption) bilan birga keladi. Matn birinchi
     * tekshirilsa, yozuvda "shubhali havola" deb qolib, apk
     * haqidagi ma'lumot (nomi, hajmi) YO'QOLARDI.
     */
    const document = message.document;
    if (document) {
      verdict = inspectFile(
        { fileName: document.file_name, mime: document.mime_type },
        rules,
      );
    }

    /**
     * ⚠️ VIDEO/AUDIO EMAS, FAQAT `document`: Telegram `.apk` ni
     * har doim hujjat sifatida yuboradi. Rasm va videoni
     * tekshirish noto'g'ri ishga tushishlarni ko'paytirardi.
     */

    /**
     * ── YASHIRIN HAVOLA (ENTITY) ─────────────────────────────────
     *
     * ⚠️ TELEGRAM HAVOLANI MATNDAN AJRATIB SAQLAYDI. Firibgar
     * matnga `gov.uz/vplt` deb yozib, HAQIQIY manzilni
     * gipermurojaat ichiga yashiradi (`text_link` entity):
     *
     *     ko'rinadi  →  gov.uz/vplt
     *     ochiladi   →  https://uzbekistan.uzbekistonviplata.xyz/
     *
     * Matnning O'ZIDA bu manzil UMUMAN YO'Q, ya'ni faqat matnni
     * tekshirish firibgarning asosiy quroliga ko'r bo'lardi —
     * HAQIQIY xabar aynan shu yo'l bilan o'tib ketdi.
     *
     * ⚠️ MATN BILAN BIRGA, O'RNIGA EMAS: matnda ochiq havola ham
     * bo'lishi mumkin.
     */
    /**
     * ⚠️ IKKALASI HAM BIRLASHTIRILADI: matnli xabarda `entities`,
     * rasm/video izohida esa `caption_entities` to'ladi. Faqat
     * bittasini o'qish skrinshotdagi kabi RASMLI xabarni
     * o'tkazib yuborardi.
     */
    const entities = [
      ...(message.entities ?? []),
      ...(message.caption_entities ?? []),
    ];

    /**
     * ⚠️ IKKI RO'YXAT ALOHIDA, BIR QOPDA EMAS — VA BU TUZATILGAN
     * XATO:
     *
     *   `text_link` → manzil matnda KO'RINMAYDI (aldovning quroli)
     *   `url`       → manzil matnning O'ZIDA turadi (halol havola)
     *
     * Avval ikkalasi birlashtirilib, matnga QO'SHIB uzatilardi va
     * o'shanda "yashirilgan manzil" qoidasi matnga qo'shilgan
     * manzilni "odam ko'rgan nom" deb o'qib qolardi. Natijada IIV
     * ning firibgarlikka qarshi RASMIY ogohlantirishi — oxirida
     * "Website | Telegram | Facebook …" qatori bor, ya'ni `gov.uz`
     * ga ham, `t.me` ga ham havola qiladi — "ko'rinishda gov.uz,
     * amalda t.me" deb o'chirishga urinilgan.
     *
     * Ya'ni qoida aldovni emas, HAVOLALAR SONINI o'qiyotgan edi.
     */
    const hiddenUrls = entities
      .filter((entity) => entity.type === "text_link")
      .map((entity) => (entity as { url: string }).url)
      .filter((url): url is string => Boolean(url));

    const visibleUrls = entities
      .filter((entity) => entity.type === "url")
      .map((entity) => text.slice(entity.offset, entity.offset + entity.length))
      .filter((url) => Boolean(url));

    const entityUrls = [...visibleUrls, ...hiddenUrls];

    if (!verdict && entityUrls.length > 0) {
      for (const url of entityUrls) {
        verdict = inspectUrl(url, rules);
        if (verdict) break;
      }
    }

    if (!verdict && text) {
      /**
       * ⚠️ YASHIRIN HAVOLALAR BARIBIR UZATILADI: "ikki dalil"
       * qoidasi uchun ular ham HAVOLA sifatida hisoblanishi kerak —
       * aks holda "ibora bor, lekin matnda havola yo'q" deb xabar
       * o'tkazib yuborilardi. Faqat endi ular MATNGA
       * ARALASHTIRILMAYDI.
       */
      verdict = inspectText(text, rules, {
        hidden: hiddenUrls,
        visible: visibleUrls,
      });
    }

    // Toza xabar — kuzatuvga o'tadi.
    if (!verdict) return next();

    // ── O'CHIRISH ───────────────────────────────────────────────
    //
    // ⚠️ AVVAL O'CHIRILADI, KEYIN YOZILADI: serverga xabar berish
    // sekin bo'lishi mumkin va o'sha vaqt ichida kimdir apk'ni
    // yuklab olardi. Jurnal — ikkinchi darajali.
    let action: "deleted" | "delete_failed" = "deleted";
    let errorMessage: string | undefined;
    /** Botda o'chirish huquqi bormi — panel shu bo'yicha ogohlantiradi. */
    let botCanDelete: boolean | undefined;

    try {
      await ctx.api.deleteMessage(chat.id, message.message_id);

      // ⚠️ MUVAFFAQIYAT HAM DALIL: huquq bor ekan va panel eski
      // ogohlantirishni o'chirishi kerak.
      botCanDelete = true;
    } catch (error) {
      /**
       * ⚠️ XATO YUTILMAYDI, QAYD ETILADI: bot admin bo'lmasa
       * Telegram o'chirishga ruxsat bermaydi va bu holat
       * PANELDA ko'rinishi kerak — aks holda ma'muriyat "himoya
       * ishlayapti" deb o'ylab, zararli fayl guruhda qolib
       * ketardi.
       *
       * ⚠️ XOM MATN YETARLI EMAS. Telegram "message can't be
       * deleted" deb yozadi va bu SABABNI aytmaydi — panelda
       * aynan shu satr turardi. Endi bot huquqini o'qib, nima
       * qilish kerakligini yozadi (`delete-failure.ts`).
       */
      action = "delete_failed";

      const failure = await diagnoseDeleteFailure(ctx, chat.id, error);
      errorMessage = failure.message;
      botCanDelete = failure.canDelete;

      console.error(
        `[guard] ${chatId} o'chirilmadi: ${(error as Error).message} → ${errorMessage}`,
      );
    }

    const sender = ctx.from;
    const senderName =
      [sender?.first_name, sender?.last_name].filter(Boolean).join(" ") || undefined;

    const reported = await reportThreat({
      chatId,
      messageId: String(message.message_id),
      kind: verdict.kind,
      action,
      senderTgId: sender?.id ? String(sender.id) : undefined,
      senderName,
      senderUsername: sender?.username,
      fileName: document?.file_name,
      fileMime: document?.mime_type,
      fileSize: document?.file_size,
      fileUniqueId: document?.file_unique_id,
      url: verdict.url,
      urlHost: verdict.urlHost,
      reason: verdict.reason,
      // ⚠️ MATN SAQLANADI: xabar o'chirilgach ma'muriyat nima
      // yozilganini boshqa KO'RA OLMAYDI.
      messageText: text.slice(0, MAX_EVIDENCE) || undefined,
      errorMessage,
      botCanDelete,
      sentAt: message.date,
    });

    if (!reported.ok) {
      console.error(`[guard] ${chatId} jurnalga yozilmadi: ${reported.error}`);
    }

    /**
     * ⚠️ `next()` CHAQIRILMAYDI: zararli xabar kuzatuv navbatiga
     * TUSHMASLIGI kerak. Tushsa, firibgarning matni AI tahlilidan
     * o'tib, panelda signal (keyin esa rasmiy murojaat) bo'lib
     * paydo bo'lardi.
     */
  });
};
