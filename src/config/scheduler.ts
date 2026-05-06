import TelegramBot from "node-telegram-bot-api";
import { DailySummary } from "../types";
import { fetchDailyNews } from "../services/newsService";
import { fetchTodaysTasks, fetchWeather } from "../services/calendarService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { formatDailyMessage } from "../services/messageFormatter";

function getTimeInMadrid(): { hour: number; minute: number } {
  const now = new Date();
  const madridTime = new Date(now.toLocaleString("en-US", { timeZone: "Europe/Madrid" }));
  return {
    hour: madridTime.getHours(),
    minute: madridTime.getMinutes(),
  };
}

async function buildDailySummary(): Promise<{ summary: DailySummary; weather: string }> {
  const today = new Date();

  const [news, tasks, emails, whatsapp, weatherResult] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
    fetchWeather("Baiona"),
  ]);

  const summary: DailySummary = {
    date: today.toISOString(),
    news: news.status === "fulfilled" ? news.value : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    emails: emails.status === "fulfilled" ? emails.value : [],
    whatsapp: whatsapp.status === "fulfilled" ? whatsapp.value : [],
  };

  const weather = weatherResult.status === "fulfilled" ? weatherResult.value : "";

  return { summary, weather };
}

function startDailyScheduler(bot: TelegramBot): void {
  console.log("Scheduler: daily message set for 06:10 Europe/Madrid");

  setInterval(async () => {
    const madrid = getTimeInMadrid();

    if (madrid.hour === 6 && madrid.minute === 10) {
      console.log("Scheduler: running daily job...");
      try {
        const { summary, weather } = await buildDailySummary();
        const message = formatDailyMessage(summary, weather);

        const chatIds = process.env.TELEGRAM_USER_IDS?.split(",") || [];

        if (chatIds.length === 0) {
          console.warn("No Telegram chat IDs configured. Skipping daily message.");
          return;
        }

        for (const chatId of chatIds) {
          try {
            await bot.sendMessage(chatId.trim(), message, {
              parse_mode: "Markdown",
              disable_web_page_preview: false,
            });
            console.log(`Daily message sent to ${chatId}`);
          } catch (error) {
            console.error(`Error sending message to chat ${chatId}:`, error);
          }
        }
      } catch (error) {
        console.error("Error in daily summary job:", error);
      }
    }
  }, 60_000);
}

async function sendCurrentSummary(bot: TelegramBot, chatId: number): Promise<void> {
  const [news, tasks, emails, whatsapp, weatherResult] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
    fetchWeather("Baiona"),
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

export { startDailyScheduler, sendCurrentSummary };
