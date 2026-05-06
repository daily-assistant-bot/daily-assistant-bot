import cron from "node-cron";
import TelegramBot from "node-telegram-bot-api";
import { DailySummary } from "../types";
import { fetchDailyNews } from "../services/newsService";
import { fetchTodaysTasks } from "../services/calendarService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { formatDailyMessage } from "../services/messageFormatter";

async function buildDailySummary(): Promise<DailySummary> {
  const today = new Date();

  const [news, tasks, emails, whatsapp] = await Promise.allSettled([
    fetchDailyNews(),
    fetchTodaysTasks(),
    fetchUnansweredEmails(),
    fetchUnansweredWhatsApp(),
  ]);

  return {
    date: today.toISOString(),
    news: news.status === "fulfilled" ? news.value : [],
    tasks: tasks.status === "fulfilled" ? tasks.value : [],
    emails: emails.status === "fulfilled" ? emails.value : [],
    whatsapp: whatsapp.status === "fulfilled" ? whatsapp.value : [],
  };
}

export function startDailyScheduler(bot: TelegramBot): void {
  const cronExpression = "10 6 * * *";

  cron.schedule(cronExpression, async () => {
    try {
      const summary = await buildDailySummary();
      const message = formatDailyMessage(summary);

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
