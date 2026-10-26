# 🔗 4Prep saytini Joi'ga ulash

Sayt o'z backend'i / Netlify Functions'da ishlagani uchun ulanish shunday:
montajchi videoni **"Tayyor"** (yoki "Ko'rikka") qo'yganda, sayt Joi'ning
webhook'iga bitta POST so'rov yuboradi. Joi holatni yangilaydi va Farruxbekka
Telegram'ga darhol xabar beradi.

```
Montajchi "Tayyor" bosadi
        │
        ▼
4Prep sayt backend ──POST──▶ Joi /webhook/editor-event ──▶ Telegram'ga xabar
```

## 1-qadam: Joi'ni internetga chiqarish (public URL)

Sayt Joi'ga murojaat qila olishi uchun Joi `localhost`da emas, ochiq manzilda
turishi kerak. Oson yo'llar:
- **Railway** yoki **Render** — `joi/` papkasini deploy qiling, `npm start`
- **VPS** (masalan DigitalOcean) + `pm2 start "npm start"`
- Sinov uchun tez yo'l: `ngrok http 8787` → vaqtinchalik public URL beradi

Natijada Joi manzili bo'ladi, masalan: `https://joi-4prep.up.railway.app`
Webhook to'liq manzili: `https://joi-4prep.up.railway.app/webhook/editor-event`

## 2-qadam: Sayt tomonida sozlash

Saytingiz muhit o'zgaruvchilariga (Netlify → Site settings → Environment)
qo'shing:
```
JOI_WEBHOOK_URL     = https://<joi-manzili>/webhook/editor-event
JOI_WEBHOOK_SECRET  = <Joi .env dagi WEBHOOK_SECRET bilan bir xil>
```

## 3-qadam: Kodni qo'shish

- `notifyJoi.js` — tayyor yordamchi funksiya, backend'ga qo'shing
- `netlify-function-example.js` — Netlify Function namunasi (secret brauzerga
  chiqmasligi uchun)

Montajchi videoni tugatgan joyda shunchaki:
```js
await notifyJoi({ editor: "Aziz", video: "IELTS reels", event: "done" });
```

## Webhook shartnomasi (API contract)

**POST** `/webhook/editor-event`
```json
{
  "secret": "maxfiy-kalit",
  "editor": "Aziz",
  "video": "IELTS reels",   // id (v1) yoki nom bo'lagi
  "event": "done"            // "done" | "review"
}
```
Javob: `{ "ok": true, "updated": "v1" }`

---

**Men tayyorman:** sayt kodini (yoki repo'sini) yuborganingizda, yuqoridagi
`notifyJoi` chaqiruvini montajchi "Tayyor" bosadigan aniq joyga o'zim ulab
beraman — siz faqat deploy qilasiz.
