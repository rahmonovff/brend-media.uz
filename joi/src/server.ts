import express from "express";
import { config } from "./config.js";
import * as prod from "./production.js";
import { notifyDirector } from "./bot.js";

/**
 * 4Prep production sayti (yoki boshqa tizim) montaj hodisalarini shu yerga
 * yuboradi. Masalan montajchi videoni tugatganda sayt quyidagiga POST qiladi:
 *
 *   POST /webhook/editor-event
 *   { "secret": "...", "editor": "Aziz", "video": "IELTS", "event": "done" }
 *
 * Joi holatni yangilaydi va Farruxbekka avtomatik xabar beradi.
 */
export function startServer(): void {
  const app = express();
  app.use(express.json());

  app.get("/health", (_req, res) => {
    res.json({ ok: true, service: "joi", time: new Date().toISOString() });
  });

  app.post("/webhook/editor-event", (req, res) => {
    const { secret, editor, video, event, message } = req.body ?? {};

    if (config.webhookSecret && secret !== config.webhookSecret) {
      return res.status(401).json({ ok: false, error: "secret noto'g'ri" });
    }

    // Agar video topilsa, holatni yangilaymiz (bu avtomatik bildirishnoma beradi).
    if (video && (event === "done" || event === "review")) {
      const found =
        prod.videoById(String(video)) ??
        prod
          .listVideos()
          .find((v) => v.title.toLowerCase().includes(String(video).toLowerCase()));
      if (found) {
        prod.setStatus(found.id, event);
        return res.json({ ok: true, updated: found.id });
      }
    }

    // Aks holda shunchaki xabar uzatamiz.
    const text =
      message ??
      `🔔 Hodisa: ${editor ?? "montajchi"} — "${video ?? "?"}" (${event ?? "yangilanish"}).`;
    notifyDirector(String(text));
    res.json({ ok: true, relayed: true });
  });

  app.listen(config.port, () => {
    console.log(`🌐 Webhook server: http://localhost:${config.port}`);
  });
}
