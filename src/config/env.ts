/**
 * MUHIT SOZLAMALARI — bir joyda o'qiladi va TEKSHIRILADI.
 *
 * ⚠️ TEKSHIRUV MODUL YUKLANGANDA, funksiya ichida emas. Bot
 * `main.ts` da polling boshlagandan keyin xato chiqsa, u
 * "ishlayapti" deb turib har xabarga javob bermay qolardi — va buni
 * faqat foydalanuvchi shikoyatidan bilib olish mumkin edi.
 */

import "dotenv/config";

const required = (key: string): string => {
  const value = process.env[key]?.trim();
  if (!value) {
    throw new Error(`[config] ${key} majburiy. .env.example faylini ko'ring.`);
  }
  return value;
};

const optional = (key: string): string | undefined => {
  const value = process.env[key]?.trim();
  return value ? value : undefined;
};

const int = (key: string, fallback: number): number => {
  const raw = process.env[key]?.trim();
  if (!raw) return fallback;

  const parsed = Number.parseInt(raw, 10);
  if (Number.isNaN(parsed)) {
    throw new Error(`[config] ${key} son bo'lishi kerak, "${raw}" berilgan`);
  }
  return parsed;
};

export const config = {
  botToken: required("BOT_TOKEN"),

  /**
   * ⚠️ OXIRIDAGI `/` OLIB TASHLANADI: `api.ts` yo'lni `/bot/...` deb
   * qo'shadi va ikkita slash (`//bot/...`) ba'zi proxy'larda 404
   * berardi.
   */
  apiUrl: required("API_URL").replace(/\/+$/, ""),
  botApiKey: required("BOT_API_KEY"),

  apiTimeoutMs: int("API_TIMEOUT_MS", 15_000),

  /**
   * MINI APP MANZILI (HTTPS).
   *
   * ⚠️ MAJBURIY EMAS: bo'lmasa menyu tugmasi QO'YILMAYDI va bot
   * baribir ishlaydi (guruh kuzatuvi, qalqon). Mini App'ni ulash —
   * qo'shimcha imkoniyat.
   *
   * ⚠️ MENYU TUGMASI UCHUN BotFather KERAK EMAS — `setChatMenuButton`
   * oddiy Bot API chaqiruvi (CLAUDE.md).
   */
  mobileAppUrl: optional("MOBILE_APP_URL"),

  nodeEnv: process.env.NODE_ENV?.trim() || "development",
} as const;
