import TelegramBot from "node-telegram-bot-api";
import { startDailyScheduler, buildDailySummary } from "../config/scheduler";
import { fetchTodaysTasks, fetchWeather } from "../services/calendarService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { fetchDailyNews } from "../services/newsService";
import { DailySummary } from "../types";
import { formatDailyMessage } from "../services/messageFormatter";

const DEFAULT_CITY = process.env.WEATHER_CITY || "Baiona";

function createBot(): TelegramBot {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    throw new Error("TELEGRAM_BOT_TOKEN is required");
  }

  return new TelegramBot(token, { polling: true });
}

async function sendCurrentSummary(bot: TelegramBot, chatId: number): Promise<void> {
  const [news, tasks, emails, whatsapp, weatherResult] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
    fetchWeather(DEFAULT_CITY),
  ]);

  const summary: DailySummary = {
    date: new Date().toISOString(),
    news: news.status === "fulfilled" ? news.value : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    emails: emails.status === "fulfilled" ? emails.value : [],
    whatsapp: whatsapp.status === "fulfilled" ? whatsapp.value : [],
  };

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : "";
  const message = formatDailyMessage(summary, weather);

  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

export function initializeBot(): TelegramBot {
  const bot = createBot();

  bot.onText(/\/start/, (msg) => {
    const welcome = `¡Hola! Soy tu asistente diario.\n\n` +
      `Cada día a las 6:10 AM te enviaré:\n` +
      `📰 Las noticias más relevantes\n` +
      `🌤️ El tiempo en ${DEFAULT_CITY}\n` +
      `✅ Tus tareas del día (Google Calendar)\n` +
      `✉️ Correos sin responder\n` +
      `📱 Mensajes de WhatsApp pendientes\n\n` +
      `Usa /status para ver tu resumen ahora.`;
    bot.sendMessage(msg.chat.id, welcome);
  });

  bot.onText(/\/status/, (msg) => {
    sendCurrentSummary(bot, msg.chat.id);
  });

  startDailyScheduler(bot);

  return bot;
}
