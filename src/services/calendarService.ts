import https from "https";
import { google } from "googleapis";
import { TaskItem } from "../types";

const GOOGLE_CALENDAR_ID = process.env.GOOGLE_CALENDAR_ID || "info@vitavaga.com";

function getMadridDate() {
  const now = new Date();
  const madridStr = now.toLocaleString("en-US", { timeZone: "Europe/Madrid" });
  const madridDate = new Date(madridStr);
  return {
    full: now,
    startOfDay: new Date(madridDate.getFullYear(), madridDate.getMonth(), madridDate.getDate()),
    endOfDay: new Date(madridDate.getFullYear(), madridDate.getMonth(), madridDate.getDate() + 1),
  };
}

function getCalendarClient() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";

  if (!privateKey || !clientEmail) {
    throw new Error("Missing GOOGLE_PRIVATE_KEY or GOOGLE_CLIENT_EMAIL");
  }

  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: clientEmail,
      private_key: privateKey,
    },
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return google.calendar({ version: "v3", auth });
}

function httpsGet(url: string, token: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(
      url,
      { headers: { Authorization: `Bearer ${token}` } },
      (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => resolve(data));
      },
    ).on("error", reject);
  });
}

export async function debugCalendar(): Promise<string> {
  const lines: string[] = [];

  lines.push(`Client email: ${process.env.GOOGLE_CLIENT_EMAIL || "missing"}`);
  lines.push(`Private key: ${process.env.GOOGLE_PRIVATE_KEY ? "set (len=" + process.env.GOOGLE_PRIVATE_KEY.length + ")" : "missing"}`);
  lines.push(`Calendar ID: ${GOOGLE_CALENDAR_ID}`);

  const calendar = getCalendarClient();
  if (!calendar) {
    lines.push("ERROR: client creation failed");
    return lines.join("\n");
  }

  lines.push("Client created OK");

  try {
    const { startOfDay, endOfDay } = getMadridDate();

    lines.push(`Searching (Madrid): ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const listRes = await calendar.calendarList.list();
    const calendars = listRes.data.items || [];
    lines.push(`Calendars in list: ${calendars.length}`);

    for (const cal of calendars) {
      lines.push(`  📅 ${cal.summary} (${cal.id})`);
    }

    const eventsRes = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: "startTime",
      singleEvents: true,
    });

    const events = eventsRes.data.items || [];
    lines.push(`Events today: ${events.length}`);

    for (const ev of events) {
      lines.push(`  ${ev.summary || "(no title)"} - ${ev.start?.dateTime || ev.start?.date || "no time"}`);
    }

    return lines.join("\n");
  } catch (error) {
    lines.push(`ERROR: ${(error as Error).message}`);
    if ("response" in (error as Record<string, unknown>)) {
      const apiError = error as { response?: { status?: number; data?: string } };
      if (apiError.response) {
        lines.push(`API status: ${apiError.response.status}`);
        const body = apiError.response.data || "";
        lines.push(`Response: ${body.substring(0, 500)}`);
      }
    }
    return lines.join("\n");
  }
}

export async function fetchTodaysTasks(): Promise<TaskItem[]> {
  const calendar = getCalendarClient();
  if (!calendar) return [];

  try {
    const { startOfDay, endOfDay } = getMadridDate();

    const response = await calendar.events.list({
      calendarId: GOOGLE_CALENDAR_ID,
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: "startTime",
      singleEvents: true,
    });

    const events = response.data.items || [];

    return events
      .filter((event): event is typeof event & { summary: string } => !!event.summary)
      .map((event) => ({
        title: event.summary,
        time: event.start?.dateTime
          ? new Date(event.start.dateTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
              timeZone: "Europe/Madrid",
            })
          : "Todo el día",
        location: event.location || undefined,
      }));
  } catch (error) {
    console.error("Google Calendar error:", (error as Error).message);
    return [];
  }
}

export async function fetchWeather(city: string): Promise<string> {
  const apiKey = process.env.OPENWEATHER_API_KEY;

  if (!apiKey) {
    console.warn("OpenWeather: API key not configured");
    return "";
  }

  try {
    const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(city)}&appid=${apiKey}&units=metric&lang=es`;
    console.log("OpenWeather: fetching for", city);
    const raw = await httpsGet(url, "");
    const data = JSON.parse(raw);
    console.log("OpenWeather: response code", data.cod, data.message || "");

    if (data.cod !== 200) {
      throw new Error(data.message || "OpenWeather API error");
    }

    const temp = Math.round(data.main.temp);
    const feelsLike = Math.round(data.main.feels_like);
    const desc = data.weather[0].description;
    const humidity = data.main.humidity;
    const wind = Math.round(data.wind.speed * 3.6);

    return `${data.name}: ${desc}, ${temp}°C (sensación ${feelsLike}°C), humedad ${humidity}%, viento ${wind} km/h`;
  } catch (error) {
    const err = error as Error;
    console.error(`OpenWeather: error - ${err.message}`);
    return "";
  }
}
