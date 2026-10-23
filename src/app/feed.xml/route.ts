import { NextResponse } from "next/server";
import { getNews } from "@/lib/data/news";
import { SITE_URL } from "@/lib/siteUrl";

export const runtime = "edge";
export const revalidate = 3600; // Cache feed for 1 hour

function escapeXml(unsafe: string): string {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

export async function GET() {
  const newsItems = await getNews().catch(() => []);
  const buildDate = new Date().toUTCString();

  const itemsXml = newsItems
    .slice(0, 30)
    .map((item) => {
      const pubDate = item.publishedAt
        ? new Date(item.publishedAt).toUTCString()
        : buildDate;
      const link = item.url.startsWith("http") ? item.url : `${SITE_URL}${item.url}`;
      return `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(link)}</link>
      <guid isPermaLink="false">${escapeXml(item.id || link)}</guid>
      <pubDate>${pubDate}</pubDate>
      <description>${escapeXml(item.snippet || item.title)}</description>
      ${item.source ? `<source url="${escapeXml(link)}">${escapeXml(item.source)}</source>` : ""}
    </item>`;
    })
    .join("\n");

  const rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>a1score — Football Market Intelligence &amp; News</title>
    <link>${SITE_URL}</link>
    <description>Latest football market valuations, transfer intelligence, live fixtures, and breaking news.</description>
    <language>en-US</language>
    <lastBuildDate>${buildDate}</lastBuildDate>
    <atom:link href="${SITE_URL}/feed.xml" rel="self" type="application/rss+xml" />
${itemsXml}
  </channel>
</rss>`;

  return new NextResponse(rss, {
    status: 200,
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
