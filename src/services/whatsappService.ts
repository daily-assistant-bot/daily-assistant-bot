import https from "https";
import { WhatsAppItem } from "../types";

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

export async function fetchUnansweredWhatsApp(): Promise<WhatsAppItem[]> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp: API not configured. Skipping.");
    return [];
  }

  console.log("WhatsApp: fetching recent messages...");

  try {
    const now = Math.floor(Date.now() / 1000);
    const since = now - 86400;

    const url =
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages` +
      `?fields=from,to,body,timestamp,type` +
      `&filter(unread)=true` +
      `&access_token=${accessToken}`;

    const raw = await httpsGet(url, accessToken);
    const data = JSON.parse(raw);
    const messages = data.data || [];

    console.log(`WhatsApp: found ${messages.length} messages`);

    return messages
      .filter((msg: Record<string, string>) => msg.from && (msg.body || msg.text))
      .map((msg: Record<string, string>) => ({
        from: msg.from,
        message: (msg.body || msg.text || "").substring(0, 100),
        timestamp: new Date(Number(msg.timestamp) * 1000).toLocaleString("es-ES"),
      }));
  } catch (error) {
    console.error("WhatsApp API error:", (error as Error).message);
    return [];
  }
}
