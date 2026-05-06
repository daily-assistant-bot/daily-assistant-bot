import { WhatsAppItem } from "../types";

export async function fetchUnansweredWhatsApp(): Promise<WhatsAppItem[]> {
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;

  if (!phoneNumberId || !accessToken) {
    console.warn("WhatsApp Business API not configured. Skipping WhatsApp messages.");
    return [];
  }

  try {
    const response = await fetch(
      `https://graph.facebook.com/v20.0/${phoneNumberId}/messages`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      throw new Error(`WhatsApp API returned ${response.status}`);
    }

    const data = await response.json();
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
