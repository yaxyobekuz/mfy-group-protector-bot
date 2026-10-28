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
//  XAVFSIZLIK QALQONI
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ QORA/OQ RO'YXAT SERVERDAN KELADI, botda saqlanmaydi: panelda
 * domen qo'shilganda botni qayta joylashtirish kerak bo'lmasligi
 * uchun. Botda Prisma yo'q, ya'ni u bazani o'zi o'qiy olmaydi.
 */
export interface GuardConfig {
  guardEnabled: boolean;
  deleteFiles: boolean;
  deleteUrls: boolean;
  blockedHosts: string[];
  allowedHosts: string[];
}

export const getGuardConfig = (chatId: string) =>
  request<GuardConfig>(`/bot/security/config/${encodeURIComponent(chatId)}`);

export interface ThreatPayload {
  chatId: string;
  messageId?: string;
  kind: string;
  action: "deleted" | "detected" | "delete_failed";
  senderTgId?: string;
  senderName?: string;
  senderUsername?: string;
  fileName?: string;
  fileMime?: string;
  fileSize?: number;
  fileUniqueId?: string;
  url?: string;
  urlHost?: string;
  reason: string;
  messageText?: string;
  errorMessage?: string;
  sentAt?: number;
}

export const reportThreat = (payload: ThreatPayload) =>
  request<{ id?: string; recorded?: boolean; skipped?: boolean }>(
    "/bot/security/events",
    { method: "POST", body: payload },
  );

// ═══════════════════════════════════════════════════════════════════
//  FUQARO — MUROJAAT OQIMI
// ═══════════════════════════════════════════════════════════════════

/**
 * ⚠️ BOT FUQARONI "BOG'LAMAYDI": `telegramId` har so'rovda yuboriladi
 * va server fuqaroni O'ZI topadi yoki yaratadi. Botda `citizenId`
 * saqlanmaydi — u sessiyada turganda, sessiya o'chganda (qayta ishga
 * tushish) oqim uzilib qolardi, va eng yomoni: bot aytgan id ga
 * ishonish `X-Bot-Key` tarqalganda begona murojaat yozish yo'li
 * bo'lardi.
 *
 * ⚠️ PROFIL HAM YUBORILADI: ism/username Telegram'da o'zgargan
 * bo'lishi mumkin va panelda eski nom turib qolmasligi kerak.
 */
export interface CitizenIdentity {
  telegramId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  languageCode?: string;
}

export interface CitizenProfile {
  id: string;
  firstName: string;
  lastName: string | null;
  phone: string | null;
  districtId: string | null;
  districtName: string | null;
  mahallaId: string | null;
  mahallaName: string | null;
  points: number;
  stats: { total: number; open: number; resolved: number };
}

export const citizenStart = (identity: CitizenIdentity) =>
  request<CitizenProfile>("/bot/citizens/start", { method: "POST", body: identity });

export const updateCitizenProfile = (
  identity: CitizenIdentity,
  profile: { phone?: string; districtId?: string; mahallaId?: string },
) =>
  request<CitizenProfile>("/bot/citizens/profile", {
    method: "POST",
    body: { ...identity, profile },
  });

export interface Category {
  id: string;
  name: string;
  color: string | null;
  description: string | null;
  icon: string | null;
  slaHours: number;
  orgName: string | null;
}

export const getCategories = () => request<Category[]>("/bot/citizens/categories");

export interface Territory {
  districts: { id: string; name: string }[];
  mahallas: { id: string; name: string; districtId: string }[];
}

export const getTerritory = () => request<Territory>("/bot/citizens/territory");

/**
 * AI YO'NALISH TAKLIFI.
 *
 * ⚠️ `token` IMZOLANGAN va murojaat yaratishda QAYTARILADI: foizni
 * bot o'zgartira olmaydi. Mijoz aytgan qiymatga ishonilsa, panelda
 * "AI 94% ishonch bilan shuni aytgan" degan SOXTA dalil paydo
 * bo'lardi (CLAUDE.md).
 *
 * ⚠️ `suggestion: null` — XATO EMAS: taklif QULAYLIK va usiz ham
 * oqim davom etadi (fuqaro ro'yxatdan o'zi tanlaydi).
 */
export interface AiSuggestion {
  categoryId: string;
  categoryName: string;
  confidence: number;
  priority: string;
  slaHours: number;
  orgName: string | null;
}

export const analyzeBody = (identity: CitizenIdentity, body: string) =>
  request<{ suggestion: AiSuggestion | null; token: string | null }>(
    "/bot/citizens/appeals/analyze",
    { method: "POST", body: { ...identity, analyze: { body } } },
  );

/**
 * TELEGRAM FAYLINI SERVER YUKLAB OLADI.
 *
 * ⚠️ BOT BAYTLARNI O'ZI TASHIMAYDI: faqat `file_id` uzatadi. Aks
 * holda bir xil fayl tarmoqdan IKKI marta o'tardi va 25 MB gacha
 * video bot xotirasida turardi.
 */
export const uploadFile = (identity: CitizenIdentity, fileId: string) =>
  request<{ token: string; kind: string; url: string; size: number }>(
    "/bot/citizens/uploads",
    { method: "POST", body: { ...identity, fileId } },
  );

export interface AppealPayload {
  categoryId: string;
  body: string;
  districtId?: string;
  mahallaId?: string;
  lat?: number;
  lng?: number;
  address?: string;
  isHazard?: boolean;
  isLongStanding?: boolean;
  isRepeatAppeal?: boolean;
  attachments?: string[];
  analysisToken?: string;
}

export const createAppeal = (identity: CitizenIdentity, appeal: AppealPayload) =>
  request<{
    id: string;
    publicNo: string;
    createdAt: string;
    dueAt: string | null;
    categoryName: string;
    orgName: string | null;
    slaHours: number;
  }>("/bot/citizens/appeals", { method: "POST", body: { ...identity, appeal } });

export interface AppealListItem {
  id: string;
  publicNo: string;
  title: string;
  status: string;
  address: string | null;
  createdAt: string;
  dueAt: string | null;
  category: { id: string; name: string; icon: string | null };
  photos: string[];
  commentCount: number;
  timeline: { key: string; label: string; done: boolean }[];
}

export const listAppeals = (identity: CitizenIdentity, status?: string) =>
  request<{
    items: AppealListItem[];
    total: number;
    counts: { all: number; open: number; resolved: number; rejected: number };
  }>("/bot/citizens/appeals/list", { method: "POST", body: { ...identity, status } });

export const getAppeal = (identity: CitizenIdentity, id: string) =>
  request<Record<string, unknown>>(
    `/bot/citizens/appeals/${encodeURIComponent(id)}`,
    { method: "POST", body: identity },
  );
