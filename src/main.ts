/**
 * BOT ISHGA TUSHISHI.
 *
 * ── HANDLER TARTIBI MUHIM ─────────────────────────────────────────────
 *
 *   1. xavfsizlik qalqoni — zararli xabar BU YERDA to'xtaydi
 *   2. guruh kuzatuvi     — guruh/kanal xabarlari bu yerda TUGAYDI
 *   3. buyruqlar          — /start, /help (faqat shaxsiy chat)
 *   4. bekor qilish       — HAR QANDAY oqimni to'xtatadi
 *   5. murojaatlarim      — ro'yxat (oqimsiz, bitta tugma)
 *   6. profil             — hudud/telefon oqimi
 *   7. murojaat oqimi     — matn → yo'nalish → surat → joy → tasdiq
 *   8. tanilmagan xabar   — "tushunilmadi"
 *
 * ⚠️ QALQON ENG BIRINCHI: zararli havolali xabar avval navbatga
 * tushib, keyin o'chirilsa — matn baribir AI'ga borardi va signal
 * sifatida panelda paydo bo'lardi. Ya'ni firibgarning matni rasmiy
 * murojaatga aylanib ketishi mumkin edi.
 *
 * ⚠️ GURUH KUZATUVI IKKINCHI: u guruh xabarlarini O'ZIDA to'xtatadi
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
import { registerGuard } from "./features/guard/handler";
import { registerAppeal } from "./features/appeal/handler";
import { registerCancel } from "./features/cancel/handler";
import { registerMyAppeals } from "./features/my-appeals/handler";
import { registerProfile } from "./features/profile/handler";
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

// 1. Xavfsizlik qalqoni — zararli xabar BU YERDA to'xtaydi.
//
// ⚠️ KUZATUVDAN OLDIN: aks holda zararli matn navbatga tushib,
// AI tahlilidan o'tib, panelda signal bo'lib paydo bo'lardi.
registerGuard(bot);

// 2. Guruh kuzatuvi — guruh xabarlari BU YERDA tugaydi.
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

// 3. Buyruqlar.
registerStart(privateChat);

// 4. Bekor qilish.
//
// ⚠️ BEKOR QILISH OQIMLARDAN OLDIN: u HAR QANDAY oqimni to'xtatadi
// va oqim handler'laridan keyin qo'yilsa, profil oqimi uni "tuman
// nomi" deb tekshirib, tugma jim ishlamay qolardi
// (`cancel/handler.ts` izohi).
registerCancel(privateChat);

// 5. Murojaatlarim — oqimsiz, faqat bitta tugma.
registerMyAppeals(privateChat);

// 6. Profil — hudud va telefon oqimi.
//
// ⚠️ MUROJAAT OQIMIDAN OLDIN: ikkisi ham `message:text` ni tinglaydi
// va profil oqimi FAOL bo'lganda yozilgan matn (tuman nomi) murojaat
// matni bo'lib ketmasligi kerak. Profil handler'i o'z holati
// bo'lmasa `next()` chaqiradi — ya'ni murojaat oqimiga yo'l ochiq
// qoladi.
registerProfile(privateChat);

// 7. Murojaat oqimi — asosiy imkoniyat.
registerAppeal(privateChat);

// 8. Tanilmagan xabar — oxirgi handler.
//
// ⚠️ OXIRIDA TURADI: yuqoridagilar `next()` chaqirganda bu yerga
// keladi. Yuqoriga qo'yilsa, har xabarga "tushunilmadi" deb javob
// berib, qolgan handler'larga navbat tegmasdi.
// ⚠️ OQIM FAOL BO'LSA HOLAT TOZALANADI. Bu yerga yetib kelgan xabar
// faol oqimning HECH BIR qadamiga to'g'ri kelmadi (masalan, profil
// oqimida ro'yxatda yo'q tuman nomi yozildi). O'shanda asosiy menyu
// ko'rsatilib, holat sessiyada QOLDIRILSA, fuqaro menyuni ko'rib
// turib, yozgan har matni yana o'sha oqimga tushardi — chiqib
// bo'lmaydigan holat.
privateChat.on("message", async (ctx) => {
  delete ctx.session.appeal;
  delete ctx.session.profile;

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

  // ── MINI APP MENYU TUGMASI ──────────────────────────────────────
  //
  // ⚠️ FAQAT `MOBILE_APP_URL` BO'LGANDA: usiz tugma QO'YILMAYDI va bot
  // baribir ishlaydi. BotFather KERAK EMAS — bu oddiy Bot API chaqiruvi.
  //
  // ⚠️ `web_app` manzili HTTPS bo'lishi SHART (Telegram talabi). Dev'da
  // `node tools/mini-app-tunnel.mjs` buni to'rtta joyga yozadi.
  if (config.mobileAppUrl) {
    try {
      await bot.api.setChatMenuButton({
        menu_button: {
          type: "web_app",
          text: "Murojaat yuborish",
          web_app: { url: config.mobileAppUrl },
        },
      });
      console.log(`Mini App menyu tugmasi: ${config.mobileAppUrl}`);
    } catch (error) {
      // ⚠️ YIQILMAYDI: menyu tugmasi qo'shimcha — guruh kuzatuvi va
      // qalqon undan mustaqil ishlaydi.
      console.warn(`Menyu tugmasi o'rnatilmadi: ${(error as Error).message}`);
    }
  }

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
