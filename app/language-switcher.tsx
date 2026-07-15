"use client";

import { useEffect, useRef, useState, type MouseEvent } from "react";
import type { Language } from "./i18n";

const FULL_TOKEN_LIMIT = 16;
const FULL_GLYPH_LIMIT = 72;
const LITE_TOKEN_LIMIT = 10;
const LITE_GLYPH_LIMIT = 40;

type GlyphPhase = "decompose" | "reassemble";

type GlyphCandidate = {
  character: string;
  endOffset: number;
  startOffset: number;
  textNode: Text;
};

function sampleGlyphs(node: HTMLElement, limit: number) {
  const candidates: GlyphCandidate[] = [];
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT);
  let textNode = walker.nextNode() as Text | null;

  while (textNode) {
    const candidateNode = textNode;
    const value = textNode.nodeValue ?? "";
    let textOffset = 0;
    Array.from(value).forEach((character) => {
      const startOffset = textOffset;
      textOffset += character.length;
      if (!character.trim()) return;
      candidates.push({
        character,
        endOffset: textOffset,
        startOffset,
        textNode: candidateNode,
      });
    });
    textNode = walker.nextNode() as Text | null;
  }

  if (candidates.length <= limit) return candidates;
  return Array.from({ length: limit }, (_, index) => (
    candidates[Math.min(
      candidates.length - 1,
      Math.floor((index + 0.5) * candidates.length / limit),
    )]
  ));
}

function isTransparentColor(color: string) {
  const normalized = color.replaceAll(" ", "").toLowerCase();
  return normalized === "transparent"
    || normalized === "#0000"
    || normalized === "rgba(0,0,0,0)";
}

function isVisibleToken(node: HTMLElement) {
  const bounds = node.getBoundingClientRect();
  return bounds.width > 0
    && bounds.height > 0
    && bounds.bottom > 0
    && bounds.top < window.innerHeight
    && bounds.right > 0
    && bounds.left < window.innerWidth;
}

function createGlyphLayer(
  nodes: HTMLElement[],
  phase: GlyphPhase,
  glyphLimit: number,
) {
  const layer = document.createElement("div");
  layer.className = `language-glyph-layer is-${phase}`;
  layer.dataset.glyphPhase = phase;
  layer.setAttribute("aria-hidden", "true");
  const shell = document.querySelector<HTMLElement>(".site-shell");
  const shellStyle = shell ? window.getComputedStyle(shell) : null;
  const fallbackColor = shellStyle?.getPropertyValue("--ink").trim() || "currentColor";
  const styleCache = new WeakMap<HTMLElement, CSSStyleDeclaration>();
  let glyphIndex = 0;
  const perTokenLimit = Math.max(2, Math.ceil(glyphLimit / Math.max(1, nodes.length)));

  nodes.forEach((node, tokenIndex) => {
    if (glyphIndex >= glyphLimit || !node.isConnected) return;
    const tokenBounds = node.getBoundingClientRect();
    const tokenCenterX = tokenBounds.left + tokenBounds.width / 2;
    const tokenCenterY = tokenBounds.top + tokenBounds.height / 2;
    const sampledGlyphs = sampleGlyphs(node, perTokenLimit);

    sampledGlyphs.forEach(({ character, endOffset, startOffset, textNode }) => {
      if (glyphIndex >= glyphLimit) return;
      const parent = textNode.parentElement ?? node;
      let style = styleCache.get(parent);
      if (!style) {
        style = window.getComputedStyle(parent);
        styleCache.set(parent, style);
      }
      const textFillColor = style.getPropertyValue("-webkit-text-fill-color");
      const glyphColor = isTransparentColor(style.color) || isTransparentColor(textFillColor)
        ? fallbackColor
        : style.color;

      const range = document.createRange();
      range.setStart(textNode, startOffset);
      range.setEnd(textNode, endOffset);
      const bounds = range.getBoundingClientRect();
      range.detach();
      if (
        bounds.width <= 0
        || bounds.height <= 0
        || bounds.bottom <= 0
        || bounds.top >= window.innerHeight
        || bounds.right <= 0
        || bounds.left >= window.innerWidth
      ) return;

      const centerX = bounds.left + bounds.width / 2;
      const centerY = bounds.top + bounds.height / 2;
      const outwardX = centerX - tokenCenterX;
      const outwardY = centerY - tokenCenterY;
      const outwardLength = Math.max(1, Math.hypot(outwardX, outwardY));
      const seed = glyphIndex * 37 + tokenIndex * 61 + (character.codePointAt(0) ?? 0);
      const angle = ((seed * 137.508) % 360) * (Math.PI / 180);
      const distance = 19 + (seed % 17);
      const driftX = outwardX / outwardLength * distance + Math.cos(angle) * 9;
      const driftY = outwardY / outwardLength * distance + Math.sin(angle) * 9;
      const splitX = Math.cos(angle + Math.PI / 2) * 6;
      const splitY = Math.sin(angle + Math.PI / 2) * 6;
      const spin = -14 + (seed % 29);
      const delay = (glyphIndex % 9) * 3 + (tokenIndex % 4) * 4;

      const glyph = document.createElement("span");
      glyph.className = "language-glyph";
      glyph.dataset.glyph = character;
      glyph.style.left = `${bounds.left}px`;
      glyph.style.top = `${bounds.top}px`;
      glyph.style.width = `${Math.max(1, bounds.width)}px`;
      glyph.style.height = `${bounds.height}px`;
      glyph.style.fontFamily = style.fontFamily;
      glyph.style.fontSize = style.fontSize;
      glyph.style.fontStyle = style.fontStyle;
      glyph.style.fontWeight = style.fontWeight;
      glyph.style.fontStretch = style.fontStretch;
      glyph.style.fontVariant = style.fontVariant;
      glyph.style.letterSpacing = style.letterSpacing;
      glyph.style.lineHeight = style.lineHeight;
      glyph.style.textTransform = style.textTransform;
      glyph.style.setProperty("--glyph-color", glyphColor);
      glyph.style.setProperty("--glyph-delay", `${delay}ms`);
      glyph.style.setProperty("--glyph-spin", `${spin}deg`);
      glyph.style.setProperty("--glyph-spin-reverse", `${spin * -1}deg`);
      glyph.style.setProperty("--glyph-a-x", `${Math.round(driftX + splitX)}px`);
      glyph.style.setProperty("--glyph-a-y", `${Math.round(driftY + splitY - 3)}px`);
      glyph.style.setProperty("--glyph-b-x", `${Math.round(driftX - splitX)}px`);
      glyph.style.setProperty("--glyph-b-y", `${Math.round(driftY - splitY + 3)}px`);
      glyph.style.setProperty("--glyph-near-x", `${Math.round(driftX * 0.28)}px`);
      glyph.style.setProperty("--glyph-near-y", `${Math.round(driftY * 0.28)}px`);
      layer.appendChild(glyph);
      glyphIndex += 1;
    });
  });

  if (!glyphIndex) return null;
  layer.dataset.glyphCount = String(glyphIndex);
  document.body.appendChild(layer);
  return layer;
}

export function useLanguageSwitcher() {
  const [language, setLanguage] = useState<Language>("zh");
  const [switching, setSwitching] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState<Language>("en");
  const timers = useRef<number[]>([]);
  const layers = useRef<HTMLElement[]>([]);
  const sequence = useRef(0);

  useEffect(() => {
    const scheduledTimers = timers.current;
    const glyphLayers = layers.current;
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
      sequence.current += 1;
      scheduledTimers.forEach((timer) => window.clearTimeout(timer));
      glyphLayers.forEach((layer) => layer.remove());
      document.querySelectorAll<HTMLElement>("[data-lang-phase]").forEach((node) => {
        delete node.dataset.langPhase;
      });
      delete root.dataset.languageEffect;
      delete root.dataset.languageSwitching;
    };
  }, []);

  const toggleLanguage = (event: MouseEvent<HTMLButtonElement>) => {
    if (switching) return;
    const switchSequence = sequence.current + 1;
    sequence.current = switchSequence;
    const next: Language = language === "zh" ? "en" : "zh";
    const root = document.documentElement;
    const rect = event.currentTarget.getBoundingClientRect();
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const liteMotion = root.dataset.motion === "lite" || window.innerWidth <= 720;
    const tokenLimit = liteMotion ? LITE_TOKEN_LIMIT : FULL_TOKEN_LIMIT;
    const glyphLimit = liteMotion ? LITE_GLYPH_LIMIT : FULL_GLYPH_LIMIT;
    root.style.setProperty("--language-x", `${rect.left + rect.width / 2}px`);
    root.style.setProperty("--language-y", `${rect.top + rect.height / 2}px`);

    const visibleTokens = Array.from(
      document.querySelectorAll<HTMLElement>("[data-lang-token]"),
    ).filter(isVisibleToken).slice(0, tokenLimit);

    const outgoingLayer = reducedMotion
      ? null
      : createGlyphLayer(visibleTokens, "decompose", glyphLimit);
    if (outgoingLayer) layers.current.push(outgoingLayer);
    visibleTokens.forEach((node) => {
      node.dataset.langPhase = reducedMotion ? "reduced" : "decompose";
    });
    root.dataset.languageSwitching = next;
    root.dataset.languageEffect = reducedMotion ? "reduced" : "decompose";
    setTargetLanguage(next);
    setSwitching(true);

    const swapDelay = reducedMotion ? 0 : 270;
    const totalDuration = reducedMotion ? 140 : 840;
    timers.current.push(window.setTimeout(() => {
      setLanguage(next);
      root.dataset.language = next;
      root.lang = next === "en" ? "en" : "zh-CN";
      window.localStorage.setItem("mozelle-language", next);
    }, swapDelay));

    if (!reducedMotion) {
      timers.current.push(window.setTimeout(() => outgoingLayer?.remove(), 338));
      timers.current.push(window.setTimeout(() => {
        if (sequence.current !== switchSequence) return;
        const incomingLayer = createGlyphLayer(
          visibleTokens.filter((node) => node.isConnected),
          "reassemble",
          glyphLimit,
        );
        if (incomingLayer) layers.current.push(incomingLayer);
        visibleTokens.forEach((node) => {
          if (node.isConnected) node.dataset.langPhase = "reassemble";
        });
        root.dataset.languageEffect = "reassemble";
      }, 350));
    }

    timers.current.push(window.setTimeout(() => {
      if (sequence.current !== switchSequence) return;
      sequence.current += 1;
      visibleTokens.forEach((node) => {
        if (node.isConnected) delete node.dataset.langPhase;
      });
      layers.current.forEach((layer) => layer.remove());
      layers.current.length = 0;
      delete root.dataset.languageEffect;
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
      <span className="language-reassembly-readout">
        <small>GLYPH / DECODE</small>
        <strong>{target === "en" ? "EN" : "中文"}</strong>
      </span>
    </div>
  );
}
