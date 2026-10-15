/**
 * ZARARLI KONTENTNI ANIQLASH — BOT TOMONI.
 *
 * ── NIMA UCHUN QOIDA BOTDA TAKRORLANADI ───────────────────────────────
 *
 * ⚠️ ODATDA QOIDA SERVERDA YASHAYDI (`api.ts` dagi "Botda Prisma yo'q"
 * izohi), lekin BU YERDA ISTISNO va u ataylab:
 *
 *   O'CHIRISH — VAQTGA BOG'LIQ AMAL. Telegram bot xabarni faqat 48
 *   soat ichida o'chira oladi, lekin amaliy chegara undan ham qattiq:
 *   zararli apk guruhda turgan har soniyada kimdir uni yuklab oladi.
 *   Har xabar uchun serverga borib "bu zararlimi" deb so'rash
 *   kechikish qo'shardi va server yiqilgan paytda himoya BUTUNLAY
 *   ishlamay qolardi.
 *
 * ⚠️ TAKRORLANADIGAN QISM — ENG QAT'IY VA O'ZGARMAS QOIDALAR:
 * "`.apk` — o'rnatma fayl", "`bit.ly` — qisqartirgich". Bular
 * yillab o'zgarmaydi.
 *
 * ⚠️ O'ZGARUVCHAN QISM (qora/oq ro'yxat) SERVERDAN KELADI
 * (`getGuardConfig`) va botda QOTIB QOLMAYDI: yangi firibgar domen
 * har kuni paydo bo'ladi va uni qo'shish uchun deploy kutib
 * bo'lmaydi.
 *
 * Serverdagi ko'zgusi: `server/src/modules/security/threat-rules.ts`.
 * O'RNATMA KENGAYTMALAR RO'YXATINI o'zgartirsangiz — IKKALASINI
 * tahrirlang.
 */

export type ThreatKind =
  | "apk_file"
  | "unknown_file"
  | "suspicious_url"
  | "shortened_url"
  | "masked_url";

export interface ThreatVerdict {
  kind: ThreatKind;
  /** Qoida kaliti — panelda o'zbekcha matnga aylantiriladi. */
  reason: string;
  url?: string;
  urlHost?: string;
}

/**
 * ⚠️ MIME TURIGA ISHONILMAYDI: uni YUBORUVCHI belgilaydi va `.apk`
 * faylni `image/jpeg` deb jo'natish mumkin. Kengaytma esa fayl
 * nomining bir qismi — foydalanuvchi aynan shunga bosadi.
 */
const INSTALLER_EXTENSIONS = new Set([
  "apk", "xapk", "apks", "aab",
  "exe", "msi", "bat", "cmd", "com", "scr", "pif",
  "jar", "ipa", "dmg", "pkg", "deb", "rpm", "appimage",
  "vbs", "vbe", "js", "jse", "wsf", "wsh", "ps1", "psm1",
  "hta", "cpl", "msc", "reg", "lnk", "iso", "img",
]);

/**
 * ⚠️ ARXIV O'Z-O'ZIDAN ZARARLI EMAS (MFY xodimi hujjatlarni zip
 * qilishi mumkin), lekin u o'rnatma faylni YASHIRISHNING eng keng
 * tarqalgan yo'li — shuning uchun "noma'lum tur".
 */
const ARCHIVE_EXTENSIONS = new Set(["zip", "rar", "7z", "tar", "gz", "bz2", "xz"]);

const URL_SHORTENERS = new Set([
  "bit.ly", "tinyurl.com", "goo.gl", "t.co", "ow.ly", "is.gd", "buff.ly",
  "cutt.ly", "rb.gy", "shorturl.at", "rebrand.ly", "bit.do", "clck.ru",
  "vk.cc", "tiny.cc", "surl.li", "qps.ru", "u.to", "clc.to",
]);

const URL_REGEX = /\bhttps?:\/\/[^\s<>"']+|(?<![@\w.])(?:www\.)[^\s<>"']+/gi;

const extensionOf = (fileName: string): string => {
  const clean = fileName.trim().toLowerCase();
  const dot = clean.lastIndexOf(".");
  if (dot < 0 || dot === clean.length - 1) return "";
  return clean.slice(dot + 1);
};

/**
 * ⚠️ OXIRIDAGI NUQTA OLIB TASHLANADI: `evil.com.` — HAQIQIY domen
 * (DNS "root" belgisi) va u ro'yxatdagi `evil.com` bilan SATR
 * sifatida mos kelmasdi.
 */
export const normalizeHost = (host: string): string =>
  host.trim().toLowerCase().replace(/\.+$/, "").replace(/^www\./, "");

/**
 * ⚠️ `endsWith` O'ZI YETARLI EMAS: `notevil.com` ham `evil.com` bilan
 * tugaydi va noto'g'ri bloklanardi. Nuqta bilan tekshiriladi.
 */
export const hostMatches = (host: string, list: readonly string[]): boolean => {
  const target = normalizeHost(host);
  return list.some((raw) => {
    const entry = normalizeHost(raw);
    if (!entry) return false;
    return target === entry || target.endsWith(`.${entry}`);
  });
};

export const extractUrls = (text: string): string[] => {
  const found = text.match(URL_REGEX);
  if (!found) return [];
  return [...new Set(found.map((item) => item.replace(/[.,;:!?)\]]+$/, "")))];
};

export const hostOf = (url: string): string | null => {
  try {
    const withScheme = /^https?:\/\//i.test(url) ? url : `http://${url}`;
    return normalizeHost(new URL(withScheme).hostname);
  } catch {
    return null;
  }
};

export interface GuardRules {
  deleteFiles: boolean;
  deleteUrls: boolean;
  blockedHosts: readonly string[];
  allowedHosts: readonly string[];
}

/** Telegram hujjati — faqat kerakli maydonlar. */
export interface FileInput {
  fileName?: string;
  mime?: string;
}

export const inspectFile = (
  file: FileInput,
  rules: GuardRules,
): ThreatVerdict | null => {
  if (!rules.deleteFiles) return null;

  const name = file.fileName?.trim() ?? "";
  const ext = extensionOf(name);

  if (ext && INSTALLER_EXTENSIONS.has(ext)) {
    return { kind: "apk_file", reason: `installer_extension:${ext}` };
  }

  // ⚠️ ZAXIRA: Telegram ba'zan faylni nomsiz yuboradi.
  const mime = file.mime?.trim().toLowerCase() ?? "";
  if (
    mime === "application/vnd.android.package-archive" ||
    mime === "application/x-msdownload" ||
    mime === "application/x-msdos-program"
  ) {
    return { kind: "apk_file", reason: `installer_mime:${mime}` };
  }

  if (ext && ARCHIVE_EXTENSIONS.has(ext)) {
    return { kind: "unknown_file", reason: `archive_extension:${ext}` };
  }

  /**
   * ⚠️ IKKI KENGAYTMALI NOM (`hujjat.apk.pdf`): odam oxirgisini
   * o'qiydi, lekin ichkarida o'rnatma fayl nomi yashiringan —
   * bu chalg'itish usuli.
   */
  const parts = name.toLowerCase().split(".");
  if (parts.length > 2) {
    const hidden = parts.slice(1, -1).find((part) => INSTALLER_EXTENSIONS.has(part));
    if (hidden) {
      return { kind: "apk_file", reason: `double_extension:${hidden}` };
    }
  }

  return null;
};

/**
 * ⚠️ OQ RO'YXAT BIRINCHI: rasmiy domen (`gov.uz`) boshqa qoidaga
 * tushsa ham o'chirilmasligi kerak — MFY xodimining rasmiy
 * havolasini bot yo'q qilib qo'ymasin.
 */
export const inspectUrl = (
  url: string,
  rules: GuardRules,
): ThreatVerdict | null => {
  if (!rules.deleteUrls) return null;

  const host = hostOf(url);
  if (!host) return null;

  if (hostMatches(host, rules.allowedHosts)) return null;

  if (hostMatches(host, rules.blockedHosts)) {
    return { kind: "suspicious_url", reason: "blocked_host", url, urlHost: host };
  }

  if (URL_SHORTENERS.has(host)) {
    return { kind: "shortened_url", reason: "url_shortener", url, urlHost: host };
  }

  /**
   * ⚠️ `@` BELGISI — ALDOV: `https://gov.uz@evil.com` odamga
   * `gov.uz` bo'lib ko'rinadi, lekin `evil.com` ga boradi.
   */
  if (/^https?:\/\/[^/\s]*@/i.test(url)) {
    return { kind: "masked_url", reason: "userinfo_in_url", url, urlHost: host };
  }

  // ⚠️ To'g'ridan-to'g'ri IP — deyarli har doim vaqtinchalik server.
  if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) {
    return { kind: "suspicious_url", reason: "raw_ip_host", url, urlHost: host };
  }

  return null;
};

/**
 * ⚠️ BIRINCHI TOPILGAN YETARLI: xabar baribir BUTUNLAY o'chiriladi,
 * qolgan havolalarni sanash yozuvni shishirardi.
 */
export const inspectText = (
  text: string,
  rules: GuardRules,
): ThreatVerdict | null => {
  if (!rules.deleteUrls || !text) return null;

  for (const url of extractUrls(text)) {
    const verdict = inspectUrl(url, rules);
    if (verdict) return verdict;
  }

  return null;
};
