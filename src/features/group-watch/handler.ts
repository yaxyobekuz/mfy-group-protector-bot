/**
 * GURUH KUZATUVI — botning asosiy vazifasi.
 *
 * ── BOT GURUHDA KUZATUVCHI ────────────────────────────────────────────
 *
 * ⚠️ BOT GURUHDA HECH NARSA YOZMAYDI: javob bermaydi, reaksiya
 * qo'ymaydi, buyruqlarga javob qaytarmaydi. Guruhdagilar botning
 * o'qiyotganini sezmaydi ham. Xabar shunchaki serverga uzatiladi,
 * xulosani esa SERVER chiqaradi (AI, har 30 daqiqada).
 *
 * Sabab: bot yozgan har xabar o'zi ham guruh yozishmasiga tushadi va
 * keyingi tahlilda "guruhda muammo bor" degan signalga aylanib
 * ketardi — o'z aksini muammo deb topish.
 *
 * ── RO'YXAT QANDAY TO'PLANADI ─────────────────────────────────────────
 *
 * ⚠️ Telegram Bot API'da "men qaysi guruhlarda a'zoman" degan savolga
 * javob beradigan metod YO'Q (`getChats` faqat MTProto'da, ya'ni ODAM
 * nomidan ulanishda). Bot faqat O'ZIGA kelgan hodisadan biladi:
 *
 *   my_chat_member   → botning holati o'zgardi (ASOSIY manba)
 *   guruhdagi xabar  → ZAXIRA (hodisa o'tkazib yuborilgan bo'lsa)
 *
 * ⚠️ O'TMISHGA QARAMAYDI: bot bu kod joylashtirilishidan OLDIN a'zo
 * bo'lgan guruh ro'yxatga O'ZI tushmaydi — Telegram o'tgan
 * hodisalarni qayta yubormaydi. Shu sababli zaxira yo'l bor:
 * aksariyat guruhda kunda xabar bo'ladi, ya'ni ro'yxat o'zi to'lib
 * boradi.
 */

import type { Composer } from "grammy";

import { captureMessage, recordMembership, touchGroup } from "../../shared/api";
import type { BotContext } from "../../shared/context";

/**
 * Kuzatiladigan chat turlari.
 *
 * ⚠️ `private` ATAYLAB YO'Q: shaxsiy chat — bu bog'lanish va
 * "muammo yuborish" oqimi, guruh emas. Uni bu yerga qo'shish har
 * foydalanuvchining shaxsiy yozishmasini navbatga yuborardi.
 */
const GROUP_TYPES = new Set(["group", "supergroup", "channel"]);

/**
 * RASMIY GURUHLAR KESHI — `chatId` → `{ isOfficial, at }`.
 *
 * ⚠️ KESH KERAK: faol guruhda daqiqada o'nlab xabar bo'lishi mumkin
 * va har biri uchun serverga "bu guruh rasmiymi" deb borish
 * so'rovlar sonini xabar soniga TENGLASHTIRARDI.
 *
 * ⚠️ MUDDATI QISQA (2 daqiqa): rasmiy belgi panelda istalgan payt
 * OLIB TASHLANISHI mumkin va o'shandan keyingi xabar yozilmasligi
 * kerak. Uzoq kesh "rozilik qaytarib olindi, lekin bot hali ham
 * o'qiyapti" degan holatni tug'dirardi — bu esa eng jiddiy xato.
 */
const OFFICIAL_CACHE_TTL_MS = 2 * 60 * 1000;
const officialCache = new Map<string, { isOfficial: boolean; at: number }>();

const readCache = (chatId: string): boolean | null => {
  const entry = officialCache.get(chatId);
  if (!entry) return null;

  if (Date.now() - entry.at > OFFICIAL_CACHE_TTL_MS) {
    officialCache.delete(chatId);
    return null;
  }

  return entry.isOfficial;
};

/**
 * Yuboriladigan matnning eng uzun uzunligi.
 *
 * ⚠️ CHEGARA BOTDA HAM BOR, serverda ham: guruhga uzun hujjat
 * tashlansa (4096 belgi), uni butunlay yuborish tarmoqni va
 * serverdagi validatsiyani keraksiz band qilardi. Server uni
 * baribir 2000 ga kesadi.
 */
const MAX_TEXT = 2000;

export const registerGroupWatch = (bot: Composer<BotContext>): void => {
  // ═════════════════════════════════════════════════════════════════
  //  1. BOTNING HOLATI O'ZGARDI — ro'yxatning asosiy manbasi
  // ═════════════════════════════════════════════════════════════════

  bot.on("my_chat_member", async (ctx) => {
    const chat = ctx.myChatMember.chat;
    if (!GROUP_TYPES.has(chat.type)) return;

    const member = ctx.myChatMember.new_chat_member;
    const chatId = String(chat.id);

    const result = await recordMembership({
      chatId,
      type: chat.type,
      // ⚠️ `title` kanal/guruhda bor, lekin TypeScript uni
      // ixtiyoriy deb biladi (`private` chatda yo'q) — shuning
      // uchun tekshiriladi.
      title: "title" in chat ? chat.title : undefined,
      username: "username" in chat ? chat.username : undefined,
      status: member.status,
      // ⚠️ HUQUQLAR FAQAT `administrator` DA MA'NOLI: oddiy
      // a'zoda Telegram bu maydonlarni bermaydi va `undefined` ni
      // `false` deb yuborish TO'G'RI — "huquqi bor" deb
      // ko'rsatib qo'ymaslik kerak.
      canPostMessages:
        member.status === "administrator" ? Boolean(member.can_post_messages) : false,
      canInviteUsers:
        member.status === "administrator" ? Boolean(member.can_invite_users) : false,
      addedByTgId: ctx.myChatMember.from?.id
        ? String(ctx.myChatMember.from.id)
        : undefined,
    });

    // ⚠️ KESH TOZALANADI: bot chiqarilgan yoki qayta qo'shilgan
    // bo'lsa, eski "rasmiy" qiymati bilan ishlashda davom etmasligi
    // kerak.
    officialCache.delete(chatId);

    if (!result.ok) {
      console.error(`[group-watch] ${chatId} reyestrga yozilmadi: ${result.error}`);
    }
  });

  // ═════════════════════════════════════════════════════════════════
  //  2. GURUHDAGI XABAR — kuzatuv
  // ═════════════════════════════════════════════════════════════════

  bot.on("message", async (ctx, next) => {
    const chat = ctx.chat;

    // Shaxsiy chat — boshqa oqim (`issue-submit`).
    if (!GROUP_TYPES.has(chat.type)) return next();

    const chatId = String(chat.id);

    // ⚠️ BOT YOZGAN XABAR TAHLIL QILINMAYDI: hisobot yoki boshqa
    // botning xabari "guruhda muammo bor" degan signalga aylanib
    // ketardi.
    if (ctx.from?.is_bot) return;

    // ⚠️ MATN BO'LMASA YOZILMAYDI. Stiker, rasm, ovozli xabar va
    // xizmat xabarlari (kirdi/chiqdi) tahlilga hech narsa
    // bermaydi, lekin navbatni va AI hisobini shishirardi. Rasm
    // IZOHI (`caption`) esa matn — u olinadi.
    const text = (ctx.message.text ?? ctx.message.caption ?? "").trim();

    // ── REYESTR ─────────────────────────────────────────────────
    //
    // ⚠️ MATN BO'LMASA HAM REYESTR YANGILANADI: guruhda faqat
    // rasm tashiladigan bo'lsa ham u ro'yxatda ko'rinishi kerak
    // — aks holda admin uni rasmiy qilib belgilay olmasdi.
    let isOfficial = readCache(chatId);

    if (isOfficial === null) {
      const touched = await touchGroup({
        chatId,
        type: chat.type,
        title: "title" in chat ? chat.title : undefined,
        username: "username" in chat ? chat.username : undefined,
      });

      if (!touched.ok) {
        // ⚠️ SERVER YO'Q — JIM O'TKAZILADI. Guruhga xato xabari
        // YOZILMAYDI: bot u yerda kuzatuvchi va texnik xatoni
        // aholiga ko'rsatish mumkin emas.
        console.error(`[group-watch] ${chatId} touch: ${touched.error}`);
        return;
      }

      isOfficial = Boolean(touched.data?.isOfficial);
      officialCache.set(chatId, { isOfficial, at: Date.now() });
    }

    // ── KUZATUV ─────────────────────────────────────────────────
    //
    // ⚠️ FAQAT RASMIY GURUHDAN. Reyestrda bot tasodifan qo'shilgan,
    // test va umuman begona guruhlar ham bor — ularning
    // yozishmasini o'qish mumkin emas. "Rasmiy" belgisi ma'muriyat
    // qo'lida va aynan shu KUZATUVGA ROZILIK ma'nosini bildiradi.
    if (!isOfficial || !text) return;

    const replyTo = ctx.message.reply_to_message;
    const replyToText = replyTo
      ? (replyTo.text ?? replyTo.caption ?? "").trim().slice(0, MAX_TEXT) || undefined
      : undefined;

    const sender = ctx.from;
    const senderName =
      [sender?.first_name, sender?.last_name].filter(Boolean).join(" ") ||
      sender?.username ||
      undefined;

    const captured = await captureMessage({
      chatId,
      messageId: String(ctx.message.message_id),
      senderTgId: sender?.id ? String(sender.id) : undefined,
      senderName,
      text: text.slice(0, MAX_TEXT),
      replyToText,
      // ⚠️ Telegram `date` — SONIYADA. Server uni
      // `new Date(sentAt * 1000)` bilan o'qiydi; millisekund deb
      // yuborilsa sana 1970-yilga tushib qolardi.
      sentAt: ctx.message.date,
    });

    if (!captured.ok) {
      console.error(`[group-watch] ${chatId} xabar yuborilmadi: ${captured.error}`);
    }
  });
};
