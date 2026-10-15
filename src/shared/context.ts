/**
 * BOT KONTEKSTI VA SESSIYA.
 *
 * ── SESSIYA XOTIRADA ─────────────────────────────────────────────────
 *
 * ⚠️ XOTIRADA SAQLANADI va bu ATAYLAB. Sessiyada faqat "muammo
 * yuborish" oqimining YARIM YO'LI turadi (kategoriya tanlandi, matn
 * hali yozilmagan) va u bir necha daqiqa yashaydi. Bot qayta ishga
 * tushsa, odam tugmani qaytadan bosadi — bu yo'qotish emas.
 *
 * Bazaga yozilsa: har xabarda ikkita qo'shimcha so'rov (o'qish +
 * yozish) va botda baza ulanishi paydo bo'lardi — `api.ts` dagi
 * "botda Prisma yo'q" qaroriga qarshi.
 *
 * ⚠️ `userId` BO'YICHA, chat bo'yicha EMAS: oqim shaxsiy chatda
 * boshlanadi va u yerda ikkisi bir xil, lekin kalit sifatida odam
 * aniqroq.
 */

import type { Context, SessionFlavor } from "grammy";

/** Muammo yuborish oqimining holati. */
export interface IssueDraft {
  categoryId: string;
  categoryName: string;
  /** Oqim boshlangan vaqt — eskirgan holatni tashlash uchun. */
  startedAt: number;
}

export interface SessionData {
  /**
   * ⚠️ FAQAT BITTA OQIM: odam bir vaqtda ikki muammo yoza olmaydi.
   * Yangi oqim boshlanganda eskisi tashlanadi.
   */
  issueDraft?: IssueDraft;
}

export type BotContext = Context & SessionFlavor<SessionData>;

export const initialSession = (): SessionData => ({});

/**
 * Oqim qancha vaqtdan keyin eskirgan deb hisoblanadi.
 *
 * ⚠️ MUDDAT KERAK: odam kategoriya tanlab, botni tashlab ketishi
 * mumkin. Bir hafta o'tib kelib biror narsa yozsa, u "muammo matni"
 * bo'lib ketardi — holat esa allaqachon ma'nosiz edi.
 */
export const DRAFT_TTL_MS = 30 * 60 * 1000;

/** Oqim hali tirikmi. */
export const isDraftAlive = (draft: IssueDraft | undefined): draft is IssueDraft =>
  draft !== undefined && Date.now() - draft.startedAt < DRAFT_TTL_MS;
