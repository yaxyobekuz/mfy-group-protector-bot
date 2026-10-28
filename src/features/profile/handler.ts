/**
 * PROFIL — tuman, MFY va telefon.
 *
 * ── NIMA UCHUN KERAK ──────────────────────────────────────────────────
 *
 * ⚠️ HUDUD MAJBURIY EMAS, lekin MUHIM: `Issue.mahallaId` bo'sh bo'lsa,
 * murojaat faqat VILOYAT darajasida ko'rinadi (`issues.service.ts`
 * dagi `assertScope`) — tuman xodimi uni umuman ko'rmaydi va ish
 * sekinlashadi.
 *
 * ⚠️ ISM VA USERNAME BU YERDA TAHRIRLANMAYDI: ular Telegram'dan
 * keladi va har so'rovda ustiga yoziladi (`bot-citizens.service.ts`).
 * Tahrirlash tugmasi qo'yilsa, keyingi xabarda jim qaytarib
 * yozilardi.
 */

import type { Composer } from "grammy";

import { getTerritory, updateCitizenProfile } from "../../shared/api";
import {
  listKeyboard,
  mainMenu,
  phoneKeyboard,
  profileMenu,
  PROFILE_BUTTONS,
} from "../../shared/keyboards";
import { BUTTONS, TEXTS } from "../../shared/texts";
import { identityOf, isAlive, type BotContext } from "../../shared/context";

/** Telefon raqam uzunligi — serverdagi `@MaxLength(32)` bilan ayni. */
const PHONE_MAX = 32;

export const registerProfile = (bot: Composer<BotContext>): void => {
  // ═════════════════════════════════════════════════════════════════
  //  PROFILNI KO'RSATISH
  // ═════════════════════════════════════════════════════════════════

  bot.hears(BUTTONS.PROFILE, async (ctx) => {
    delete ctx.session.appeal;

    const result = await updateCitizenProfile(identityOf(ctx), {});

    if (!result.ok) {
      await ctx.reply(result.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
      return;
    }

    const profile = result.data!;

    await ctx.reply(
      TEXTS.PROFILE({
        name: [profile.firstName, profile.lastName].filter(Boolean).join(" "),
        phone: profile.phone,
        district: profile.districtName,
        mahalla: profile.mahallaName,
        points: profile.points,
        stats: profile.stats,
      }),
      { parse_mode: "HTML", reply_markup: profileMenu() },
    );
  });

  // ═════════════════════════════════════════════════════════════════
  //  TUMAN / MFY TANLASH
  // ═════════════════════════════════════════════════════════════════

  // ⚠️ PROFIL TUGMALARI MUROJAAT OQIMINI TASHLAYDI. Ular
  // `registerAppeal` DAN OLDIN ro'yxatdan o'tadi (`main.ts`), ya'ni
  // oqim o'rtasida bosilsa ham shu yerda ushlanadi — va o'sha
  // paytda yarim qolgan qoralama tozalanishi kerak. Aks holda
  // profil saqlangandan keyin yozilgan matn ESKI murojaat oqimiga
  // tushib ketardi.
  bot.hears(PROFILE_BUTTONS.SET_AREA, async (ctx) => {
    delete ctx.session.appeal;

    const territory = await getTerritory();

    if (!territory.ok) {
      await ctx.reply(territory.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
      return;
    }

    const districts = territory.data?.districts ?? [];
    if (districts.length === 0) {
      await ctx.reply(TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
      return;
    }

    ctx.session.profile = { step: "district", startedAt: Date.now() };

    await ctx.reply(TEXTS.PROFILE_PICK_DISTRICT, {
      reply_markup: listKeyboard(districts.map((d) => d.name)),
    });
  });

  bot.hears(PROFILE_BUTTONS.SET_PHONE, async (ctx) => {
    delete ctx.session.appeal;

    ctx.session.profile = { step: "phone", startedAt: Date.now() };

    await ctx.reply(TEXTS.PROFILE_ASK_PHONE, {
      parse_mode: "HTML",
      reply_markup: phoneKeyboard(),
    });
  });

  /**
   * ⚠️ TELEGRAM O'ZI ULASHGAN RAQAM AFZAL: u tasdiqlangan va
   * fuqaro terib xato qilmaydi. Qo'lda yozish ham qoldiriladi —
   * ba'zi hisoblarda raqam ulanmagan bo'ladi.
   */
  bot.on("message:contact", async (ctx) => {
    const draft = ctx.session.profile;
    if (!isAlive(draft) || draft.step !== "phone") return;

    await savePhone(ctx, ctx.message.contact.phone_number);
  });

  // ═════════════════════════════════════════════════════════════════
  //  MATNLI BOSQICHLAR
  // ═════════════════════════════════════════════════════════════════

  bot.on("message:text", async (ctx, next) => {
    const text = ctx.message.text.trim();

    if (text.startsWith("/")) return next();

    const draft = ctx.session.profile;
    if (!isAlive(draft)) return next();

    // ── TUMAN ──────────────────────────────────────────────────────
    if (draft.step === "district") {
      const territory = await getTerritory();
      if (!territory.ok) {
        await ctx.reply(territory.error ?? TEXTS.ERROR_GENERIC);
        return;
      }

      const district = findByName(territory.data!.districts, text);

      // ⚠️ TOPILMASA RO'YXAT QAYTA KO'RSATILADI, `next()` EMAS:
      // oqim FAOL va matn shu oqimga tegishli. `next()` qilinsa,
      // xabar oxirgi handler'ga tushib, u holatni tozalab
      // yuborardi — fuqaro esa nima bo'lganini tushunmasdi.
      if (!district) {
        await ctx.reply(TEXTS.PROFILE_PICK_DISTRICT, {
          reply_markup: listKeyboard(territory.data!.districts.map((d) => d.name)),
        });
        return;
      }

      const mahallas = (territory.data?.mahallas ?? []).filter(
        (m) => m.districtId === district.id,
      );

      // ⚠️ TUMAN DARHOL SAQLANADI: fuqaro MFY ni tanlamay ketsa ham,
      // tumani ma'lum bo'lib qoladi va murojaat to'g'ri yo'nalardi.
      const saved = await updateCitizenProfile(identityOf(ctx), {
        districtId: district.id,
      });
      if (!saved.ok) {
        await ctx.reply(saved.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
        return;
      }

      if (mahallas.length === 0) {
        delete ctx.session.profile;
        await ctx.reply(TEXTS.PROFILE_SAVED, { reply_markup: profileMenu() });
        return;
      }

      ctx.session.profile = {
        step: "mahalla",
        districtId: district.id,
        districtName: district.name,
        startedAt: Date.now(),
      };

      await ctx.reply(TEXTS.PROFILE_PICK_MAHALLA(district.name), {
        parse_mode: "HTML",
        reply_markup: listKeyboard(mahallas.map((m) => m.name), 1),
      });
      return;
    }

    // ── MFY ────────────────────────────────────────────────────────
    if (draft.step === "mahalla") {
      const territory = await getTerritory();
      if (!territory.ok) {
        await ctx.reply(territory.error ?? TEXTS.ERROR_GENERIC);
        return;
      }

      const mahalla = (territory.data?.mahallas ?? [])
        .filter((m) => m.districtId === draft.districtId)
        .find((m) => m.name.trim().toLowerCase() === text.toLowerCase());

      // ⚠️ TOPILMASA RO'YXAT QAYTA KO'RSATILADI (yuqoridagi bilan
      // ayni sabab).
      if (!mahalla) {
        const list = (territory.data?.mahallas ?? []).filter(
          (m) => m.districtId === draft.districtId,
        );
        await ctx.reply(TEXTS.PROFILE_PICK_MAHALLA(draft.districtName ?? ""), {
          parse_mode: "HTML",
          reply_markup: listKeyboard(list.map((m) => m.name), 1),
        });
        return;
      }

      const saved = await updateCitizenProfile(identityOf(ctx), {
        districtId: draft.districtId,
        mahallaId: mahalla.id,
      });

      delete ctx.session.profile;

      if (!saved.ok) {
        await ctx.reply(saved.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
        return;
      }

      await ctx.reply(TEXTS.PROFILE_SAVED, { reply_markup: profileMenu() });
      return;
    }

    // ── TELEFON ────────────────────────────────────────────────────
    if (draft.step === "phone") {
      await savePhone(ctx, text);
      return;
    }

    return next();
  });
};

// ═══════════════════════════════════════════════════════════════════
//  Ichki
// ═══════════════════════════════════════════════════════════════════

async function savePhone(ctx: BotContext, raw: string): Promise<void> {
  const phone = raw.trim().slice(0, PHONE_MAX);

  const saved = await updateCitizenProfile(identityOf(ctx), { phone });

  delete ctx.session.profile;

  if (!saved.ok) {
    await ctx.reply(saved.error ?? TEXTS.ERROR_GENERIC, { reply_markup: mainMenu() });
    return;
  }

  await ctx.reply(TEXTS.PROFILE_SAVED, { reply_markup: profileMenu() });
}

const findByName = <T extends { name: string }>(
  list: T[],
  text: string,
): T | undefined => {
  const needle = text.trim().toLowerCase();
  return list.find((item) => item.name.trim().toLowerCase() === needle);
};
