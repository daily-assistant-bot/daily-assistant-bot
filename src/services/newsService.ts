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
    const url =
      `https://newsapi.org/v2/top-headlines?` +
      `country=es&language=es&pageSize=5&apiKey=${apiKey}`;

    console.log("News: fetching top headlines...");
    const raw = await httpsGet(url);
    const parsed = JSON.parse(raw);

    if (parsed.status !== "ok") {
      throw new Error(`NewsAPI error: ${parsed.message || "unknown"}`);
    }

    const articles = parsed.articles || [];
    console.log(`News: found ${articles.length} headlines`);

    return articles
      .filter((article: Record<string, string | null | Record<string, string>>) => article.title && article.url)
      .map((article: Record<string, string | null | Record<string, string>>) => ({
        title: article.title as string,
        source: (article.source as Record<string, string>)?.name || "Unknown",
        url: article.url as string,
        summary: article.description || undefined,
      }));
  } catch (error) {
    console.error("Error fetching news:", (error as Error).message);
    return [];
  }
}
