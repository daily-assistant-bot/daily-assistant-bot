import TelegramBot from "node-telegram-bot-api";
import { startDailyScheduler, sendCurrentSummary } from "../config/scheduler";
import { debugCalendar } from "../services/calendarService";
import { fetchDailyNews } from "../services/newsService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { fetchWeather } from "../services/calendarService";

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

  bot.onText(/\/debug$/, async (msg) => {
    bot.sendMessage(msg.chat.id, "🔍 Probando todos los servicios... espera un momento.");

    const results: string[] = [];

    try {
      const calDebug = await debugCalendar();
      results.push("📅 CALENDAR:\n" + calDebug);
    } catch (e) {
      results.push("📅 CALENDAR ERROR: " + (e as Error).message);
    }

    try {
      const weather = await fetchWeather("Baiona");
      results.push("🌤️ WEATHER: " + (weather || "EMPTY"));
    } catch (e) {
      results.push("🌤️ WEATHER ERROR: " + (e as Error).message);
    }

    try {
      const news = await fetchDailyNews();
      results.push(`📰 NEWS: ${news.length} articles`);
      if (news.length > 0) {
        results.push(`  1. ${news[0].title}`);
      }
    } catch (e) {
      results.push("📰 NEWS ERROR: " + (e as Error).message);
    }

    try {
      const emails = await fetchUnansweredEmails();
      results.push(`✉️ EMAIL: ${emails.length} unread`);
    } catch (e) {
      results.push("✉️ EMAIL ERROR: " + (e as Error).message);
    }

    try {
      const wa = await fetchUnansweredWhatsApp();
      results.push(`📱 WHATSAPP: ${wa.length} messages`);
    } catch (e) {
      results.push("📱 WHATSAPP: not configured");
    }

    const output = results.join("\n\n");
    if (output.length > 4096) {
      bot.sendMessage(msg.chat.id, output.substring(0, 4096));
    } else {
      bot.sendMessage(msg.chat.id, output);
    }
  });

  startDailyScheduler(bot);

  return bot;
}
