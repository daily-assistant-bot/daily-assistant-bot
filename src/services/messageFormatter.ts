import { DailySummary } from "../types";

export function formatDailyMessage(summary: DailySummary): string {
  const lines: string[] = [];

  const dayName = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  lines.push(`\ud83d\udcc5 *Buenos d\xedas! Resumen del ${dayName}*`);
  lines.push("");

  lines.push(`\ud83d\udcf0 *NOTICIAS DEL D\xcdA*`);
  lines.push("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  if (summary.news.length === 0) {
    lines.push("No hay noticias disponibles.");
  } else {
    summary.news.forEach((item, i) => {
      lines.push(`${i + 1}. *${item.title}*`);
      if (item.summary) lines.push(`   _${item.summary}_`);
      lines.push(`   [Leer m\xe1s](${item.url})`);
      lines.push("");
    });
  }

  lines.push(`\u2705 *TAREAS DEL D\xcdA*`);
  lines.push("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  if (summary.tasks.length === 0) {
    lines.push("No hay tareas programadas para hoy.");
  } else {
    summary.tasks.forEach((task) => {
      lines.push(`\u23f0 *${task.time}* - ${task.title}`);
      if (task.location) lines.push(`   \ud83d\udccd ${task.location}`);
    });
  }
  lines.push("");

  lines.push(`\u2709\ufe0f *CORREOS PENDIENTES*`);
  lines.push("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  if (summary.emails.length === 0) {
    lines.push("No hay correos nuevos sin responder.");
  } else {
    summary.emails.forEach((email, i) => {
      lines.push(`${i + 1}. *De:* ${email.from}`);
      lines.push(`   *Asunto:* ${email.subject}`);
      lines.push(`   *Fecha:* ${email.date}`);
      lines.push("");
    });
  }

  lines.push(`\ud83d\udcf1 *WHATSAPP PENDIENTE*`);
  lines.push("\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501\u2501");
  if (summary.whatsapp.length === 0) {
    lines.push("No hay mensajes de WhatsApp pendientes.");
  } else {
    summary.whatsapp.forEach((msg, i) => {
      lines.push(`${i + 1}. *De:* ${msg.from}`);
      lines.push(`   _"${msg.message}"_`);
      lines.push(`   _${msg.timestamp}_`);
      lines.push("");
    });
  }

  return lines.join("\n");
}
