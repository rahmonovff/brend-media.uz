// notifyJoi.js
// ──────────────────────────────────────────────────────────────────────────
// 4Prep production saytining backend'iga (yoki Netlify Function'iga) qo'shiladi.
// Montajchi videoni "tayyor" yoki "ko'rikka" qo'yganda shu funksiyani chaqiring —
// Joi darhol holatni yangilaydi va Farruxbekka Telegram'ga xabar beradi.
//
// Sozlash (sayt muhit o'zgaruvchilari / Netlify env):
//   JOI_WEBHOOK_URL     = https://<joi-manzili>/webhook/editor-event
//   JOI_WEBHOOK_SECRET  = Joi ning .env faylidagi WEBHOOK_SECRET bilan bir xil
// ──────────────────────────────────────────────────────────────────────────

/**
 * @param {object} payload
 * @param {string} payload.editor  Montajchi ismi, masalan "Aziz"
 * @param {string} payload.video   Video nomi yoki id, masalan "IELTS reels" / "v1"
 * @param {"done"|"review"} payload.event  Hodisa turi
 * @param {string} [payload.message]  Ixtiyoriy: tayyor matnli xabar
 */
export async function notifyJoi(payload) {
  const url = process.env.JOI_WEBHOOK_URL;
  const secret = process.env.JOI_WEBHOOK_SECRET;

  if (!url) {
    console.warn("[notifyJoi] JOI_WEBHOOK_URL o'rnatilmagan — xabar yuborilmadi.");
    return { ok: false, skipped: true };
  }

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ secret, ...payload }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) console.warn("[notifyJoi] xato:", res.status, data);
    return data;
  } catch (err) {
    // Joi vaqtincha ishlamasa ham sayt ishlashda davom etsin.
    console.warn("[notifyJoi] ulanib bo'lmadi:", err.message);
    return { ok: false, error: err.message };
  }
}

// ── Ishlatish namunasi (sizning backend kodingizda) ───────────────────────
//
// import { notifyJoi } from "./notifyJoi.js";
//
// // Montajchi videoni tugatganda:
// await notifyJoi({ editor: "Aziz", video: "IELTS reels", event: "done" });
//
// // Ko'rikka qo'yganda:
// await notifyJoi({ editor: "Dilshod", video: "v2", event: "review" });
