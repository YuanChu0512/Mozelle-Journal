"use client";

/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useMemo, useState } from "react";
import {
  fallbackArticles,
  type Article,
} from "../../article-data";
import AmbientEffects from "../../ambient-effects";
import { articleCopy, categoryLabels, localizeArticle } from "../../i18n";
import { LanguageReassembly, useLanguageSwitcher } from "../../language-switcher";
import {
  ThemeTransition,
  useThemeTransition,
  type Theme,
} from "../../theme-transition";

export default function ArticleReader({ articleId }: { articleId: string }) {
  const fallbackArticle = fallbackArticles.find((item) => item.id === articleId) ?? null;
  const [article, setArticle] = useState<Article | null>(fallbackArticle);
  const [status, setStatus] = useState<"loading" | "ready" | "missing">(
    fallbackArticle ? "ready" : "loading",
  );
  const [theme, setTheme] = useState<Theme>("day");
  const { transitioning, transitionTarget, toggleTheme } = useThemeTransition(
    theme,
    setTheme,
  );
  const {
    language,
    switching: languageSwitching,
    targetLanguage,
    toggleLanguage,
  } = useLanguageSwitcher();
  const copy = articleCopy[language];
  const displayedArticle = useMemo(
    () => article ? localizeArticle(article, language) : null,
    [article, language],
  );

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

  return (
    <main
      className={`site-shell article-page-shell theme-${theme} ${transitioning ? "is-switching" : ""} ${languageSwitching ? "is-language-switching" : ""}`}
      data-language={language}
    >
      <AmbientEffects />
      <LanguageReassembly active={languageSwitching} target={targetLanguage} />
      <ThemeTransition active={transitioning} target={transitionTarget} />
      <span className="article-reading-progress" aria-hidden="true" />
      <header className="article-site-header">
        <a className="brand" href="/" aria-label={copy.homeLabel}>
          <span className="brand-mark" aria-hidden="true"><span /></span>
          <span className="brand-copy">
            <strong>Mozelle Journal</strong>
            <small>{"// ARTICLE"}</small>
          </span>
        </a>
        <span className="article-header-code">
          {displayedArticle?.code ?? "ARTICLE / LOADING"}
        </span>
        <div className="article-header-actions">
          <a href="/#articles" aria-label={copy.back}>
            <span className="article-back-full" data-lang-token>{copy.back}</span>
            <span className="article-back-short" data-lang-token>{copy.backShort}</span>
          </a>
          <button
            className="article-language-toggle"
            type="button"
            onClick={toggleLanguage}
            disabled={languageSwitching}
            aria-label={copy.languageLabel}
          >
            {language === "zh" ? "EN" : "中"}
          </button>
          <button
            type="button"
            onClick={toggleTheme}
            disabled={transitioning || languageSwitching}
            aria-label={copy.themeLabel}
          >
            {theme === "day" ? "DAY" : "NIGHT"}
          </button>
        </div>
      </header>

      {status === "loading" && (
        <section className="article-state" aria-live="polite">
          <span>ARTICLE / SYNCING</span>
          <h1 data-lang-token>{copy.loading}</h1>
          <div className="article-state-line" />
        </section>
      )}

      {status === "missing" && (
        <section className="article-state">
          <span>ARTICLE / 404</span>
          <h1 data-lang-token>{copy.missing}</h1>
          <p data-lang-token>{copy.missingBody}</p>
          <a href="/#articles"><span data-lang-token>{copy.back}</span> →</a>
        </section>
      )}

      {status === "ready" && displayedArticle && (
        <article className="article-reader">
          <header className="article-reader-hero">
            <div className="article-reader-meta">
              <span>{displayedArticle.code}</span>
              <span data-lang-token>{categoryLabels[language][displayedArticle.category]}</span>
              <span>{displayedArticle.date}</span>
              <span>{displayedArticle.readTime}</span>
            </div>
            <h1 data-lang-token>{displayedArticle.title}</h1>
            <p data-lang-token>{displayedArticle.summary}</p>
            <div className="article-reader-signal" aria-hidden="true">
              <span />
              <span />
              <span />
            </div>
          </header>

          {displayedArticle.coverUrl ? (
            <figure className="article-reader-cover">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={displayedArticle.coverUrl} alt="" decoding="async" />
            </figure>
          ) : (
            <div className="article-reader-visual" aria-hidden="true">
              <span className="article-reader-orbit" />
              <span className="article-reader-core">{displayedArticle.code.split("/")[0].trim()}</span>
              <span className="article-reader-coordinate">MOZELLE / ARCHIVE / {displayedArticle.date}</span>
            </div>
          )}

          {displayedArticle.contentHtml ? (
            <div
              className="article-reader-content article-rich-content"
              dangerouslySetInnerHTML={{ __html: displayedArticle.contentHtml }}
            />
          ) : (
            <div className="article-reader-content">
              {displayedArticle.content.map((paragraph) => <p data-lang-token key={paragraph}>{paragraph}</p>)}
            </div>
          )}

          <footer className="article-reader-footer">
            <div>
              {displayedArticle.tags.map((tag) => <span data-lang-token key={tag}>#{tag}</span>)}
            </div>
            <a href="/#articles"><span data-lang-token>{copy.other}</span> <span aria-hidden="true">↗</span></a>
          </footer>
        </article>
      )}
    </main>
  );
}
