"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Language } from "./i18n";

const TOKEN_LIMIT = 36;

export function useLanguageSwitcher() {
  const [language, setLanguage] = useState<Language>("zh");
  const [switching, setSwitching] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<Language>("en");
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const scheduledTimers = timers.current;
    const saved = window.localStorage.getItem("mozelle-language");
    const initial: Language = saved === "en" ? "en" : "zh";
    const root = document.documentElement;
    root.dataset.language = initial;
    root.lang = initial === "en" ? "en" : "zh-CN";
    let active = true;
    queueMicrotask(() => {
      if (active) setLanguage(initial);
    });
    return () => {
      active = false;
      scheduledTimers.forEach((timer) => window.clearTimeout(timer));
      document.querySelectorAll<HTMLElement>("[data-lang-animate]").forEach((node) => {
        delete node.dataset.langAnimate;
        node.style.removeProperty("--lang-order");
      });
      delete root.dataset.languageSwitching;
    };
  }, []);

  const toggleLanguage = (event: MouseEvent<HTMLButtonElement>) => {
    if (switching) return;
    const next: Language = language === "zh" ? "en" : "zh";
    const root = document.documentElement;
    const rect = event.currentTarget.getBoundingClientRect();
    root.style.setProperty("--language-x", `${rect.left + rect.width / 2}px`);
    root.style.setProperty("--language-y", `${rect.top + rect.height / 2}px`);

    const visibleTokens = Array.from(
      document.querySelectorAll<HTMLElement>("[data-lang-token]"),
    ).filter((node) => {
      const bounds = node.getBoundingClientRect();
      return bounds.width > 0 && bounds.height > 0 && bounds.bottom > 0 && bounds.top < window.innerHeight && bounds.right > 0 && bounds.left < window.innerWidth;
    }).slice(0, TOKEN_LIMIT);

    visibleTokens.forEach((node, index) => {
      node.dataset.langAnimate = "true";
      node.style.setProperty("--lang-order", String(index % 7));
    });
    root.dataset.languageSwitching = next;
    setTargetLanguage(next);
    setSwitching(true);

    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const swapDelay = reducedMotion ? 0 : 210;
    const totalDuration = reducedMotion ? 160 : 720;
    timers.current.push(window.setTimeout(() => {
      setLanguage(next);
      root.dataset.language = next;
      root.lang = next === "en" ? "en" : "zh-CN";
      window.localStorage.setItem("mozelle-language", next);
    }, swapDelay));
    timers.current.push(window.setTimeout(() => {
      visibleTokens.forEach((node) => {
        delete node.dataset.langAnimate;
        node.style.removeProperty("--lang-order");
      });
      delete root.dataset.languageSwitching;
      setSwitching(false);
    }, totalDuration));
  };

  return { language, switching, targetLanguage, toggleLanguage };
}

export function LanguageReassembly({
  active,
  target,
}: {
  active: boolean;
  target: Language;
}) {
  return (
    <div className={`language-reassembly ${active ? "is-active" : ""}`} aria-hidden="true">
      <span className="language-reassembly-axis axis-x" />
      <span className="language-reassembly-axis axis-y" />
      <span className="language-fragment fragment-1">{target === "en" ? "中" : "A"}</span>
      <span className="language-fragment fragment-2">{target === "en" ? "文" : "Z"}</span>
      <span className="language-fragment fragment-3">{target === "en" ? "字" : "TYPE"}</span>
      <span className="language-fragment fragment-4">{target === "en" ? "形" : "LANG"}</span>
      <span className="language-fragment fragment-5">{target === "en" ? "语" : "GLYPH"}</span>
      <span className="language-fragment fragment-6">{target === "en" ? "言" : "TEXT"}</span>
      <span className="language-reassembly-core">
        <small>LANGUAGE MATRIX / TEXT REBUILD</small>
        <strong>{target === "en" ? "ENGLISH" : "中文"}</strong>
      </span>
    </div>
  );
}
