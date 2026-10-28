/**
 * KLAVIATURALAR.
 *
 * ⚠️ ODDIY KLAVIATURA ISHLATILADI (`Keyboard`), inline EMAS. Sabab:
 * oddiy klaviatura doimiy ko'rinib turadi va fuqaro uni har xabardan
 * keyin qaytadan chaqirishi kerak emas. Bundan tashqari joylashuv va
 * telefon ulashish FAQAT oddiy klaviaturada mavjud
 * (`request_location`, `request_contact`) — inline tugma buni qila
 * olmaydi.
 *
 * ⚠️ BUNING NARXI BOR va u bilinadi: oddiy tugma — MATNLI XABAR,
 * ya'ni bizga faqat NOM qaytadi, `id` emas. Shuning uchun kategoriya
 * va hudud NOM BO'YICHA va faqat FAOLLAR orasidan topiladi
 * (`appeal/handler.ts`): klaviatura MIJOZDA qoladi va ro'yxat shu
 * orada o'zgargan bo'lishi mumkin.
 */

import { Keyboard } from "grammy";

import { BUTTONS } from "./texts";

/** Asosiy menyu. */
export const mainMenu = (): Keyboard =>
  new Keyboard()
    .text(BUTTONS.SUBMIT_ISSUE)
    .row()
    .text(BUTTONS.MY_ISSUES)
    .text(BUTTONS.PROFILE)
    .row()
    .text(BUTTONS.HELP)
    .resized();

/** Matn yozish bosqichi — faqat bekor qilish. */
export const cancelKeyboard = (): Keyboard =>
  new Keyboard().text(BUTTONS.CANCEL).resized();

/**
 * AI TAKLIFI.
 *
 * ⚠️ IKKALA YO'L HAM OCHIQ: taklif — QAROR EMAS va fuqaro uni rad
 * etib, ro'yxatdan o'zi tanlay oladi (CLAUDE.md — "mobil AI: taklif,
 * qaror emas").
 */
export const suggestionKeyboard = (): Keyboard =>
  new Keyboard()
    .text(BUTTONS.AI_ACCEPT)
    .row()
    .text(BUTTONS.AI_PICK)
    .row()
    .text(BUTTONS.CANCEL)
    .resized();

/**
 * Ro'yxatdan tanlash (kategoriya, tuman, MFY).
 *
 * ⚠️ IKKI USTUNDA: nomlar uzun ("Yo'l va infratuzilma") va bir
 * ustunda ro'yxat ekranni to'ldirib yuborardi.
 *
 * ⚠️ "BEKOR QILISH" HAR DOIM OXIRIDA, alohida qatorda: u ro'yxat
 * tugmalari orasiga tushib, tasodifan bosilmasligi kerak.
 */
export const listKeyboard = (names: string[], perRow = 2): Keyboard => {
  const keyboard = new Keyboard();

  for (let index = 0; index < names.length; index += perRow) {
    for (let column = 0; column < perRow; column += 1) {
      const name = names[index + column];
      if (name) keyboard.text(name);
    }
    keyboard.row();
  }

  return keyboard.text(BUTTONS.CANCEL).resized();
};

/** Surat/video bosqichi. */
export const mediaKeyboard = (hasFiles: boolean): Keyboard =>
  new Keyboard()
    // ⚠️ FAYL BOR-YO'QLIGIGA QARAB BOSHQA TUGMA: fayl yo'q bo'lsa
    // "tayyor" so'zi "nima tayyor?" degan savol tug'dirardi.
    .text(hasFiles ? BUTTONS.DONE : BUTTONS.SKIP)
    .row()
    .text(BUTTONS.CANCEL)
    .resized();

/**
 * JOYLASHUV.
 *
 * ⚠️ `requestLocation` — TELEGRAM'NING O'Z TUGMASI: u aniq
 * koordinata beradi va fuqarodan manzilni yozishni talab qilmaydi.
 * Qo'lda yozilgan manzil ham qabul qilinadi (hamma ham joylashuvini
 * ulashishni istamaydi).
 */
export const locationKeyboard = (): Keyboard =>
  new Keyboard()
    .requestLocation("📍 Joylashuvni yuborish")
    .row()
    .text(BUTTONS.SKIP)
    .row()
    .text(BUTTONS.CANCEL)
    .resized();

/** Bayroqlar — bosilgani belgilanadi, qayta bosilsa olib tashlanadi. */
export const flagsKeyboard = (selected: {
  hazard?: boolean;
  longStanding?: boolean;
  repeat?: boolean;
}): Keyboard =>
  new Keyboard()
    // ⚠️ BELGI TUGMA MATNIDA KO'RSATILMAYDI: matn o'zgarsa, uni
    // nom bo'yicha tanib bo'lmay qolardi (`texts.ts` izohi). Holat
    // javob xabarida aytiladi.
    .text(BUTTONS.FLAG_HAZARD)
    .row()
    .text(BUTTONS.FLAG_LONG)
    .text(BUTTONS.FLAG_REPEAT)
    .row()
    .text(BUTTONS.DONE)
    .row()
    .text(BUTTONS.CANCEL)
    .resized();

/** Oxirgi tasdiq. */
export const reviewKeyboard = (): Keyboard =>
  new Keyboard().text(BUTTONS.SEND).row().text(BUTTONS.CANCEL).resized();

/** Telefon so'rash — Telegram o'zi ulashadi. */
export const phoneKeyboard = (): Keyboard =>
  new Keyboard()
    .requestContact("📞 Raqamni ulashish")
    .row()
    .text(BUTTONS.CANCEL)
    .resized();

/**
 * PROFIL MENYUSI.
 *
 * ⚠️ BU TUGMALAR `BUTTONS` GA QO'SHILMAYDI: ular faqat profil
 * ekranida ko'rinadi va asosiy menyu to'plamiga (`MENU_VALUES`)
 * tushsa, murojaat oqimini tashlab yuborardi. Shuning uchun alohida
 * e'lon.
 */
export const PROFILE_BUTTONS = {
  SET_AREA: "🏘 Hududni ko'rsatish",
  SET_PHONE: "📞 Telefon raqam",
} as const;

export const profileMenu = (): Keyboard =>
  new Keyboard()
    .text(PROFILE_BUTTONS.SET_AREA)
    .row()
    .text(PROFILE_BUTTONS.SET_PHONE)
    .row()
    .text(BUTTONS.SUBMIT_ISSUE)
    .row()
    .text(BUTTONS.MY_ISSUES)
    .text(BUTTONS.HELP)
    .resized();
