"use client";

import type { ReactNode } from "react";

function safeImageUrl(value: string): string | null {
  if (value.startsWith("/uploads/")) return value;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.href : null;
  } catch {
    return null;
  }
}

function renderInline(value: string): ReactNode[] {
  const pattern = /(!\[([^\]]*)\]\(([^)]+)\)|\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`)/g;
  const nodes: ReactNode[] = [];
  let cursor = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(value))) {
    if (match.index > cursor) nodes.push(value.slice(cursor, match.index));
    const key = `${match.index}-${match[0]}`;
    if (match[2] !== undefined) {
      const src = safeImageUrl(match[3]);
      nodes.push(
        src ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img key={key} src={src} alt={match[2]} loading="lazy" />
        ) : (
          <span key={key}>[图片地址不可用]</span>
        ),
      );
    } else if (match[4] !== undefined) {
      const href = safeImageUrl(match[5]);
      nodes.push(
        href ? (
          <a key={key} href={href} target="_blank" rel="noreferrer">
            {match[4]}
          </a>
        ) : (
          match[4]
        ),
      );
    } else if (match[6] !== undefined) {
      nodes.push(<strong key={key}>{match[6]}</strong>);
    } else if (match[7] !== undefined) {
      nodes.push(<code key={key}>{match[7]}</code>);
    }
    cursor = pattern.lastIndex;
  }

  if (cursor < value.length) nodes.push(value.slice(cursor));
  return nodes;
}

export function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks: ReactNode[] = [];
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  let code: string[] | null = null;

  lines.forEach((line, index) => {
    if (line.startsWith("```")) {
      if (code) {
        blocks.push(
          <pre key={`code-${index}`}>
            <code>{code.join("\n")}</code>
          </pre>,
        );
        code = null;
      } else {
        code = [];
      }
      return;
    }
    if (code) {
      code.push(line);
      return;
    }
    if (!line.trim()) return;

    const heading = line.match(/^(#{1,3})\s+(.+)$/);
    if (heading) {
      const content = renderInline(heading[2]);
      if (heading[1].length === 1) blocks.push(<h1 key={index}>{content}</h1>);
      else if (heading[1].length === 2) blocks.push(<h2 key={index}>{content}</h2>);
      else blocks.push(<h3 key={index}>{content}</h3>);
      return;
    }
    if (line.startsWith("> ")) {
      blocks.push(<blockquote key={index}>{renderInline(line.slice(2))}</blockquote>);
      return;
    }
    if (line.startsWith("- ")) {
      blocks.push(
        <ul key={index}>
          <li>{renderInline(line.slice(2))}</li>
        </ul>,
      );
      return;
    }
    blocks.push(<p key={index}>{renderInline(line)}</p>);
  });

  if (code?.length) {
    blocks.push(
      <pre key="code-final">
        <code>{code.join("\n")}</code>
      </pre>,
    );
  }

  return (
    <article className="markdown-preview">
      {blocks.length ? blocks : <p className="preview-empty">在左侧输入内容，这里会实时预览。</p>}
    </article>
  );
}
