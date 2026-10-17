# Viloyat shtabi — Bot

MFY guruhlarini **kuzatuvchi** va xodimlardan **muammo qabul qiluvchi**
Telegram bot.

**Stack:** grammY · TypeScript · Node 20+

---

## Bot nima qiladi

### 1. Guruh kuzatuvi (asosiy vazifa)

```
MFY guruhi → bot o'qiydi → serverga uzatadi → AI tahlil qiladi
```

⚠️ **Bot guruhda hech narsa yozmaydi.** Javob bermaydi, reaksiya
qo'ymaydi, buyruqlarga javob qaytarmaydi. Guruhdagilar botning
o'qiyotganini sezmaydi ham.

Sabab: bot yozgan har xabar o'zi ham guruh yozishmasiga tushadi va
keyingi tahlilda "guruhda muammo bor" degan signalga aylanib ketardi —
o'z aksini muammo deb topish.

⚠️ **Faqat `isOfficial` guruhdan.** Bu belgi admin panelda qo'yiladi va
aynan **kuzatuvga rozilik** ma'nosini bildiradi. Reyestrda bot
tasodifan qo'shilgan, test va umuman begona guruhlar ham bor —
ularning yozishmasini o'qish mumkin emas.

### 2. Xavfsizlik qalqoni

```
zararli fayl/havola → bot O'CHIRADI → panelda dalil bilan ko'rinadi
```

⚠️ **O'chirish — yozish emas.** Bot guruhga ogohlantirish
**yozmaydi**: na "zararli fayl o'chirildi", na boshqa javob. Aks
holda o'sha xabar guruh yozishmasiga tushib, keyingi AI tahlilida
"guruhda muammo bor" degan signalga aylanardi. Ma'muriyat nima
bo'lganini **paneldan** ko'radi.

⚠️ **Qalqon `isOfficial` ga bog'liq emas.** `isOfficial` —
yozishmani **o'qishga** rozilik; qalqon esa aholini himoya qiladi.
Guruh kuzatuvga yopiq bo'lsa ham undagi odamlarni virusdan himoya
qilish mumkin, shuning uchun belgi alohida (`guardEnabled`).

⚠️ **Standart holda o'chiq.** Ma'muriyat uni panelda ataylab
yoqadi — o'chirilgan xabarni tiklab bo'lmaydi.

Nima aniqlanadi (`features/guard/detect.ts`):

| Tur | Misol |
|---|---|
| O'rnatma fayl | `.apk`, `.exe`, `.msi`, `.bat`, ikki kengaytmali nom |
| Noma'lum fayl | arxivlar (`.zip`, `.rar`) — ichini bilib bo'lmaydi |
| Qisqartirilgan havola | `bit.ly`, `t.co` — manzil ko'rinmaydi |
| Yashirilgan manzil | `https://gov.uz@evil.com` |
| Shubhali havola | qora ro'yxatdagi domen, IP manzil |
| Firibgarlik matni | "davlat yordami" aldovi — **havola bilan birga** |

⚠️ **Firibgarlik matni IKKI dalil talab qiladi**: ibora **va**
ishonchsiz tashqi havola. Havolasiz xabar hech qachon o'chirilmaydi —
"yordam", "ariza", "ma'lumotlaringizni kiriting" MFY guruhining
oddiy so'zlari va raisning haqiqiy e'loni ham shundan tuzilgan.
Oq ro'yxatdagi domenga ketadigan havola dalil hisoblanmaydi.

⚠️ **Bot admin bo'lishi shart.** Aks holda Telegram o'chirishga
ruxsat bermaydi va hodisa panelda "o'chirilmadi" deb ko'rinadi —
bu holat **ataylab** ko'rsatiladi, aks holda ma'muriyat "himoya
ishlayapti" deb o'ylab yuraverardi.

### 3. Muammo yuborish

```
📨 tugma → kategoriya tanlanadi → matn yoziladi → shtab paneliga tushadi
```

Javob shu chatga qaytadi (server yuboradi).

---

## Botda Prisma yo'q

⚠️ **Bot bazaga to'g'ridan-to'g'ri ulanmaydi.** Bu eng muhim qaror,
sababi uchta:

1. **Qoida ikki joyda takrorlanmasligi kerak.** "Guruh rasmiymi",
   "kategoriya faolmi", "bu telegram kimga bog'langan" — har biri
   biznes qoidasi va u **serverda** yashaydi. Botda nusxasi bo'lsa,
   ikkisi albatta ajralib ketadi.

2. **Schema o'zgarishi botni sindirmasligi kerak.** Prisma schema'si
   ikki repoda nusxalanganda, server migratsiyasidan keyin botni ham
   yangilash kerak bo'lib qoladi — va u esdan chiqadi, keyin bot jim
   ishlamay turadi.

3. **Ulanish pool'i.** Har bot nusxasi bazaga o'z pool'ini ochib,
   `max_connections` ni yeydi. HTTP esa stateless.

Bot serverga `X-Bot-Key` bilan kiradi. **JWT yo'q**: bot foydalanuvchi
emas, ishonchli **xizmat**.

---

## Ishga tushirish

```bash
cp .env.example .env     # BOT_TOKEN va BOT_API_KEY ni to'ldiring
npm install
npm run dev
```

| Sozlama | |
|---|---|
| `BOT_TOKEN` | @BotFather dan |
| `API_URL` | server manzili (`http://localhost:4000/api`) |
| `BOT_API_KEY` | **server bilan ayni qiymat** |

### Telegram tomonida sozlash

1. @BotFather → `/setprivacy` → **Disabled**

   ⚠️ **Majburiy.** Privacy mode yoqilgan bo'lsa bot guruhda faqat
   o'ziga yo'llangan xabarlarni ko'radi — ya'ni kuzatuv **umuman
   ishlamaydi** va buni hech qanday xato ko'rsatmaydi.

2. Botni MFY guruhiga qo'shing.

3. Admin panelda guruhni **rasmiy** deb belgilang (avval MFY ga
   biriktirib).

⚠️ **Bot o'tmishga qaramaydi.** Bot bu kod joylashtirilishidan oldin
a'zo bo'lgan guruh ro'yxatga **o'zi tushmaydi** — Telegram o'tgan
hodisalarni qayta yubormaydi. Bunday guruh unda biror harakat
bo'lgandan keyin tushadi (botning huquqi o'zgarishi yoki oddiy xabar).

---

## Tuzilma

```
src/
├── main.ts                     handler TARTIBI shu yerda
├── config/env.ts               muhit — modul yuklanganda tekshiriladi
├── shared/
│   ├── api.ts                  serverga so'rovlar (xato OTILMAYDI)
│   ├── context.ts              sessiya (XOTIRADA)
│   ├── keyboards.ts            oddiy klaviatura
│   └── texts.ts                barcha matn (YAGONA manba)
└── features/
    ├── group-watch/            kuzatuv — birinchi handler
    ├── issue-submit/           ikki bosqichli oqim
    └── start/                  /start, /help
```

---

## Nozik joylar

### Handler tartibi

```
1. guruh kuzatuvi   ← guruh xabarlari BU YERDA tugaydi
2. buyruqlar        ← faqat shaxsiy chat
3. muammo oqimi
4. tanilmagan matn  ← oxirida
```

⚠️ **Guruh kuzatuvi birinchi**: u guruh xabarlarini o'zida to'xtatadi.
Aks holda guruhdagi "📨 Muammo yuborish" degan tasodifiy xabar oqimni
**guruhda** ochib yuborardi.

⚠️ **Tanilmagan matn oxirida**: yuqoriga qo'yilsa, har xabarga
"tushunilmadi" deb javob berib, qolgan handler'larga navbat tegmasdi.

### Menyu tugmasi oqim holatidan OLDIN tekshiriladi

Odam kategoriya tanlab, matn yozish o'rniga "Yordam" tugmasini bosishi
mumkin. Agar holat avval tekshirilsa, bosilgan tugmaning **matni**
("ℹ️ Yordam") muammo mazmuni bo'lib ketardi — va u shtab paneliga
shundayligicha tushardi.

Shuning uchun: menyu tugmasi bosilsa, oqim **tashlab ketilgan** deb
hisoblanadi va holat tozalanadi.

### Kategoriya nom bo'yicha topiladi

Oddiy klaviatura tugmasi — **matnli xabar**, ya'ni bizga faqat nom
qaytadi, `id` emas. Qidiruv **faqat faol** kategoriyalar orasidan:
klaviatura **mijozda** qoladi va odam uni ochiq qoldirib, kategoriya
o'chirilgandan keyin tugmani bosishi mumkin.

### `my_chat_member` so'ralishi shart

```ts
allowed_updates: ["message", "my_chat_member"]
```

⚠️ `my_chat_member` standart `allowed_updates` ro'yxatida **yo'q**.
So'ralmasa guruh reyestrining asosiy manbasi ishlamay qoladi — guruhlar
faqat tasodifiy xabar orqali ro'yxatga tushardi.

### Rasmiy guruhlar keshi — 2 daqiqa

Faol guruhda daqiqada o'nlab xabar bo'lishi mumkin va har biri uchun
serverga borish so'rovlar sonini xabar soniga tenglashtirardi.

⚠️ **Muddat qisqa**: rasmiy belgi panelda istalgan payt olib tashlanishi
mumkin va o'shandan keyingi xabar yozilmasligi kerak. Uzoq kesh
"rozilik qaytarib olindi, lekin bot hali ham o'qiyapti" degan holatni
tug'dirardi — bu eng jiddiy xato.

### Sessiya xotirada

Sessiyada faqat oqimning **yarim yo'li** turadi (kategoriya tanlandi,
matn hali yozilmagan) va u bir necha daqiqa yashaydi. Bot qayta ishga
tushsa, odam tugmani qaytadan bosadi — bu yo'qotish emas.

Oqim **30 daqiqadan** keyin eskirgan deb hisoblanadi: odam kategoriya
tanlab, botni tashlab ketishi mumkin va bir hafta o'tib yozgan narsasi
"muammo matni" bo'lib ketmasligi kerak.

### Xato otilmaydi

`api.ts` dagi har chaqiruv `{ ok, data, error }` qaytaradi. Telegram
handler ichida **otilgan** xato grammY tomonidan ushlanadi-u,
foydalanuvchi **hech narsa ko'rmaydi**: u xabar yozib, javob kutib
qoladi.

### Uzun matn kesilmaydi

Chegaradan oshsa, foydalanuvchiga **qayta yozish** taklif qilinadi.
Kesilsa odam yozganining yarmi jimgina yo'qolardi va u buni bilmasdi.

Chegaralar (10–1500) serverdagi `BotSubmitDto` bilan **ayni**. Ikkisi
ajralsa, bot qabul qilgan matn serverda rad etilib, foydalanuvchi
"yuborildi" deb o'ylab qolardi.

---

## Sana va summa

Botdan chiqadigan sana panellardagi bilan **bir xil** bo'lishi shart.
Hozircha bot sana ko'rsatmaydi (javoblarni server yuboradi) — kerak
bo'lsa, formatlovchi `shared/` da **bitta** joyda yoziladi.

⚠️ `toLocaleDateString()` va qo'lda yig'ilgan `${day}.${month}.${year}`
**taqiqlangan**: natija kod ishlayotgan muhitning locale'iga bog'liq.
