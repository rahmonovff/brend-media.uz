import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Konfiguratsiya xatosi: "${name}" o'rnatilmagan. .env faylini to'ldiring (.env.example dan nusxa oling).`,
    );
  }
  return value;
}

export const config = {
  telegramToken: required("TELEGRAM_BOT_TOKEN"),
  geminiApiKey: required("GEMINI_API_KEY"),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  port: Number(process.env.PORT || 8787),
  webhookSecret: process.env.WEBHOOK_SECRET || "",
  // Bepul Gemini modeli. Agar "model topilmadi" xatosi chiqsa, .env da
  // JOI_MODEL=gemini-2.0-flash yoki gemini-1.5-flash ni sinab ko'ring.
  model: process.env.JOI_MODEL || "gemini-2.5-flash",
};

export const hasVoice = Boolean(config.openaiApiKey);
