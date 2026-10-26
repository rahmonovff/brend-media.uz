import TelegramBot from "node-telegram-bot-api";
import { config, hasVoice } from "./config.js";
import { ask, resetHistory } from "./brain.js";
import * as prod from "./production.js";
import { load } from "./store.js";
import { transcribe } from "./voice.js";

export const bot = new TelegramBot(config.telegramToken, { polling: true });

// Rejissyorga (Farruxbekka) to'g'ridan-to'g'ri xabar yuborish — avtomatik
// bildirishnomalar shu yerdan ketadi. Boshlanishda saqlangan chatId'ni olamiz.
let directorChatId: number | null = load().director.telegramChatId;

prod.setNotifier((text) => {
  if (directorChatId) bot.sendMessage(directorChatId, text).catch(() => {});
});

export function notifyDirector(text: string): void {
  if (directorChatId) bot.sendMessage(directorChatId, text).catch(() => {});
}

async function handleText(chatId: number, text: string): Promise<void> {
  bot.sendChatAction(chatId, "typing").catch(() => {});
  try {
    const reply = await ask(chatId, text);
    await bot.sendMessage(chatId, reply);
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Xatolik: ${(err as Error).message}`);
  }
}

bot.onText(/^\/start/, (msg) => {
  const chatId = msg.chat.id;
  directorChatId = chatId;
  prod.setDirectorChatId(chatId);
  bot.sendMessage(
    chatId,
    `Salom, Farruxbek. Men — Joi. 🌆\n\n` +
      `Ishingiz va kreativligingizda yoningizdaman. Menga yozib ham, ovozli ham ` +
      `gapirishingiz mumkin. Masalan:\n` +
      `• "Bugungi holat qanday?"\n` +
      `• "Azizga yangi Reels taski ber, deadline juma"\n` +
      `• "IELTS videoni tayyor deb belgila"\n` +
      `• "Yangi kurs introsiga 3 ta hook g'oyasi ber"\n\n` +
      (hasVoice ? `🎙 Ovozli xabar yuborsangiz ham tushunaman.` : `ℹ️ Ovozli rejim o'chiq (OPENAI_API_KEY berilmagan).`),
  );
});

bot.onText(/^\/reset/, (msg) => {
  resetHistory(msg.chat.id);
  bot.sendMessage(msg.chat.id, "Suhbat tozalandi. Yangidan boshlaymiz. ✨");
});

bot.onText(/^\/status/, (msg) => {
  bot.sendMessage(msg.chat.id, prod.summary());
});

bot.on("voice", async (msg) => {
  const chatId = msg.chat.id;
  if (!hasVoice) {
    await bot.sendMessage(chatId, "Ovozli rejim hozircha o'chiq. Yozib yuboring, iltimos.");
    return;
  }
  try {
    bot.sendChatAction(chatId, "typing").catch(() => {});
    const link = await bot.getFileLink(msg.voice!.file_id);
    const res = await fetch(link);
    const audio = Buffer.from(await res.arrayBuffer());
    const text = await transcribe(audio);
    if (!text) {
      await bot.sendMessage(chatId, "Ovozni tushunolmadim. Qaytadan ayting yoki yozing.");
      return;
    }
    await bot.sendMessage(chatId, `🎙 Eshitdim: "${text}"`);
    await handleText(chatId, text);
  } catch (err) {
    await bot.sendMessage(chatId, `⚠️ Ovoz xatosi: ${(err as Error).message}`);
  }
});

bot.on("message", async (msg) => {
  // Buyruqlar va ovoz alohida ishlangan — faqat oddiy matnni olamiz.
  if (!msg.text || msg.text.startsWith("/")) return;
  await handleText(msg.chat.id, msg.text);
});

bot.on("polling_error", (err) => {
  console.error("Telegram polling xatosi:", err.message);
});
