# 🌆 Joi — Farruxbekning AI yordamchisi

Blade Runner'dagi Joi kabi, ish va kreativlik bo'yicha shaxsiy AI hamroh.
4Prep media jamoangizni boshqaradi, ovozli/yozma buyruqlarni tushunadi va
montaj tugaganda sizga avtomatik xabar beradi.

## Nima qila oladi

- 🎙 **Ovozli + yozma** — Telegram orqali gapirasiz yoki yozasiz
- 🎬 **Production boshqaruvi** — montajchilar, videolar, tasklar, deadline'lar
- 🔔 **Avtomatik xabar** — montajchi videoni tugatsa/ko'rikka qo'ysa, sizga xabar keladi
- 🎯 **Task berish** — "Azizga yangi Reels ber" desangiz, tizimda biriktiradi
- 💡 **Kreativ yordam** — g'oya, ssenariy, hook, sarlavha, montaj maslahati
- 🌐 **4Prep sayti ulanishi** — sayt webhook orqali Joi'ga hodisa yuboradi

## Nega Telegram (va iPhone haqida halol gap)

iPhone (iOS) juda yopiq — bitta ilova boshqa ilovalarni (Spotify, Instagram)
to'liq boshqara olmaydi, Apple ruxsat bermaydi. Shuning uchun eng ishonchli va
real yo'l — **Telegram bot**: u iPhone'da ovozli xabar, yozma matn va
push-bildirishnomalarni mukammal beradi. Ilovalarni ovoz bilan ochish uchun esa
iPhone'ning o'z **Siri Shortcuts** tizimidan foydalanamiz (pastda qo'llanma).

---

## O'rnatish

### 1. Telegram bot yarating
1. Telegram'da [@BotFather](https://t.me/BotFather) ga yozing → `/newbot`
2. Bot nomi va username bering
3. Berilgan **tokenni** nusxalang

### 2. API kalitlar
- **Claude** (majburiy, Joi ning miyasi): https://console.anthropic.com
- **OpenAI** (ixtiyoriy, ovozni matnga o'girish): https://platform.openai.com
  (bo'sh qoldirsangiz, ovozli rejim o'chadi — faqat yozma ishlaydi)

### 3. Loyihani sozlang
```bash
cd joi
cp .env.example .env     # .env ni ochib tokenlarni kiriting
npm install
npm run init-data        # namunaviy jamoa ma'lumotini yaratadi
npm start
```

Konsolda `🌆 Joi ishga tushdi` chiqadi. Telegram'da botingizga **/start** yozing —
o'sha chat Joi uchun "rejissyor" sifatida saqlanadi (xabarlar shu yerga keladi).

---

## Foydalanish

Telegram'da shunchaki gapiring yoki yozing:

| Siz aytasiz | Joi qiladi |
|---|---|
| "Bugungi holat qanday?" | Butun jarayon xulosasi |
| "Azizga IELTS reelsni ber, deadline juma" | Taskni biriktiradi |
| "Studiya turini ko'rikka qo'y" | Holatni o'zgartiradi + xabar beradi |
| "Dilshod nima ustida ishlayapti?" | Montajchi yuklamasi |
| "Yangi kurs introsiga 3 ta hook g'oyasi ber" | Kreativ takliflar |
| 🎙 ovozli xabar | Tushunadi va bajaradi |

Buyruqlar: `/start`, `/status`, `/reset` (suhbatni tozalash).

---

## 🎙 Siri Shortcuts — iPhone 15 Pro Max'da ovoz bilan boshqarish

iPhone'da ovoz bilan ilovalarni ochish va Joi'ga gapirish uchun **Быстрые
команды (Shortcuts)** ilovasidan foydalaning:

### A) "Joi'ga ayt" — ovoz bilan Joi'ga buyruq
1. Shortcuts → **+** → yangi команда
2. **"Диктовать текст"** (Dictate Text) amalini qo'shing
3. **"Открыть приложение" → Telegram** yoki Telegram botga havola ochish amalini qo'shing
4. Nomini **"Joi'ga ayt"** qo'ying
5. Endi: *"Siri, Joi'ga ayt"* → gapirasiz → Telegram ochiladi

> Eng silliq yo'l: botingizga `t.me/<bot_username>` havolasini "Открыть URL"
> amali bilan oching, diktovka matnini clipboard'ga qo'ying.

### B) Ilovalarni ovoz bilan ochish
Har biri uchun alohida qisqa команда:
- **"Spotify och"** → *Открыть приложение → Spotify*
- **"Instagram och"** → *Открыть приложение → Instagram*
- **"Telegram och"** → *Открыть приложение → Telegram*

Keyin: *"Siri, Spotify och"* deysiz, bo'ldi.

### C) Spotify bilan chuqurroq (ovozli)
Spotify Siri'ni qo'llab-quvvatlaydi: *"Siri, Spotify'da [qo'shiq] qo'y"* —
to'g'ridan-to'g'ri ishlaydi, qo'shimcha sozlash shart emas.

---

## 🌐 4Prep production saytini ulash

Sayt montaj hodisasini Joi'ga webhook orqali yuboradi. Montajchi videoni
tugatganda sayt quyidagini chaqiradi:

```bash
curl -X POST http://SERVER:8787/webhook/editor-event \
  -H "Content-Type: application/json" \
  -d '{
    "secret": "<.env dagi WEBHOOK_SECRET>",
    "editor": "Aziz",
    "video": "IELTS",
    "event": "done"
  }'
```

Joi darhol videoni "✅ Tayyor" qiladi va sizga Telegram'ga xabar beradi.

> `event`: `done` (tugatdi) yoki `review` (ko'rikka qo'ydi).
> `video`: id (`v1`) yoki video nomining bir qismi.

Saytning kodini yuborganingizda, shu webhook chaqiruvini aniq joyiga ulab beraman.

---

## Fayllar tuzilishi

```
joi/
├── src/
│   ├── index.ts        # ishga tushirish
│   ├── bot.ts          # Telegram (ovoz + matn + bildirishnoma)
│   ├── brain.ts        # Claude — Joi ning miyasi va tool'lari
│   ├── production.ts   # montajchi/video/task mantiqi
│   ├── store.ts        # JSON ma'lumot bazasi
│   ├── voice.ts        # ovozni matnga o'girish (Whisper)
│   └── server.ts       # 4Prep sayt webhook'i
└── data/
    └── production.sample.json   # namunaviy jamoa
```

## Keyingi qadamlar
- [ ] 4Prep production sayt kodini ulash (siz faylni yuborasiz)
- [ ] Ma'lumotni JSON o'rniga real bazaga (Postgres) ko'chirish
- [ ] Montajchilar uchun ham bot interfeysi (ular tugadi deb bossa, avtomatik)
- [ ] Eslatmalar: deadline yaqinlashganda Joi o'zi ogohlantiradi
