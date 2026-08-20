import type { MetadataRoute } from "next";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://space.cutitaru.com";
  const now = new Date();

  return [
    { url: base, lastModified: now, changeFrequency: "monthly", priority: 1 },
    { url: `${base}/reviews-extractor`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/image-converter`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/link2pic`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/reelsave`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
    { url: `${base}/etsy-analyzer`, lastModified: now, changeFrequency: "weekly", priority: 0.9 },
  ];
}
