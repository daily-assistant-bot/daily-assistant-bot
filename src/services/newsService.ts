import https from "https";
import { NewsItem } from "../types";

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

export async function fetchDailyNews(): Promise<NewsItem[]> {
  const apiKey = process.env.NEWSAPI_KEY;

  if (!apiKey) {
    return [];
  }

  try {
    const today = new Date().toISOString().split("T")[0];
    const url =
      `https://newsapi.org/v2/everything?` +
      `q=general&language=en&sortBy=publishedAt&` +
      `from=${today}&pageSize=5&apiKey=${apiKey}`;

    const raw = await httpsGet(url);
    const parsed = JSON.parse(raw);

    if (parsed.status !== "ok") {
      throw new Error(`NewsAPI error: ${parsed.message || "unknown"}`);
    }

    return parsed.articles
      .filter((article: Record<string, string | null | Record<string, string>>) => article.title && article.url)
      .map((article: Record<string, string | null | Record<string, string>>) => ({
        title: article.title as string,
        source: (article.source as Record<string, string>)?.name || "Unknown",
        url: article.url as string,
        summary: article.description || undefined,
      }));
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}
