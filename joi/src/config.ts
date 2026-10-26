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
  anthropicApiKey: required("ANTHROPIC_API_KEY"),
  openaiApiKey: process.env.OPENAI_API_KEY || "",
  port: Number(process.env.PORT || 8787),
  webhookSecret: process.env.WEBHOOK_SECRET || "",
  model: process.env.JOI_MODEL || "claude-opus-5-5",
};

export const hasVoice = Boolean(config.openaiApiKey);
