import { config, hasVoice } from "./config.js";
import "./bot.js";
import { startServer } from "./server.js";

console.log("🌆 Joi ishga tushdi.");
console.log(`   Model: ${config.model}`);
console.log(`   Ovozli rejim: ${hasVoice ? "yoqilgan ✅" : "o'chiq (OPENAI_API_KEY yo'q)"}`);
console.log("   Telegram botga /start yozing.");

startServer();

process.on("unhandledRejection", (reason) => {
  console.error("Ushlanmagan rad etish:", reason);
});
