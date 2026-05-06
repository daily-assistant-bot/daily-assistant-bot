import { google } from "googleapis";
import { TaskItem } from "../types";

async function getCalendarClient() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      type: "service_account",
      project_id: process.env.GOOGLE_PROJECT_ID || "",
      private_key_id: process.env.GOOGLE_PRIVATE_KEY_ID || "",
      private_key: (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
      client_email: process.env.GOOGLE_CLIENT_EMAIL || "",
      client_id: process.env.GOOGLE_CLIENT_ID || "",
      universe_domain: "googleapis.com",
    },
    scopes: ["https://www.googleapis.com/auth/calendar.readonly"],
  });

  return google.calendar({ version: "v3", auth });
}

export async function fetchTodaysTasks(): Promise<TaskItem[]> {
  try {
    const calendar = await getCalendarClient();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startOfDay.toISOString(),
      timeMax: endOfDay.toISOString(),
      orderBy: "startTime",
      singleEvents: true,
    });

    const events = response.data.items || [];

    return events
      .filter((event) => event.summary)
      .map((event) => ({
        title: event.summary as string,
        time: event.start?.dateTime
          ? new Date(event.start.dateTime).toLocaleTimeString("es-ES", {
              hour: "2-digit",
              minute: "2-digit",
            })
          : "Todo el d\xeda",
        location: event.location || undefined,
      }));
  } catch (error) {
    console.error("Error fetching calendar tasks:", error);
    return [];
  }
}
