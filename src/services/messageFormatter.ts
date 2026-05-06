import { DailySummary } from "../types";

export function formatDailyMessage(summary: DailySummary, weather?: string): string {
  const lines: string[] = [];

  const dayName = new Date().toLocaleDateString("es-ES", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  lines.push(`📅 *Buenos días! Resumen del ${dayName}*`);
  lines.push("");

  if (weather) {
    lines.push(`🌤️ *EL TIEMPO*`);
    lines.push("━━━━━━━━━━━━━━━━━━━━");
    lines.push(weather);
    lines.push("");
  }

  lines.push(`📰 *NOTICIAS DEL DÍA*`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  if (summary.news.length === 0) {
    lines.push("No hay noticias disponibles.");
  } else {
    summary.news.forEach((item, i) => {
      lines.push(`${i + 1}. *${item.title}*`);
      if (item.summary) lines.push(`   _${item.summary}_`);
      lines.push(`   [Leer más](${item.url})`);
      lines.push("");
    });
  }

  lines.push(`✅ *TAREAS DEL DÍA*`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
  if (summary.tasks.length === 0) {
    lines.push("No hay tareas programadas para hoy.");
  } else {
    summary.tasks.forEach((task) => {
      lines.push(`⏰ *${task.time}* - ${task.title}`);
      if (task.location) lines.push(`   📍 ${task.location}`);
    });
  }
  lines.push("");

  lines.push(`✉️ *CORREOS PENDIENTES*`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
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

  lines.push(`📱 *WHATSAPP PENDIENTE*`);
  lines.push("━━━━━━━━━━━━━━━━━━━━");
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
