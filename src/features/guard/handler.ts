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
 */

import type { Composer } from "grammy";

import { getGuardConfig, reportThreat, type GuardConfig } from "../../shared/api";
import type { BotContext } from "../../shared/context";
import { inspectFile, inspectText, type ThreatVerdict } from "./detect";

const GROUP_TYPES = new Set(["group", "supergroup", "channel"]);

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
    if (!GROUP_TYPES.has(chat.type)) return next();

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
        config,
      );
    }

    /**
     * ⚠️ VIDEO/AUDIO EMAS, FAQAT `document`: Telegram `.apk` ni
     * har doim hujjat sifatida yuboradi. Rasm va videoni
     * tekshirish noto'g'ri ishga tushishlarni ko'paytirardi.
     */

    if (!verdict && text) {
      verdict = inspectText(text, config);
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

    try {
      await ctx.api.deleteMessage(chat.id, message.message_id);
    } catch (error) {
      /**
       * ⚠️ XATO YUTILMAYDI, QAYD ETILADI: bot admin bo'lmasa
       * Telegram o'chirishga ruxsat bermaydi va bu holat
       * PANELDA ko'rinishi kerak — aks holda ma'muriyat "himoya
       * ishlayapti" deb o'ylab, zararli fayl guruhda qolib
       * ketardi.
       */
      action = "delete_failed";
      errorMessage = (error as Error).message?.slice(0, 500);
      console.error(`[guard] ${chatId} o'chirilmadi: ${errorMessage}`);
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
