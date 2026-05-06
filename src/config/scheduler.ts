import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { DailySummary } from "../types";
import { fetchDailyNews } from "./newsService";
import { fetchTodaysTasks, fetchWeather } from "./calendarService";
import { fetchUnansweredEmails } from "./emailService";
import { fetchUnansweredWhatsApp } from "./whatsappService";
import { formatDailyMessage } from "./messageFormatter";

const DEFAULT_CITY = process.env.WEATHER_CITY || "Madrid";

async function buildDailySummary(): Promise<{ summary: DailySummary; weather: string }> {
  const today = new Date();

  const [news, tasks, emails, whatsapp, weatherResult] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
    fetchWeather(DEFAULT_CITY),
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

export function startDailyScheduler(bot: TelegramBot): void {
  const cronExpression = "10 6 * * *";

  cron.schedule(cronExpression, async () => {
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
        } catch (error) {
          console.error(`Error sending message to chat ${chatId}:`, error);
        }
      }
    } catch (error) {
      console.error("Error in daily summary job:", error);
    }
  });
}

export { buildDailySummary };
