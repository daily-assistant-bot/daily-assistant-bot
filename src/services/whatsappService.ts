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
    console.warn("WhatsApp Business API not configured. Skipping WhatsApp messages.");
    return [];
  }

  try {
    const url = `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`;
    const raw = await httpsGet(url, accessToken);
    const data = JSON.parse(raw);
    const messages = data.data || [];

    return messages
      .filter((msg: Record<string, string>) => msg.from && msg.text)
      .map((msg: Record<string, string>) => ({
        from: msg.from,
        message: msg.text.substring(0, 100),
        timestamp: new Date(Number(msg.timestamp) * 1000).toLocaleString("es-ES"),
      }));
  } catch (error) {
    console.error("Error fetching WhatsApp messages:", error);
    return [];
  }
}
