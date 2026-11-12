/**
 * O'CHIRISH NEGA BAJARILMADI — ANIQ SABAB.
 *
 * ── NIMA UCHUN ALOHIDA FAYL ───────────────────────────────────────────
 *
 * ⚠️ TELEGRAM SABABNI AYTMAYDI. Haqiqiy guruhda ushlangan xato aynan
 * shunday ko'rindi:
 *
 *     400: Bad Request: message can't be deleted
 *
 * Bu matn ma'muriyatga HECH NARSA bermaydi: bot admin emasmi, huquqi
 * yo'qmi, xabar eskimi — bittasi ham ko'rinmaydi. Panelda esa aynan
 * shu satr turardi (`SecurityEvent.errorMessage`), ya'ni "xato bor,
 * lekin nima qilish kerakligi noma'lum" degan holat. Qalqon yoqilgan,
 * ma'muriyat himoya ishlayapti deb o'ylaydi, zararli xabar esa guruhda
 * qolib ketadi — va bot ogohlantirish YOZMAYDI, demak buni hech kim
 * sezmaydi.
 *
 * ⚠️ SHUNING UCHUN SABAB SO'RALADI: xato ushlangach bot o'zining
 * guruhdagi huquqini `getChatMember` bilan o'qiydi va panelga
 * TUSHUNARLI, AMAL QILSA BO'LADIGAN matn yozadi ("botni admin qiling
 * va 'Xabarlarni o'chirish' huquqini bering").
 *
 * ⚠️ BU "BOT GURUHDA HECH NARSA YOZMAYDI" QOIDASINI BUZMAYDI:
 * `getChatMember` — O'QISH so'rovi, guruh yozishmasiga hech narsa
 * qo'shmaydi.
 */

import { GrammyError } from "grammy";

import type { BotContext } from "../../shared/context";

export interface DeleteFailure {
  /** Panelda ko'rinadigan o'zbekcha sabab. */
  message: string;
  /**
   * Botda o'chirish huquqi BORMI.
   *
   * ⚠️ `undefined` — "bilinmadi" (huquq so'rovi ham xato berdi) va u
   * `false` dan BOSHQA narsa: bilinmagan holatni "huquq yo'q" deb
   * yozish panelda noto'g'ri ogohlantirish chiqarardi.
   */
  canDelete?: boolean;
}

type DeleteRight =
  | "ok"
  | "not_admin"
  | "no_delete_right"
  | "not_member"
  | "unknown";

/**
 * HUQUQ KESHI — `chatId` → `{ right, at }`.
 *
 * ⚠️ KESH KERAK: firibgar bir vaqtda o'nlab xabar tashlashi mumkin va
 * har biri uchun `getChatMember` chaqirilsa, Telegram 429 bilan
 * botni butunlay sekinlashtirardi — o'chirish esa VAQTGA bog'liq amal.
 *
 * ⚠️ MUDDATI QISQA (5 daqiqa): huquq guruh sozlamalarida istalgan
 * payt qaytariladi va ma'muriyat "huquq berdim, lekin panel hali ham
 * ogohlantiryapti" deb hayron bo'lmasligi kerak.
 */
const RIGHT_CACHE_TTL_MS = 5 * 60 * 1000;
const rightCache = new Map<string, { right: DeleteRight; at: number }>();

const readDeleteRight = async (
  ctx: BotContext,
  chatId: number,
): Promise<DeleteRight> => {
  const key = String(chatId);
  const cached = rightCache.get(key);
  if (cached && Date.now() - cached.at < RIGHT_CACHE_TTL_MS) return cached.right;

  let right: DeleteRight = "unknown";

  try {
    const me = await ctx.api.getChatMember(chatId, ctx.me.id);

    if (me.status === "left" || me.status === "kicked") {
      right = "not_member";
    } else if (me.status === "creator") {
      // ⚠️ BOT "creator" BO'LA OLMAYDI, lekin tekshiruv turadi:
      // shart ro'yxati to'liq bo'lmasa, kutilmagan holat "not_admin"
      // deb yozilib, panelda noto'g'ri maslahat chiqardi.
      right = "ok";
    } else if (me.status !== "administrator") {
      right = "not_admin";
    } else {
      right = me.can_delete_messages ? "ok" : "no_delete_right";
    }
  } catch (error) {
    console.error(
      `[guard] ${chatId} huquqi o'qilmadi: ${(error as Error).message}`,
    );
    right = "unknown";
  }

  rightCache.set(key, { right, at: Date.now() });
  return right;
};

/** Huquq o'zgardi — keshni tashlaydi (`my_chat_member` dan). */
export const forgetDeleteRight = (chatId: string): void => {
  rightCache.delete(chatId);
};

/**
 * XATONI O'ZBEKCHA, AMAL QILSA BO'LADIGAN SABABGA AYLANTIRADI.
 *
 * ⚠️ TARTIB MUHIM: avval "xabar yo'q" tekshiriladi — u xato EMAS
 * (kimdir qo'lda o'chirgan) va buning uchun huquq so'rashning hojati
 * yo'q. Keyin huquq o'qiladi, chunki Telegram'ning `message can't be
 * deleted` matni huquq yo'qligida ham, xabar eskiligida ham AYNI.
 */
export const diagnoseDeleteFailure = async (
  ctx: BotContext,
  chatId: number,
  error: unknown,
): Promise<DeleteFailure> => {
  const description =
    error instanceof GrammyError
      ? error.description
      : ((error as Error)?.message ?? "");

  if (/message to delete not found/i.test(description)) {
    return {
      message: "Xabar topilmadi — u allaqachon o'chirilgan.",
      // ⚠️ HUQUQ HAQIDA XULOSA CHIQARILMAYDI: xabar yo'qligi huquqqa
      // umuman aloqador emas.
      canDelete: undefined,
    };
  }

  const right = await readDeleteRight(ctx, chatId);

  if (right === "not_member") {
    return {
      message:
        "Bot guruhdan chiqarilgan — xabarlarni o'chira olmaydi. Qalqon ishlashi uchun botni guruhga qaytaring.",
      canDelete: false,
    };
  }

  if (right === "not_admin") {
    return {
      message:
        "Bot guruhda ADMINISTRATOR emas. Telegram oddiy a'zoga faqat o'z xabarini o'chirishga ruxsat beradi — botni admin qilib, \"Xabarlarni o'chirish\" huquqini bering.",
      canDelete: false,
    };
  }

  if (right === "no_delete_right") {
    return {
      message:
        "Botda \"Xabarlarni o'chirish\" huquqi yo'q. Guruh → Administratorlar → bot → shu huquqni yoqing.",
      canDelete: false,
    };
  }

  /**
   * ⚠️ HUQUQ BOR, LEKIN BARIBIR O'CHMADI. Qolgan sabablar Telegram
   * tomonidan va ularni bot TUZATA OLMAYDI — shuning uchun ular
   * "huquq yo'q" deb YOZILMAYDI (`canDelete: true`), aks holda
   * panelda yo'q muammo haqida ogohlantirish turardi.
   */
  if (/message can't be deleted/i.test(description)) {
    return {
      message:
        "Telegram o'chirishga ruxsat bermadi, garchi huquq bo'lsa ham. Odatdagi sabab: xabar bog'langan KANALDAN avtomatik uzatilgan (uni kanalning o'zidan o'chirish kerak) yoki 48 soatdan eski.",
      canDelete: right === "ok" ? true : undefined,
    };
  }

  if (/not enough rights|need administrator rights|CHAT_ADMIN_REQUIRED/i.test(description)) {
    return {
      message:
        "Telegram huquq yetarli emas dedi. Botning guruhdagi administrator huquqlarini tekshiring.",
      canDelete: false,
    };
  }

  // ⚠️ TANILMAGAN XATO YUTILMAYDI: xom matn baribir saqlanadi —
  // yo'qotilsa, sababini keyin topib bo'lmasdi.
  return {
    message: description.slice(0, 400) || "Noma'lum xato",
    canDelete: right === "ok" ? true : undefined,
  };
};
