// netlify/functions/editor-done.js  (NAMUNA)
// ──────────────────────────────────────────────────────────────────────────
// Agar sayt Netlify Functions ishlatsa, montajchi "tayyor" bosganda front-end
// shu funksiyaga POST qiladi, u esa Joi'ga xabar beradi. Shunda JOI_WEBHOOK_SECRET
// brauzerga chiqmaydi (xavfsiz).
//
// Netlify env: JOI_WEBHOOK_URL, JOI_WEBHOOK_SECRET
// ──────────────────────────────────────────────────────────────────────────

import { notifyJoi } from "../../joi/site-integration/notifyJoi.js";

export async function handler(event) {
  if (event.httpMethod !== "POST") {
    return { statusCode: 405, body: "Method Not Allowed" };
  }

  try {
    const { editor, video, status } = JSON.parse(event.body || "{}");
    // status: montajchi tanlagan holat ("done" yoki "review")
    const result = await notifyJoi({ editor, video, event: status });
    return { statusCode: 200, body: JSON.stringify({ ok: true, joi: result }) };
  } catch (err) {
    return { statusCode: 400, body: JSON.stringify({ ok: false, error: err.message }) };
  }
}

// Front-end tomondan chaqirish (montajchi "Tayyor" tugmasini bosganda):
//
//   await fetch("/.netlify/functions/editor-done", {
//     method: "POST",
//     headers: { "Content-Type": "application/json" },
//     body: JSON.stringify({ editor: "Aziz", video: "IELTS reels", status: "done" }),
//   });
