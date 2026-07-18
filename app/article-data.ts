export const filters = ["全部", "电子", "超频", "硬件", "游戏与次元"] as const;

export type Filter = (typeof filters)[number];

export type ContentType = "article" | "lab" | "collection";

export type ArticleGalleryItem = {
  src: string;
  alt: string;
  caption: string;
};

export type ArticleSource = {
  label: string;
  href: string;
};

export type ArticleTranslation = {
  title?: string;
  summary?: string;
  tags?: string[];
  contentMarkdown?: string;
  content?: string[];
  contentHtml?: string;
  gallery?: ArticleGalleryItem[];
  sources?: ArticleSource[];
};

export type ArticleTranslations = {
  en?: ArticleTranslation;
};

export type Article = {
  id: string;
  slug?: string;
  contentType: ContentType;
  category: Filter;
  code: string;
  date: string;
  readTime: string;
  title: string;
  summary: string;
  tags: string[];
  content: string[];
  contentMarkdown?: string;
  contentHtml?: string;
  coverUrl?: string | null;
  gallery?: ArticleGalleryItem[];
  sources?: ArticleSource[];
  translations?: ArticleTranslations;
};

export const fallbackArticles: Article[] = [];
