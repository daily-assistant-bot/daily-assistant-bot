import * as http from "http";
import dotenv from "dotenv";
dotenv.config();

import { initializeBot } from "./bot/telegram";
import { debugCalendar } from "./services/calendarService";
import TelegramBot from "node-telegram-bot-api";

function main() {
  const requiredVars = ["TELEGRAM_BOT_TOKEN"];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const bot = initializeBot();
  console.log("Bot iniciado y escuchando mensajes...");

  bot.onText(/\/debug/, async (msg) => {
    try {
      const debugInfo = await debugCalendar();
      bot.sendMessage(msg.chat.id, debugInfo);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Debug error: ${(error as Error).message}`);
    }
  });

  const server = http.createServer((req, res) => {
    res.writeHead(200, { "Content-Type": "text/plain" });
    res.end("OK - Daily Assistant Bot is running");
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`HTTP server listening on port ${port} (for Render health check)`);
  });
}

main();
