import * as http from "http";
import dotenv from "dotenv";
dotenv.config();

import { initializeBot } from "./bot/telegram";
import { debugCalendar, fetchTodaysTasks, fetchWeather } from "./services/calendarService";
import { fetchDailyNews } from "./services/newsService";
import { fetchUnansweredEmails, debugEmail } from "./services/emailService";
import { fetchUnansweredWhatsApp } from "./services/whatsappService";
import { formatDailyMessage } from "./services/messageFormatter";
import TelegramBot from "node-telegram-bot-api";

function createTimeout<T>(ms: number, label: string): Promise<T> {
  return new Promise((_, reject) => {
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
}

async function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([promise, createTimeout<T>(ms, label)]);
}

function main() {
  const requiredVars = ["TELEGRAM_BOT_TOKEN"];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const bot = initializeBot();
  console.log("Bot iniciado y escuchando mensajes...");

  bot.onText(/\/test$/, async (msg) => {
    const lines: string[] = [];

    lines.push(`OPENWEATHER_API_KEY: ${process.env.OPENWEATHER_API_KEY ? "set (len=" + process.env.OPENWEATHER_API_KEY.length + ")" : "MISSING"}`);
    lines.push(`NEWSAPI_KEY: ${process.env.NEWSAPI_KEY ? "set" : "MISSING"}`);
    lines.push(`EMAIL_USER: ${process.env.EMAIL_USER || "MISSING"}`);
    lines.push("");

    console.log("=== /test command started ===");

    try {
      const weather = await withTimeout(fetchWeather("Baiona"), 8000, "weather");
      lines.push("🌤️ Clima: " + (weather || "no disponible"));
      console.log("✅ weather done:", weather);
    } catch (e) {
      lines.push("🌤️ Clima ERROR: " + (e as Error).message);
      console.log("❌ weather error:", (e as Error).message);
    }

    try {
      const news = await withTimeout(fetchDailyNews(), 8000, "news");
      lines.push(`📰 Noticias: ${news.length} artículos`);
      if (news.length > 0) lines.push(`  1. ${news[0].title}`);
      console.log("✅ news done:", news.length, "articles");
    } catch (e) {
      lines.push("📰 Noticias ERROR: " + (e as Error).message);
      console.log("❌ news error:", (e as Error).message);
    }

    try {
      const tasks = await withTimeout(fetchTodaysTasks(), 8000, "calendar");
      lines.push(`✅ Tareas: ${tasks.length} hoy`);
      tasks.forEach((t) => lines.push(`  ${t.time} - ${t.title}`));
      console.log("✅ calendar done:", tasks.length, "tasks");
    } catch (e) {
      lines.push("✅ Tareas ERROR: " + (e as Error).message);
      console.log("❌ calendar error:", (e as Error).message);
    }

    try {
      const emails = await withTimeout(fetchUnansweredEmails(), 8000, "email");
      lines.push(`✉️ Emails: ${emails.length} sin leer`);
      console.log("✅ email done:", emails.length, "emails");
    } catch (e) {
      lines.push("✉️ Emails ERROR: " + (e as Error).message);
      console.log("❌ email error:", (e as Error).message);
    }

    try {
      const wa = await withTimeout(fetchUnansweredWhatsApp(), 8000, "whatsapp");
      lines.push(`📱 WhatsApp: ${wa.length} mensajes`);
      console.log("✅ whatsapp done:", wa.length, "messages");
    } catch (e) {
      lines.push("📱 WhatsApp: no configurado");
      console.log("ℹ️ whatsapp not configured");
    }

    console.log("=== /test command finished ===");
    bot.sendMessage(msg.chat.id, lines.join("\n\n"));
  });

  bot.onText(/\/emaildebug$/, async (msg) => {
    bot.sendMessage(msg.chat.id, "🔍 Comprobando email... espera.");
    try {
      const info = await debugEmail();
      if (info.length > 4096) {
        bot.sendMessage(msg.chat.id, info.substring(0, 4096));
      } else {
        bot.sendMessage(msg.chat.id, info);
      }
    } catch (e) {
      bot.sendMessage(msg.chat.id, `Email debug error: ${(e as Error).message}`);
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
