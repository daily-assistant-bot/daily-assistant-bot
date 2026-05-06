import TelegramBot from "node-telegram-bot-api";
import { startDailyScheduler, sendCurrentSummary } from "../config/scheduler";
import { debugCalendar } from "../services/calendarService";

function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  return new TelegramBot(token, { polling: true });
}

export function initializeBot(): TelegramBot {
  const bot = createBot();

  bot.onText(/\/start/, (msg) => {
    const welcome = `¡Hola! Soy tu asistente diario.\n\n` +
      `Cada día a las 6:10 AM te enviaré:\n` +
      `📰 Las noticias más relevantes\n` +
      `🌤️ El tiempo en Baiona\n` +
      `✅ Tus tareas del día (Google Calendar)\n` +
      `✉️ Correos sin responder\n` +
      `📱 Mensajes de WhatsApp pendientes\n\n` +
      `Usa /status para ver tu resumen ahora.`;
    bot.sendMessage(msg.chat.id, welcome);
  });

  bot.onText(/\/status/, (msg) => {
    sendCurrentSummary(bot, msg.chat.id);
  });

  bot.onText(/\/debug/, async (msg) => {
    try {
      const debugInfo = await debugCalendar();
      bot.sendMessage(msg.chat.id, debugInfo);
    } catch (error) {
      bot.sendMessage(msg.chat.id, `Debug error: ${(error as Error).message}`);
    }
  });

  startDailyScheduler(bot);

  return bot;
}
