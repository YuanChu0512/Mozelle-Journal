"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import {
  fallbackArticles,
  type Article,
} from "../../article-data";
import AmbientEffects from "../../ambient-effects";

type Theme = "day" | "night";

export default function ArticleReader({ articleId }: { articleId: string }) {
  const fallbackArticle = fallbackArticles.find((item) => item.id === articleId) ?? null;
  const [article, setArticle] = useState<Article | null>(fallbackArticle);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    fallbackArticle ? "ready" : "loading",
  );
  const [theme, setTheme] = useState<Theme>("day");

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("mozelle-theme");
    if (savedTheme !== "day" && savedTheme !== "night") return;
    document.documentElement.dataset.theme = savedTheme;
    let active = true;
    queueMicrotask(() => {
      if (active) setTheme(savedTheme);
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/posts", {
      headers: { accept: "application/json" },
      signal: controller.signal,
    })
      .then((response) => {
        if (!response.ok) throw new Error("文章服务暂不可用");
        return response.json() as Promise<{ posts?: Article[] }>;
      })
      .then((payload) => {
        const matched = payload.posts?.find((item) => item.id === articleId) ?? null;
        if (matched) {
          setArticle(matched);
          setStatus("ready");
          return;
        }
        if (!fallbackArticle) setStatus("missing");
      })
      .catch((error: unknown) => {
        if (error instanceof DOMException && error.name === "AbortError") return;
        setStatus(fallbackArticle ? "ready" : "missing");
      });
    return () => controller.abort();
  }, [articleId, fallbackArticle]);

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "day" ? "night" : "day";
    document.documentElement.dataset.theme = nextTheme;
    window.localStorage.setItem("mozelle-theme", nextTheme);
    setTheme(nextTheme);
  };

  return (
    <main className={`site-shell article-page-shell theme-${theme}`}>
      <AmbientEffects />
      <span className="article-reading-progress" aria-hidden="true" />
      <header className="article-site-header">
        <a className="brand" href="/" aria-label="返回 Mozelle Journal 首页">
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy">
            <strong>Mozelle Journal</strong>
            <small>{"// ARTICLE"}</small>
          </span>
        </a>
        <span className="article-header-code">
          {article?.code ?? "ARTICLE / LOADING"}
        </span>
        <div className="article-header-actions">
          <a href="/#articles" aria-label="返回文章列表">
            <span className="article-back-full" aria-hidden="true">返回文章列表</span>
            <span className="article-back-short" aria-hidden="true">返回</span>
          </a>
          <button type="button" onClick={toggleTheme} aria-label="切换日间与夜间主题">
            {theme === "day" ? "DAY" : "NIGHT"}
          </button>
        </div>
      </header>

      {status === "loading" && (
        <section className="article-state" aria-live="polite">
          <span>ARTICLE / SYNCING</span>
          <h1>正在载入文章</h1>
          <div className="article-state-line" />
        </section>
      )}

      {status === "missing" && (
        <section className="article-state">
          <span>ARTICLE / 404</span>
          <h1>没有找到这篇文章</h1>
          <p>文章可能尚未发布，或者地址已经发生变化。</p>
          <a href="/#articles">返回文章列表 →</a>
        </section>
      )}

      {status === "ready" && article && (
        <article className="article-reader">
          <header className="article-reader-hero">
            <div className="article-reader-meta">
              <span>{article.code}</span>
              <span>{article.category}</span>
              <span>{article.date}</span>
              <span>{article.readTime}</span>
            </div>
            <h1>{article.title}</h1>
            <p>{article.summary}</p>
            <div className="article-reader-signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </header>

          {article.coverUrl ? (
            <figure className="article-reader-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={article.coverUrl} alt="" decoding="async" />
            </figure>
          ) : (
            <div className="article-reader-visual" aria-hidden="true">
              <span className="article-reader-orbit" />
              <span className="article-reader-core">{article.code.split("/")[0].trim()}</span>
              <span className="article-reader-coordinate">MOZELLE / ARCHIVE / {article.date}</span>
            </div>
          )}

          {article.contentHtml ? (
            <div
              className="article-reader-content article-rich-content"
              dangerouslySetInnerHTML={{ __html: article.contentHtml }}
            />
          ) : (
            <div className="article-reader-content">
              {article.content.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
            </div>
          )}

          <footer className="article-reader-footer">
            <div>
              {article.tags.map((tag) => <span key={tag}>#{tag}</span>)}
            </div>
            <a href="/#articles">阅读其他文章 <span aria-hidden="true">↗</span></a>
          </footer>
        </article>
      )}
    </main>
  );
}
