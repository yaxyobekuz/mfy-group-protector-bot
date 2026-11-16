/**
 * CHAT TURI — KANAL VA GURUH AJRATILGAN JOY (BOTDAGI YAGONA MANBA).
 *
 * ── NIMA UCHUN AJRATILDI ──────────────────────────────────────────────
 *
 * ⚠️ BOT KANALDA HAM ADMIN QILIB QO'YILADI, lekin KANAL — GURUH EMAS:
 * u yerda aholi yozmaydi, faqat rais (yoki tashkilot) post qiladi.
 * Shuning uchun kanalda mantiqning FAQAT BIR YARMI ma'noli:
 *
 *   kuzatuv (post → serverga → AI → signal)  →  ISHLAYDI
 *   qalqon  (zararli fayl/havolani o'chirish) →  MA'NOSIZ
 *
 * ⚠️ QALQON KANALDA MA'NOSIZ, CHUNKI ZARARLI KONTENTNI O'SHA
 * KANALNING O'Z ADMINI YOZADI: "himoya qilinadigan" va "tahdid
 * soladigan" tomon bir xil bo'lib qoladi, ya'ni bot ma'muriyatning
 * o'z e'lonini o'chirishga urinardi.
 *
 * ⚠️ VA O'CHIRISH URINISHINING O'ZI HAM ZARAR: kanalda bot huquq
 * olmagan bo'lsa, panelda "Qalqon ishlamayapti" degan — tuzatib
 * bo'lmaydigan — ogohlantirish paydo bo'lardi. Yolg'on
 * ogohlantirish haqiqiysini ko'rinmas qiladi.
 *
 * ── SERVERDA HAM NUSXA BOR ────────────────────────────────────────────
 *
 * ⚠️ `server/src/common/chat-type.ts` — IKKISI KO'ZGU va bu ataylab:
 * botda Prisma ham yo'q, serverdan import ham yo'q (ikki mustaqil
 * repo). Bu yerga tur qo'shilsa, u yerga ham qo'shiladi — aks holda
 * bot yuborgan postni server "noma'lum tur" deb tashlab yuborardi.
 */

/** Telegram `Chat.type` — kanal. */
export const CHANNEL_TYPE = "channel";

/**
 * KUZATILADIGAN CHAT TURLARI.
 *
 * ⚠️ `private` ATAYLAB YO'Q: shaxsiy chat — bu murojaat oqimi, guruh
 * emas. Uni bu yerga qo'shish har foydalanuvchining shaxsiy
 * yozishmasini kuzatuv navbatiga yuborardi.
 */
export const WATCHED_CHAT_TYPES = new Set(["group", "supergroup", CHANNEL_TYPE]);

/** Chat KANALMI. */
export const isChannel = (type: string | null | undefined): boolean =>
  type === CHANNEL_TYPE;

/**
 * QALQON SHU CHATDA MA'NOLIMI.
 *
 * ⚠️ ALOHIDA NOM, `!isChannel` EMAS: shart "kanal emas" degani emas,
 * "qalqon bu yerda ma'noli" degani — keyin yangi tur qo'shilsa,
 * o'zgarish bitta joyda bo'ladi.
 */
export const guardApplies = (type: string | null | undefined): boolean =>
  !isChannel(type);
