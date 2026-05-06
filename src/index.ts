import dotenv from "dotenv";
dotenv.config();

import { initializeBot } from "./bot/telegram";

function main() {
  const requiredVars = ["TELEGRAM_BOT_TOKEN"];
  const missing = requiredVars.filter((v) => !process.env[v]);

  if (missing.length > 0) {
    console.error(`Faltan variables de entorno: ${missing.join(", ")}`);
    process.exit(1);
  }

  const bot = initializeBot();
  console.log("Bot iniciado y escuchando mensajes...");
}

main();
