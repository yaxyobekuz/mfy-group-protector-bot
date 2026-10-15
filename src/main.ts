/**
 * BOT ISHGA TUSHISHI.
 *
 * ── HANDLER TARTIBI MUHIM ─────────────────────────────────────────────
 *
 *   1. guruh kuzatuvi   — guruh/kanal xabarlari bu yerda TUGAYDI
 *   2. buyruqlar        — /start, /help (faqat shaxsiy chat)
 *   3. muammo oqimi     — kategoriya + matn
 *   4. tanilmagan matn  — "tushunilmadi"
 *
 * ⚠️ GURUH KUZATUVI BIRINCHI: u guruh xabarlarini O'ZIDA to'xtatadi
 * va keyingi handler'larga o'tkazmaydi. Aks holda guruhdagi "📨
 * Muammo yuborish" degan tasodifiy xabar oqimni GURUHDA ochib
 * yuborardi — bot esa u yerda hech narsa yozmasligi kerak.
 */

import { Bot, Composer, GrammyError, HttpError, session } from "grammy";

import { config } from "./config/env";
import { initialSession, type BotContext, type SessionData } from "./shared/context";
import { TEXTS } from "./shared/texts";
import { mainMenu } from "./shared/keyboards";
import { registerGroupWatch } from "./features/group-watch/handler";
import { registerIssueSubmit } from "./features/issue-submit/handler";
import { registerStart } from "./features/start/handler";

const bot = new Bot<BotContext>(config.botToken);

// ═══════════════════════════════════════════════════════════════════
//  SESSIYA
// ═══════════════════════════════════════════════════════════════════

bot.use(
  session<SessionData, BotContext>({
    initial: initialSession,
    // ⚠️ KALIT `from.id` BO'YICHA, `chat.id` bo'yicha EMAS: oqim
    // shaxsiy chatda kechadi va u yerda ikkisi bir xil, lekin odam
    // kaliti aniqroq va guruhda tasodifan holat yaratilmaydi.
    getSessionKey: (ctx) => (ctx.from ? String(ctx.from.id) : undefined),
  }),
);

// ═══════════════════════════════════════════════════════════════════
//  HANDLER'LAR
// ═══════════════════════════════════════════════════════════════════

// 1. Guruh kuzatuvi — guruh xabarlari BU YERDA tugaydi.
registerGroupWatch(bot);

// ⚠️ QOLGAN HAMMASI FAQAT SHAXSIY CHATDA.
//
// Filtr `Composer` bilan quriladi, `bot.chatType("private")` bilan
// EMAS: ikkinchisi kontekst TURINI toraytiradi
// (`ChatType<"private">`) va o'shanda `registerStart(...)` kabi
// `Composer<BotContext>` qabul qiladigan funksiyalar unga to'g'ri
// kelmaydi. Filtr esa `BotContext` ni saqlab qoladi.
//
// ⚠️ FILTR KERAK: usiz guruhda `/start` bosilganda bot javob yozib,
// "guruhda kuzatuvchi" qoidasini buzardi.
const privateChat = new Composer<BotContext>();

bot.use((ctx, next) => {
  if (ctx.chat?.type !== "private") return next();
  return privateChat.middleware()(ctx, next);
});

// 2. Buyruqlar.
registerStart(privateChat);

// 3. Muammo oqimi.
registerIssueSubmit(privateChat);

// 4. Tanilmagan matn — oxirgi handler.
//
// ⚠️ OXIRIDA TURADI: yuqoridagilar `next()` chaqirganda bu yerga
// keladi. Yuqoriga qo'yilsa, har xabarga "tushunilmadi" deb javob
// berib, qolgan handler'larga navbat tegmasdi.
privateChat.on("message", async (ctx) => {
  await ctx.reply(TEXTS.UNKNOWN, { reply_markup: mainMenu() });
});

// ═══════════════════════════════════════════════════════════════════
//  XATO USHLASH
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ GLOBAL CATCHER MAJBURIY. Usiz handler ichidagi ushlanmagan xato
 * `unhandledRejection` ga aylanib, Node jarayonini yiqitardi — va
 * bot butunlay to'xtab qolardi (bitta foydalanuvchining xabari
 * tufayli).
 */
bot.catch((err) => {
  const ctx = err.ctx;
  const where = `update ${ctx.update.update_id}`;

  if (err.error instanceof GrammyError) {
    // Telegram API rad etdi (400/403: bloklangan, chat topilmadi).
    console.error(`[bot] ${where} — Telegram xatosi:`, err.error.description);
    return;
  }

  if (err.error instanceof HttpError) {
    // Telegram'ga yetib bo'lmadi — tarmoq. grammY o'zi qayta
    // uriniadi, shuning uchun bu yerda faqat log.
    console.error(`[bot] ${where} — tarmoq xatosi:`, err.error.message);
    return;
  }

  console.error(`[bot] ${where} — kutilmagan xato:`, err.error);
});

// ═══════════════════════════════════════════════════════════════════
//  ISHGA TUSHIRISH
// ═══════════════════════════════════════════════════════════════════

const start = async (): Promise<void> => {
  // ⚠️ BUYRUQLAR RO'YXATI FAQAT SHAXSIY CHAT UCHUN o'rnatiladi
  // (`scope: all_private_chats`). `default` bilan o'rnatilsa,
  // guruhdagi menyuda ham ko'rinib, odamlar bosib javob kutib
  // qolardi — bot esa guruhda jim turadi.
  await bot.api.setMyCommands(
    [
      { command: "start", description: "Boshlash" },
      { command: "help", description: "Yordam" },
    ],
    { scope: { type: "all_private_chats" } },
  );

  await bot.start({
    // ⚠️ `my_chat_member` SO'RALISHI SHART: u standart
    // `allowed_updates` ro'yxatida YO'Q va so'ralmasa guruh
    // reyestrining ASOSIY manbasi ishlamay qolardi — guruhlar
    // faqat tasodifiy xabar orqali ro'yxatga tushardi.
    allowed_updates: ["message", "my_chat_member"],
    onStart: (info) => {
      console.log(`Bot ishga tushdi: @${info.username}`);
      console.log(`Server: ${config.apiUrl}`);
      console.log(`Muhit: ${config.nodeEnv}`);
    },
  });
};

// ⚠️ `SIGINT`/`SIGTERM` USHLANADI: `bot.stop()` navbatdagi
// so'rovlarni tugatib, `getUpdates` ni to'g'ri yopadi. Usiz Telegram
// bir muddat "bu bot hali ulangan" deb hisoblab, qayta ishga
// tushganda `409 Conflict` berardi.
process.once("SIGINT", () => void bot.stop());
process.once("SIGTERM", () => void bot.stop());

void start();
