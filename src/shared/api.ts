/**
 * SERVER BILAN ALOQA — botning YAGONA ma'lumot manbasi.
 *
 * ── BOTDA PRISMA YO'Q va bo'lmaydi ────────────────────────────────────
 *
 * ⚠️ Bot bazaga TO'G'RIDAN-TO'G'RI ULANMAYDI. Bu eng muhim qaror va
 * uning sababi uchta:
 *
 *   1. QOIDA IKKI JOYDA TAKRORLANMASLIGI KERAK. "Guruh rasmiymi",
 *      "kategoriya faolmi", "bu telegram kimga bog'langan" — bularning
 *      har biri biznes qoidasi va u SERVERDA yashaydi. Botda nusxasi
 *      bo'lsa, ikkisi albatta ajralib ketadi.
 *
 *   2. SCHEMA O'ZGARISHI BOTNI SINDIRMASLIGI KERAK. Prisma schema'si
 *      ikki repoda nusxalanganda (study-tracker'da shunday edi), server
 *      migratsiyasidan keyin botni ham yangilash KERAK bo'lib qoladi —
 *      va u esdan chiqadi, keyin bot jim ishlamay turadi.
 *
 *   3. ULANISH POOL'I. Har bot nusxasi bazaga o'z pool'ini ochadi va
 *      `max_connections` ni yeydi. HTTP esa stateless.
 *
 * ── XATO SIYOSATI ────────────────────────────────────────────────────
 *
 * ⚠️ XATO OTILMAYDI, `null` yoki `{ ok: false }` QAYTARILADI. Telegram
 * handler ichida otilgan xato grammY tomonidan ushlanadi-u,
 * foydalanuvchi HECH NARSA ko'rmaydi: u xabar yozib, javob kutib
 * qoladi. Shuning uchun har chaqiruv natijasini TEKSHIRIB,
 * foydalanuvchiga tushunarli matn aytamiz.
 */

import { config } from "../config/env";

/** Server qaytaradigan xato shakli (`AllExceptionsFilter`). */
interface ApiError {
  statusCode: number;
  message: string;
  errors?: Record<string, string[]>;
}

export interface ApiResult<T> {
  ok: boolean;
  data?: T;
  /** Foydalanuvchiga ko'rsatiladigan matn. */
  error?: string;
  status?: number;
}

/**
 * Bitta so'rov.
 *
 * ⚠️ `AbortSignal.timeout` ISHLATILADI: timeout bo'lmasa, server
 * javob bermasa (yiqilgan, tarmoq uzilgan) `fetch` CHEKSIZ kutardi
 * va foydalanuvchi "yuborilmoqda..." da qolib ketardi. 15 sekund
 * yetarli — Telegram ham so'rovni cheksiz kutmaydi.
 */
async function request<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<ApiResult<T>> {
  const url = `${config.apiUrl}${path}`;

  try {
    const response = await fetch(url, {
      method: options.method ?? "GET",
      headers: {
        "Content-Type": "application/json",
        // ⚠️ BOTDA JWT YO'Q: u foydalanuvchi emas, ishonchli XIZMAT.
        // Server bu kalitni doimiy vaqtli taqqoslash bilan
        // tekshiradi (`jwt-auth.guard.ts#checkBotKey`).
        "X-Bot-Key": config.botApiKey,
      },
      body: options.body === undefined ? undefined : JSON.stringify(options.body),
      signal: AbortSignal.timeout(config.apiTimeoutMs),
    });

    // 204 va bo'sh tanali javoblar.
    const text = await response.text();
    const payload = text ? (JSON.parse(text) as T | ApiError) : null;

    if (!response.ok) {
      const error = payload as ApiError | null;
      return {
        ok: false,
        status: response.status,
        // ⚠️ SERVER MATNI ISHLATILADI: u o'zbek tilida va
        // foydalanuvchiga mo'ljallangan ("Kategoriya faol emas").
        // Botda ikkinchi marta tarjima qilish ikki joyda matn
        // saqlashga olib kelardi.
        error: error?.message || `Server xatosi (${response.status})`,
      };
    }

    return { ok: true, data: payload as T, status: response.status };
  } catch (error) {
    const isTimeout = (error as Error).name === "TimeoutError";

    console.error(`[api] ${options.method ?? "GET"} ${path}:`, (error as Error).message);

    return {
      ok: false,
      error: isTimeout
        ? "Server javob bermadi. Keyinroq qayta urinib ko'ring."
        : "Server bilan aloqa yo'q. Keyinroq qayta urinib ko'ring.",
    };
  }
}

// ═══════════════════════════════════════════════════════════════════
//  GURUHLAR
// ═══════════════════════════════════════════════════════════════════

export interface MembershipPayload {
  chatId: string;
  type: string;
  title?: string;
  username?: string;
  status: string;
  canPostMessages?: boolean;
  canInviteUsers?: boolean;
  addedByTgId?: string;
}

export const recordMembership = (payload: MembershipPayload) =>
  request<{ chatId: string; status: string }>("/bot/groups/membership", {
    method: "POST",
    body: payload,
  });

/**
 * Guruhdan xabar keldi — reyestrni yangilaydi.
 *
 * ⚠️ JAVOBDA `isOfficial` BOR va bot shundan "xabarni yuborishim
 * kerakmi" deb biladi. Alohida so'rov qilinmaydi: har guruh xabarida
 * ikkita HTTP so'rov guruh faolligiga ko'paytirilib, serverga
 * keraksiz yuk berardi.
 */
export const touchGroup = (payload: {
  chatId: string;
  type: string;
  title?: string;
  username?: string;
}) =>
  request<{ chatId: string; isOfficial?: boolean; skipped?: boolean }>(
    "/bot/groups/touch",
    { method: "POST", body: payload },
  );

export const captureMessage = (payload: {
  chatId: string;
  messageId: string;
  senderTgId?: string;
  senderName?: string;
  text: string;
  replyToText?: string;
  sentAt?: number;
}) => request<{ id?: string; queued?: boolean }>("/bot/groups/messages", {
  method: "POST",
  body: payload,
});

// ═══════════════════════════════════════════════════════════════════
//  MUAMMOLAR
// ═══════════════════════════════════════════════════════════════════

export interface LinkStatus {
  linked: boolean;
  firstName?: string;
  lastName?: string;
  districtName?: string | null;
}

export const checkLink = (telegramId: string) =>
  request<LinkStatus>("/bot/issues/link-check", {
    method: "POST",
    body: { telegramId },
  });

export interface Category {
  id: string;
  name: string;
  color: string | null;
}

export const getCategories = () =>
  request<Category[]>("/bot/issues/categories");

export const submitIssue = (payload: {
  telegramId: string;
  chatId: string;
  categoryId: string;
  body: string;
}) => request<{ publicNo: string; id: string }>("/bot/issues", {
  method: "POST",
  body: payload,
});
