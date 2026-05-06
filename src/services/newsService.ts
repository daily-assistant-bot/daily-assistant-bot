import { NewsItem } from "../types";

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

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`NewsAPI returned ${response.status}`);
    }

    const data = await response.json();

    return data.articles
      .filter((article: Record<string, string | null>) => article.title && article.url)
      .map((article: Record<string, string | null>) => ({
        title: article.title as string,
        source: article.source?.name || "Unknown",
        url: article.url as string,
        summary: article.description || undefined,
      }));
  } catch (error) {
    console.error("Error fetching news:", error);
    return [];
  }
}
