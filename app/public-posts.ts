import type { Article } from "./article-data";

export async function loadManagedPublicPosts(): Promise<Article[] | null> {
  const apiOrigin = process.env.API_INTERNAL_ORIGIN?.replace(/\/$/, "");
  if (!apiOrigin) return null;

  try {
    const response = await fetch(`${apiOrigin}/api/posts`, {
      cache: "no-store",
      headers: { accept: "application/json" },
    });
    if (!response.ok) return null;
    const payload = await response.json() as { posts?: Article[] };
    return Array.isArray(payload.posts) ? payload.posts : [];
  } catch {
    return null;
  }
}
