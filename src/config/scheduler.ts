import TelegramBot from "node-telegram-bot-api";
import { DailySummary } from "../types";
import { fetchDailyNews } from "../services/newsService";
import { fetchTodaysTasks, fetchWeather } from "../services/calendarService";
import { fetchUnansweredEmails } from "../services/emailService";
import { fetchUnansweredWhatsApp } from "../services/whatsappService";
import { formatDailyMessage } from "../services/messageFormatter";

function getTimeInMadrid() {
  const now = new Date();
  const madridStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const madrid = new Date(madridStr);
  return { hour: madrid.getHours(), minute: madrid.getMinutes() };
}

async function buildDailySummary(): Promise<{ summary: DailySummary; weather: string }> {
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

  return { summary, weather };
}

function startDailyScheduler(bot: TelegramBot): void {
  console.log("Scheduler: daily message set for 06:10 Europe/Madrid");
  let lastTriggeredDay = "";

  setInterval(async () => {
    const madrid = getTimeInMadrid();
    const todayKey = new Date().toDateString();

    if (madrid.hour === 6 && madrid.minute === 10 && todayKey !== lastTriggeredDay) {
      lastTriggeredDay = todayKey;
      console.log("Scheduler: running daily job at 06:10 Madrid");
      try {
        const { summary, weather } = await buildDailySummary();
        const message = formatDailyMessage(summary, weather);

        const chatIds = process.env.TELEGRAM_USER_IDS?.split(",") || [];
        for (const chatId of chatIds) {
          try {
            await bot.sendMessage(chatId.trim(), message, { parse_mode: "Markdown" });
            console.log(`Daily message sent to ${chatId}`);
          } catch (error) {
            console.error(`Error sending to ${chatId}:`, error);
          }
        }
      } catch (error) {
        console.error("Error in daily summary job:", error);
      }
    }
  }, 30_000);
}

async function sendCurrentSummary(bot: TelegramBot, chatId: number): Promise<void> {
  console.log("/status: building summary...");
  const { summary, weather } = await buildDailySummary();
  const message = formatDailyMessage(summary, weather);
  console.log("/status: sending message (length:", message.length, ")");
  await bot.sendMessage(chatId, message, { parse_mode: "Markdown" });
}

export { startDailyScheduler, sendCurrentSummary };
