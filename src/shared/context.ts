/**
 * BOT KONTEKSTI VA SESSIYA.
 *
 * ── SESSIYA XOTIRADA ─────────────────────────────────────────────────
 *
 * ⚠️ XOTIRADA SAQLANADI va bu ATAYLAB. Sessiyada faqat murojaat
 * oqimining YARIM YO'LI turadi (matn yozildi, surat hali yuborilmadi)
 * va u bir necha daqiqa yashaydi. Bot qayta ishga tushsa, fuqaro
 * oqimni qaytadan boshlaydi — bu yo'qotish emas.
 *
 * Bazaga yozilsa: har xabarda ikkita qo'shimcha so'rov (o'qish +
 * yozish) va botda baza ulanishi paydo bo'lardi — `api.ts` dagi
 * "botda Prisma yo'q" qaroriga qarshi.
 *
 * ⚠️ SESSIYADA `citizenId` SAQLANMAYDI. Fuqaro har so'rovda
 * `telegramId` bo'yicha SERVERDA topiladi: id botda turganda, bot
 * qayta ishga tushganda oqim uzilardi — va eng muhimi, bot aytgan
 * id ga ishonish begona fuqaro nomidan yozish yo'li bo'lardi
 * (`bot-citizens.controller.ts` izohi).
 *
 * ⚠️ `userId` BO'YICHA, chat bo'yicha EMAS: oqim shaxsiy chatda
 * kechadi va u yerda ikkisi bir xil, lekin kalit sifatida odam
 * aniqroq.
 */

import type { Context, SessionFlavor } from "grammy";

/** Oqim qaysi bosqichda turibdi. */
export type AppealStep =
  | "body"
  | "category"
  | "media"
  | "location"
  | "flags"
  | "review";

/**
 * MUROJAAT QORALAMASI.
 *
 * ⚠️ FAYLLAR IMZOLANGAN TOKEN sifatida saqlanadi, yo'l sifatida
 * EMAS: serverga mijoz aytgan yo'l yuborilsa, u boshqa faylni
 * ko'rsatishi mumkin edi. Token — serverning O'Z imzosi.
 */
export interface AppealDraft {
  step: AppealStep;

  body?: string;

  categoryId?: string;
  categoryName?: string;
  categoryOrg?: string | null;
  categorySla?: number;

  /** AI taklifi imzosi — `sourceMeta.ai` ga yoziladi. */
  analysisToken?: string;

  /** Yuklangan fayllarning imzolangan havolalari. */
  attachments: string[];

  lat?: number;
  lng?: number;
  address?: string;

  isHazard?: boolean;
  isLongStanding?: boolean;
  isRepeatAppeal?: boolean;

  /** Oqim boshlangan vaqt — eskirgan holatni tashlash uchun. */
  startedAt: number;
}

/** Profil tahrirlash oqimi. */
export interface ProfileDraft {
  step: "district" | "mahalla" | "phone";
  /** Tuman tanlangach MFY ro'yxatini filtrlash uchun. */
  districtId?: string;
  districtName?: string;
  startedAt: number;
}

export interface SessionData {
  /**
   * ⚠️ FAQAT BITTA OQIM: fuqaro bir vaqtda ikki murojaat yozmaydi.
   * Yangi oqim boshlanganda eskisi tashlanadi.
   */
  appeal?: AppealDraft;
  profile?: ProfileDraft;

  /**
   * MEDIA GURUHI (albom) BELGISI.
   *
   * ⚠️ TELEGRAM ALBOMNI BITTA XABAR SIFATIDA YUBORMAYDI: har surat
   * ALOHIDA `message` bo'lib keladi, faqat `media_group_id` ularni
   * bog'laydi. Shuning uchun har suratga alohida "qabul qilindi"
   * yozilsa, 10 suratli albom 10 ta xabar chiqarardi. Bu yerda
   * oxirgi guruh id'si eslab qolinadi va takroriy javob
   * YOZILMAYDI.
   */
  lastMediaGroupId?: string;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const initialSession = (): SessionData => ({ });

/**
 * Oqim qancha vaqtdan keyin eskirgan deb hisoblanadi.
 *
 * ⚠️ MUDDAT KERAK: fuqaro matn yozib, botni tashlab ketishi mumkin.
 * Bir hafta o'tib kelib biror narsa yozsa, u yarim qolgan oqimning
 * keyingi qadami bo'lib ketardi — holat esa allaqachon ma'nosiz
 * edi.
 *
 * ⚠️ MINI-ILOVADAGIDAN UZUNROQ (60 daqiqa): botda oqim ko'p
 * qadamli va fuqaro surat olish uchun ko'chaga chiqib kelishi
 * mumkin.
 */
export const DRAFT_TTL_MS = 60 * 60 * 1000;

/** Oqim hali tirikmi. */
export const isAlive = <T extends { startedAt: number }>(
  draft: T | undefined,
): draft is T => draft !== undefined && Date.now() - draft.startedAt < DRAFT_TTL_MS;

/** Botga yozgan odamning Telegram profili — har so'rovda yuboriladi. */
export const identityOf = (ctx: BotContext) => ({
  telegramId: String(ctx.from!.id),
  firstName: ctx.from!.first_name,
  lastName: ctx.from!.last_name,
  username: ctx.from!.username,
  languageCode: ctx.from!.language_code,
});
