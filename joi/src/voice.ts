import { config, hasVoice } from "./config.js";

/**
 * Ovozli xabarni matnga o'giradi (OpenAI Whisper STT).
 * STT (speech-to-text) — bu Joi ning "miyasi"dan alohida xizmat; miya Claude'da.
 * Agar OPENAI_API_KEY berilmagan bo'lsa, null qaytaradi.
 */
export async function transcribe(
  audio: Buffer,
  filename = "voice.oga",
): Promise<string | null> {
  if (!hasVoice) return null;

  const form = new FormData();
  form.append("file", new Blob([new Uint8Array(audio)]), filename);
  form.append("model", "whisper-1");
  // Asosan o'zbek/rus/ingliz aralashmasi bo'lgani uchun tilni avtomatik aniqlaymiz.

  const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.openaiApiKey}` },
    body: form,
  });

  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Transkripsiya xatosi (${res.status}): ${detail}`);
  }

  const data = (await res.json()) as { text?: string };
  return data.text?.trim() || null;
}
