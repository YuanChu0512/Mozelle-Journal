import type { Metadata } from "next";
import { fallbackArticles } from "../../article-data";
import ArticleReader from "./article-reader";

type ArticlePageProps = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: ArticlePageProps): Promise<Metadata> {
  const { id } = await params;
  const article = fallbackArticles.find((item) => item.id === id);
  const title = article?.title ?? "文章阅读";
  const description = article?.summary ?? "Mozelle Journal 独立文章页面。";

  return {
    title,
    description,
    alternates: { canonical: `/articles/${encodeURIComponent(id)}` },
    openGraph: {
      type: "article",
      title,
      description,
      url: `/articles/${encodeURIComponent(id)}`,
    },
  };
}

export default async function ArticlePage({ params }: ArticlePageProps) {
  const { id } = await params;
  return <ArticleReader articleId={id} />;
}
