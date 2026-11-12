/**
 * TASHQI QORA RO'YXAT — BOT XOTIRASIDA.
 *
 * ── NIMA UCHUN BOTDA SAQLANADI ────────────────────────────────────────
 *
 * ⚠️ HAR XABAR UCHUN SERVERGA BORIB BO'LMAYDI. O'chirish VAQTGA
 * bog'liq amal: zararli havola guruhda turgan har soniyada kimdir uni
 * bosadi. Qolaversa, server yiqilganda himoya ishlashda davom etishi
 * kerak (`detect.ts` dagi doktrina) — ro'yxat xotirada bo'lsa,
 * qalqon serversiz ham ishlaydi.
 *
 * ⚠️ `getGuardConfig` GA QO'SHILMAGANI ATAYLAB: u HAR GURUH uchun,
 * har 2 daqiqada so'raladi. 50 000 hostni har safar tashish tarmoqni
 * bekorga band qilardi — bu ro'yxat esa soatda bir marta kerak.
 *
 * ── VERSIYA BILAN SO'RALADI ───────────────────────────────────────────
 *
 * ⚠️ O'ZGARMAGAN BO'LSA RO'YXAT QAYTA YUKLANMAYDI: bot oxirgi olgan
 * versiyasini yuboradi va server `changed: false` qaytaradi. Shu
 * tufayli soatlik so'rov odatda bir necha baytga tushadi.
 *
 * ── XATODA ESKI RO'YXAT SAQLANADI ─────────────────────────────────────
 *
 * ⚠️ SERVER JAVOB BERMASA, XOTIRADAGI RO'YXAT TOZALANMAYDI. Aks holda
 * server bir daqiqaga uzilganda qora ro'yxat BO'SHAB qolardi va o'sha
 * paytda hamma firibgar domen o'tib ketardi — ya'ni himoya eng kerak
 * paytida o'chardi.
 */

import { getBlocklist } from "../../shared/api";

/**
 * QANCHA VAQTDA BIR MARTA YANGILANADI.
 *
 * ⚠️ BIR SOAT: manbalar (URLhaus, PhishTank) soatlab yangilanadi va
 * server ham ularni 6 soatda bir marta yuklaydi. Tez-tez so'rash
 * hech narsa qo'shmasdi, faqat so'rovlar sonini oshirardi.
 */
const REFRESH_MS = 60 * 60 * 1000;

/**
 * XATODAN KEYIN QAYTA URINISH MUDDATI.
 *
 * ⚠️ QISQAROQ (5 daqiqa): bot endi ko'tarilganda ro'yxat hali
 * bo'sh va serverga ulanish tiklanishini bir soat kutish himoyani
 * o'sha vaqtga ochiq qoldirardi.
 */
const RETRY_MS = 5 * 60 * 1000;

let hosts: ReadonlySet<string> = new Set();
let version: string | null = null;
let nextAt = 0;
/** ⚠️ Bir vaqtda ikki so'rov ketmasligi uchun. */
let loading: Promise<void> | null = null;

/**
 * JORIY RO'YXAT.
 *
 * ⚠️ `undefined` EMAS, BO'SH TO'PLAM: `inspectUrl` uni har havola
 * uchun chaqiradi va `undefined` tekshiruvi har safar takrorlanardi.
 * Bo'sh to'plam esa shunchaki hech narsa topmaydi.
 */
export const feedHosts = (): ReadonlySet<string> => hosts;

/**
 * KERAK BO'LSA YANGILAYDI.
 *
 * ⚠️ `await` QILINMAYDI (chaqiruvchi joyda): guruh xabari qalqondan
 * TEZ o'tishi kerak va ro'yxat yangilanishini kutib turish har
 * soatda bitta xabarni sekinlashtirardi. Yangilanish fon'da ketadi,
 * o'sha xabar esa ESKI ro'yxat bilan tekshiriladi — bu to'g'ri
 * murosa.
 */
export const refreshBlocklist = (): void => {
  if (loading || Date.now() < nextAt) return;

  loading = (async () => {
    const result = await getBlocklist(version ?? undefined);

    if (!result.ok || !result.data) {
      // ⚠️ ESKI RO'YXAT SAQLANADI — fayl boshidagi izoh.
      console.error(`[blocklist] olinmadi: ${result.error}`);
      nextAt = Date.now() + RETRY_MS;
      return;
    }

    nextAt = Date.now() + REFRESH_MS;
    version = result.data.version;

    // ⚠️ `changed: false` — SERVER RO'YXATNI YUBORMADI (o'zgarmagan).
    // Bo'sh massivni to'plam qilib yozish ro'yxatni TOZALAB
    // yuborardi.
    if (!result.data.changed) return;

    hosts = new Set(result.data.hosts);
    console.log(`[blocklist] ${hosts.size} host yuklandi`);
  })()
    .catch((error: Error) => {
      console.error(`[blocklist] kutilmagan xato: ${error.message}`);
      nextAt = Date.now() + RETRY_MS;
    })
    .finally(() => {
      loading = null;
    });
};
