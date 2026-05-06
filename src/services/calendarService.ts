import https from "https";
import { google } from "googleapis";
import { TaskItem } from "../types";

function getCalendarClient() {
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n");
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL || "";

  if (!privateKey || !clientEmail) {
    console.error("Google Calendar: missing GOOGLE_PRIVATE_KEY or GOOGLE_CLIENT_EMAIL");
    return null;
  }

  try {
    const auth = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey,
      },
      scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
    });

    return google.calendar({ version: "v3", auth });
  } catch (err) {
    console.error("Google Calendar: failed to create client", err);
    return null;
  }
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

export async function fetchTodaysTasks(): Promise<TaskItem[]> {
  console.log("Google Calendar: attempting to fetch today's tasks...");

  const calendar = getCalendarClient();

  if (!calendar) {
    console.error("Google Calendar: client creation failed");
    return [];
  }

  try {
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    console.log(`Google Calendar: searching from ${startOfDay.toISOString()} to ${endOfDay.toISOString()}`);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: "startTime",
      singleEvents: true,
    });

    const events = response.data.items || [];
    console.log(`Google Calendar: found ${events.length} events`);

    if (events.length > 0) {
      console.log(`Google Calendar: first event = ${JSON.stringify(events[0].summary)}`);
    }

    return events
      .filter((event): event is typeof event & { summary: string } => !!event.summary)
      .map((event) => ({
        title: event.summary,
        time: event.start?.dateTime
          ? new Date(event.start.dateTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Todo el día",
        location: event.location || undefined,
      }));
  } catch (error) {
    const err = error as Error;
    console.error(`Google Calendar: error - ${err.message}`);
    if ("response" in (error as Record<string, unknown>)) {
      const apiError = error as { response?: { status?: number; statusText?: string; data?: string } };
      if (apiError.response) {
        console.error(`Google Calendar: API responded ${apiError.response.status} ${apiError.response.statusText}`);
        console.error(`Google Calendar: response body: ${apiError.response.data}`);
      }
    }
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
    const raw = await httpsGet(url, "");
    const data = JSON.parse(raw);

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
