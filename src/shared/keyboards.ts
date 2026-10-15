/**
 * KLAVIATURALAR.
 *
 * ⚠️ ODDIY KLAVIATURA ISHLATILADI (`Keyboard`), inline EMAS. Sabab:
 * inline tugma `callback_data` beradi va u 64 baytga cheklangan —
 * kategoriya `id` (cuid) unga sig'adi, lekin oddiy klaviatura
 * doimiy ko'rinib turadi va foydalanuvchi uni har xabardan keyin
 * qaytadan chaqirishi kerak emas.
 *
 * ⚠️ BUNING NARXI BOR va u bilinadi: oddiy tugma — MATNLI XABAR,
 * ya'ni bizga faqat NOM qaytadi, `id` emas. Shuning uchun
 * kategoriya NOM BO'YICHA va faqat FAOLLAR orasidan topiladi
 * (`issue-submit/handler.ts`): klaviatura MIJOZDA qoladi va
 * kategoriya shu orada o'chirilgan bo'lishi mumkin.
 */

import { Keyboard } from "grammy";

import { BUTTONS } from "./texts";

/** Asosiy menyu. */
export const mainMenu = (): Keyboard =>
  new Keyboard()
    .text(BUTTONS.SUBMIT_ISSUE)
    .row()
    .text(BUTTONS.HELP)
    .resized();

/**
 * Kategoriya tanlash.
 *
 * ⚠️ IKKI USTUNDA: kategoriya nomlari uzun ("Yo'l va infratuzilma")
 * va bir ustunda ro'yxat ekranni to'ldirib yuborardi.
 *
 * ⚠️ "BEKOR QILISH" HAR DOIM OXIRIDA, alohida qatorda: u
 * kategoriya tugmalari orasiga tushib, tasodifan bosilmasligi kerak.
 */
export const categoryKeyboard = (names: string[]): Keyboard => {
  const keyboard = new Keyboard();

  for (let index = 0; index < names.length; index += 2) {
    keyboard.text(names[index]!);
    const next = names[index + 1];
    if (next) keyboard.text(next);
    keyboard.row();
  }

  return keyboard.text(BUTTONS.CANCEL).resized();
};

/** Matn yozish bosqichi — faqat bekor qilish. */
export const cancelKeyboard = (): Keyboard =>
  new Keyboard().text(BUTTONS.CANCEL).resized();
