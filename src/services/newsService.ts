import https from "https";
import { NewsItem } from "../types";

const RSS_FEEDS = [
  "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",
  "https://www.rtve.es/noticias/atom.xml",
];

function fetchFeed(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https.get(url, { headers: { "User-Agent": "Mozilla/5.0" } }, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        https.get(res.headers.location as string, (res2) => {
          let data = "";
          res2.on("data", (chunk) => (data += chunk));
          res2.on("end", () => resolve(data));
        }).on("error", reject);
        return;
      }
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => resolve(data));
    }).on("error", reject);
  });
}

function extractItemsFromXML(xml: string, source: string): NewsItem[] {
  const items: NewsItem[] = [];
  const itemRegex = /<item[^>]*>([\s\S]*?)<\/item>/g;
  const entryRegex = /<entry[^>]*>([\s\S]*?)<\/entry>/g;

  let match: RegExpExecArray | null;

  while ((match = itemRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = content.match(/<link[^>]*href="([^"]*)"[^>]*\/>/)?.[1] || content.match(/<link[^>]*>([\s\S]*?)<\/link>/)?.[1]?.trim();
    const desc = content.match(/<description[^>]*>([\s\S]*?)<\/description>/)?.[1]?.replace(/<[^>]*>/g, "").trim();

    if (title) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        source,
        url: link || "",
        summary: desc?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || undefined,
      });
    }

    if (items.length >= 3) break;
  }

  while ((match = entryRegex.exec(xml)) !== null) {
    const content = match[1];
    const title = content.match(/<title[^>]*>([\s\S]*?)<\/title>/)?.[1]?.trim();
    const link = content.match(/<link[^>]*href="([^"]*)"/)?.[1];
    const summary = content.match(/<summary[^>]*>([\s\S]*?)<\/summary>/)?.[1]?.replace(/<[^>]*>/g, "").trim();

    if (title) {
      items.push({
        title: title.replace(/<!\[CDATA\[|\]\]>/g, "").trim(),
        source,
        url: link || "",
        summary: summary?.replace(/<!\[CDATA\[|\]\]>/g, "").trim() || undefined,
      });
    }

    if (items.length >= 3) break;
  }

  return items;
}

export async function fetchDailyNews(): Promise<NewsItem[]> {
  console.log("News: fetching RSS feeds...");
  const allItems: NewsItem[] = [];

  const results = await Promise.allSettled(
    RSS_FEEDS.map(async (url) => {
      const source = url.includes("elpais") ? "El País" : "RTVE";
      const raw = await fetchFeed(url);
      const items = extractItemsFromXML(raw, source);
      console.log(`News: ${source} returned ${items.length} items`);
      return items;
    }),
  );

  for (const result of results) {
    if (result.status === "fulfilled") {
      allItems.push(...result.value);
    } else {
      console.error("News: RSS feed error:", (result as PromiseRejectedResult).reason);
    }
  }

  const seen = new Set<string>();
  const unique = allItems.filter((item) => {
    if (seen.has(item.title)) return false;
    seen.add(item.title);
    return true;
  });

  console.log(`News: returning ${unique.length} unique articles`);
  return unique.slice(0, 5);
}
