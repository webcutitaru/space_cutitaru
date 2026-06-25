import type { MetadataRoute } from "next";
import { allSitemapUrls } from "@/lib/cutitaru/i18n";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://space.cutitaru.com";
  const now = new Date();

  const toolRoutes: MetadataRoute.Sitemap = [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/reviews-extractor`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/image-converter`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/link2pic`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/reelsave`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];

  const cutitaruRoutes: MetadataRoute.Sitemap = allSitemapUrls(`${base}/cutitaru`).map((url) => ({
    url,
    lastModified: now,
    changeFrequency: "monthly" as const,
    priority: url.endsWith("/cutitaru") || url.endsWith("/cutitaru/en") || url.endsWith("/cutitaru/ru") ? 0.95 : 0.8,
  }));

  return [...toolRoutes, ...cutitaruRoutes];
}
