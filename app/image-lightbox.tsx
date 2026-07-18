"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

export type LightboxImage = {
  src: string;
  alt: string;
  caption?: string;
};

type ImageLightboxProps = {
  images: LightboxImage[];
  activeIndex: number | null;
  onClose: () => void;
  onChange?: (index: number) => void;
  labels?: {
    dialog: string;
    openOriginal: string;
    close: string;
    previous: string;
    next: string;
  };
};

export default function ImageLightbox({
  images,
  activeIndex,
  onClose,
  onChange,
  labels = {
    dialog: "图片预览",
    openOriginal: "打开原图 ↗",
    close: "关闭图片预览",
    previous: "上一张图片",
    next: "下一张图片",
  },
}: ImageLightboxProps) {
  const open = activeIndex !== null && Boolean(images[activeIndex]);
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    const previousFocus = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
      if (previousFocus?.isConnected) previousFocus.focus({ preventScroll: true });
    };
  }, [open]);

  useEffect(() => {
    if (!open || activeIndex === null) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "Tab") {
        const focusable = Array.from(
          dialogRef.current?.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ) ?? [],
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!first || !last) {
          event.preventDefault();
          return;
        }
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
        return;
      }
      if (images.length < 2) return;
      if (event.key === "ArrowLeft") {
        onChange?.((activeIndex - 1 + images.length) % images.length);
      }
      if (event.key === "ArrowRight") {
        onChange?.((activeIndex + 1) % images.length);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, images.length, onChange, onClose, open]);

  if (!open || activeIndex === null || typeof document === "undefined") return null;
  const image = images[activeIndex];

  return createPortal(
    <div
      ref={dialogRef}
      className="image-lightbox"
      role="dialog"
      aria-modal="true"
      aria-label={image.alt || labels.dialog}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div className="image-lightbox-toolbar">
        <span>{String(activeIndex + 1).padStart(2, "0")} / {String(images.length).padStart(2, "0")}</span>
        <a href={image.src} target="_blank" rel="noreferrer">{labels.openOriginal}</a>
        <button type="button" onClick={onClose} aria-label={labels.close} autoFocus>×</button>
      </div>

      {images.length > 1 && (
        <button
          className="image-lightbox-nav image-lightbox-prev"
          type="button"
          onClick={() => onChange?.((activeIndex - 1 + images.length) % images.length)}
          aria-label={labels.previous}
        >
          ←
        </button>
      )}

      <figure>
        {/* Full-resolution user and evidence images intentionally bypass optimization. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={image.src} alt={image.alt} decoding="async" />
        {(image.caption || image.alt) && <figcaption>{image.caption || image.alt}</figcaption>}
      </figure>

      {images.length > 1 && (
        <button
          className="image-lightbox-nav image-lightbox-next"
          type="button"
          onClick={() => onChange?.((activeIndex + 1) % images.length)}
          aria-label={labels.next}
        >
          →
        </button>
      )}
    </div>,
    document.body,
  );
}
