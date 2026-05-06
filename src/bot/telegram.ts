import TelegramBot from "node-telegram-bot-api";
import { startDailyScheduler } from "../config/scheduler";
import { fetchTodaysTasks } from "../services/calendarService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { fetchDailyNews } from "../services/newsService";
import { DailySummary } from "../types";
import { formatDailyMessage } from "../services/messageFormatter";

function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  return new TelegramBot(token, { polling: true });
}

async function sendCurrentSummary(bot: TelegramBot, chatId: number): Promise<void> {
  const [news, tasks, emails, whatsapp] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
  ]);

  const summary: DailySummary = {
    date: new Date().toISOString(),
    news: news.status === "fulfilled" ? news.value : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    emails: emails.status === "fulfilled" ? emails.value : [],
    whatsapp: whatsapp.status === "fulfilled" ? whatsapp.value : [],
  };

  const message = formatDailyMessage(summary);

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

export function initializeBot(): TelegramBot {
  const bot = createBot();

  bot.onText(/\/start/, (msg) => {
    const welcome = `\xa1Hola! Soy tu asistente diario.\n\n` +
      `\xa0Cada d\xeda a las 6:10 AM te enviar\xe9:\n` +
      `\ud83d\udcf0 Las noticias m\xe1s relevantes\n` +
      `\u2705 Tus tareas del d\xeda (Google Calendar)\n` +
      `\u2709\ufe0f Correos sin responder\n` +
      `\ud83d\udcf1 Mensajes de WhatsApp pendientes\n\n` +
      `Usa /status para ver tu resumen ahora.`;
    bot.sendMessage(msg.chat.id, welcome);
  });

  bot.onText(/\/status/, (msg) => {
    sendCurrentSummary(bot, msg.chat.id);
  });

  startDailyScheduler(bot);

  return bot;
}
