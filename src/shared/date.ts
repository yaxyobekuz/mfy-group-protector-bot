/**
 * SANA FORMATI — YAGONA MANBA (bot).
 *
 * ⚠️ BU FAYLDAN BOSHQA JOYDA SANA MATNI YIG'ILMAYDI. Serverdagi
 * `common/date.util.ts`, paneldagi va mini-ilovadagi
 * `shared/lib/date.ts` ning KO'ZGUSI: bitta murojaat panelda
 * "21-may, 2025 14:30", botda esa "21.05.2025" bo'lib ko'rinsa,
 * fuqaro bilan xodim bir xil yozuv haqida gaplashayotganiga ishonch
 * qolmasdi.
 *
 *   kun         →  21-may, 2025
 *   kun + vaqt  →  21-may, 2025 14:30
 *
 * ⚠️ FAQAT O'ZBEKCHA: bot bitta tilda ishlaydi (panel va mini-ilova
 * ko'p tilli). Til qo'shilganda oy ro'yxati mini-ilovanikidan
 * KO'CHIRILADI, yangi format O'YLAB TOPILMAYDI.
 *
 * ── TAQIQLANGAN ───────────────────────────────────────────────────────
 *
 * ⚠️ `toLocaleDateString()`, `Intl.DateTimeFormat` va qo'lda yig'ilgan
 * `${day}.${month}.${year}` ISHLATILMAYDI. Natija kod YOZILGAN joyga
 * emas, kod ISHLAYOTGAN muhitga bog'liq bo'lardi — konteynerda esa
 * locale umuman o'rnatilmagan bo'ladi.
 *
 * ⚠️ `getHours()` HAM ISHLATILMAYDI: u konteynerning zonasini
 * (UTC) berardi. Toshkent devor-soati `+5` qo'shib, `getUTC*` bilan
 * o'qiladi.
 */

const MONTHS = [
  "yanvar",
  "fevral",
  "mart",
  "aprel",
  "may",
  "iyun",
  "iyul",
  "avgust",
  // ⚠️ IMLO QAT'IY: "sentabr"/"oktabr" — "sentyabr"/"oktyabr" EMAS.
  "sentabr",
  "oktabr",
  "noyabr",
  "dekabr",
] as const;

/** Bo'sh yoki yaroqsiz qiymat — `Invalid Date` yoki bo'sh satr EMAS. */
const EMPTY = "—";

/** Toshkent (+5), DST yo'q. */
const TASHKENT_OFFSET_MINUTES = 5 * 60;

type DateInput = Date | string | number | null | undefined;

const toDate = (value: DateInput): Date | null => {
  if (value === null || value === undefined || value === "") return null;

  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const toTashkent = (date: Date): Date =>
  new Date(date.getTime() + TASHKENT_OFFSET_MINUTES * 60_000);

const pad = (value: number): string => String(value).padStart(2, "0");

/** "21-may, 2025" */
export const formatDateUz = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return EMPTY;

  const tz = toTashkent(date);

  // ⚠️ Kun raqami NOLDAN BOSHLANMAYDI: "3-yanvar", "03-yanvar" emas.
  return `${tz.getUTCDate()}-${MONTHS[tz.getUTCMonth()]}, ${tz.getUTCFullYear()}`;
};

/** "14:30" */
export const formatTimeUz = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return EMPTY;

  const tz = toTashkent(date);
  return `${pad(tz.getUTCHours())}:${pad(tz.getUTCMinutes())}`;
};

/** "21-may, 2025 14:30" */
export const formatDateTimeUz = (value: DateInput): string => {
  const date = toDate(value);
  if (!date) return EMPTY;

  return `${formatDateUz(date)} ${formatTimeUz(date)}`;
};
