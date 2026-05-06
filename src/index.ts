import * as http from "http";
import dotenv from "dotenv";
dotenv.config();

import { initializeBot } from "./bot/telegram";
import { fetchTodaysTasks } from "./services/calendarService";

function main() {
  const requiredVars = ["TELEGRAM_BOT_TOKEN"];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const bot = initializeBot();
  console.log("Bot iniciado y escuchando mensajes...");

  const server = http.createServer(async (req, res) => {
    res.setHeader("Content-Type", "application/json");

    if (req.url === "/debug/calendar") {
      try {
        const tasks = await fetchTodaysTasks();
        res.writeHead(200);
        res.end(JSON.stringify({ tasks, clientEmail: process.env.GOOGLE_CLIENT_EMAIL, hasKey: !!process.env.GOOGLE_PRIVATE_KEY?.substring(0, 20) }, null, 2));
      } catch (error) {
        res.writeHead(500);
        res.end(JSON.stringify({ error: (error as Error).message }));
      }
    } else if (req.url === "/debug/env") {
      res.writeHead(200);
      res.end(JSON.stringify({
        TELEGRAM_BOT_TOKEN: process.env.TELEGRAM_BOT_TOKEN ? "set" : "missing",
        TELEGRAM_USER_IDS: process.env.TELEGRAM_USER_IDS ? "set" : "missing",
        NEWSAPI_KEY: process.env.NEWSAPI_KEY ? "set" : "missing",
        GOOGLE_CLIENT_EMAIL: process.env.GOOGLE_CLIENT_EMAIL || "missing",
        GOOGLE_PRIVATE_KEY: process.env.GOOGLE_PRIVATE_KEY ? "set (len=" + process.env.GOOGLE_PRIVATE_KEY.length + ")" : "missing",
        OPENWEATHER_API_KEY: process.env.OPENWEATHER_API_KEY ? "set" : "missing",
        WEATHER_CITY: process.env.WEATHER_CITY || "missing",
        EMAIL_USER: process.env.EMAIL_USER || "missing",
        EMAIL_HOST: process.env.EMAIL_HOST || "missing",
      }, null, 2));
    } else {
      res.writeHead(200);
      res.end(JSON.stringify({ status: "OK", endpoints: ["/debug/calendar", "/debug/env"] }));
    }
  });

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => {
    console.log(`HTTP server listening on port ${port} (for Render health check)`);
  });
}

main();
