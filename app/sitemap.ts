import type { MetadataRoute } from "next";
import { fallbackArticles } from "./article-data";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    {
      url: "https://www.mozelle.top/",
      changeFrequency: "weekly",
      priority: 1,
    },
    ...fallbackArticles.map((article) => ({
      url: `https://www.mozelle.top/articles/${encodeURIComponent(article.id)}`,
      lastModified: article.date.replaceAll(".", "-"),
      changeFrequency: "monthly" as const,
      priority: 0.75,
    })),
  ];
}
