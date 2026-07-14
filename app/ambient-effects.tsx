"use client";

import { useEffect, useRef } from "react";

const eventTargetSelector = [
  "a[data-transition-label]",
  "button.theme-toggle",
  ".button-primary",
  ".article-footer a",
  ".article-header-actions a",
  ".article-header-actions button",
].join(",");

export default function AmbientEffects() {
  const fieldRef = useRef<HTMLSpanElement>(null);
  const burstRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const field = fieldRef.current;
    const burst = burstRef.current;
    if (!field || !burst) return;

    const pointerQuery = window.matchMedia("(min-width: 941px) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const target = { x: window.innerWidth * 0.5, y: window.innerHeight * 0.5 };
    const current = { ...target };
    let frame = 0;
    let idleTimer = 0;
    let burstTimer = 0;
    let initialized = false;

    const canAnimate = () =>
      pointerQuery.matches &&
      motionQuery.matches &&
      document.documentElement.dataset.motion !== "lite";

    const stopField = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      initialized = false;
      field.dataset.active = "false";
      field.dataset.idle = "true";
    };

    const paintField = () => {
      if (!canAnimate()) {
        stopField();
        return;
      }

      const deltaX = target.x - current.x;
      const deltaY = target.y - current.y;
      current.x += deltaX * 0.16;
      current.y += deltaY * 0.16;
      field.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;

      if (Math.abs(deltaX) > 0.18 || Math.abs(deltaY) > 0.18) {
        frame = window.requestAnimationFrame(paintField);
      } else {
        current.x = target.x;
        current.y = target.y;
        field.style.transform = `translate3d(${current.x}px, ${current.y}px, 0)`;
        frame = 0;
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!canAnimate()) return;
      target.x = event.clientX;
      target.y = event.clientY;

      if (!initialized) {
        current.x = target.x;
        current.y = target.y;
        initialized = true;
      }

      field.dataset.active = "true";
      field.dataset.idle = "false";
      if (!frame) frame = window.requestAnimationFrame(paintField);

      window.clearTimeout(idleTimer);
      idleTimer = window.setTimeout(() => {
        field.dataset.idle = "true";
      }, 620);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) stopField();
    };

    const triggerBurst = (event: PointerEvent) => {
      if (!canAnimate()) return;
      const targetElement = event.target instanceof Element ? event.target : null;
      if (!targetElement?.closest(eventTargetSelector)) return;

      burst.style.setProperty("--burst-x", `${event.clientX}px`);
      burst.style.setProperty("--burst-y", `${event.clientY}px`);
      burst.dataset.active = "false";
      void burst.offsetWidth;
      burst.dataset.active = "true";

      window.clearTimeout(burstTimer);
      burstTimer = window.setTimeout(() => {
        burst.dataset.active = "false";
      }, 780);
    };

    const handlePreferenceChange = () => {
      if (!canAnimate()) {
        stopField();
        burst.dataset.active = "false";
      }
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("pointerdown", triggerBurst, { passive: true });
    window.addEventListener("blur", stopField);
    pointerQuery.addEventListener("change", handlePreferenceChange);
    motionQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      stopField();
      window.clearTimeout(idleTimer);
      window.clearTimeout(burstTimer);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("pointerdown", triggerBurst);
      window.removeEventListener("blur", stopField);
      pointerQuery.removeEventListener("change", handlePreferenceChange);
      motionQuery.removeEventListener("change", handlePreferenceChange);
    };
  }, []);

  return (
    <>
      <div className="global-ambient-effects" aria-hidden="true">
        <span
          ref={fieldRef}
          className="spatial-refraction-anchor"
          data-active="false"
          data-idle="true"
        >
          <i className="spatial-refraction-field" />
        </span>
      </div>

      <div className="dimension-event-layer" aria-hidden="true">
        <span ref={burstRef} className="dimension-event-burst" data-active="false">
          <i className="event-burst-glow" />
          <i className="event-burst-wave" />
          <i className="event-burst-slice slice-one" />
          <i className="event-burst-slice slice-two" />
          <i className="event-burst-shard event-shard-one" />
          <i className="event-burst-shard event-shard-two" />
          <i className="event-burst-shard event-shard-three" />
          <i className="event-burst-shard event-shard-four" />
          <i className="event-burst-shard event-shard-five" />
          <i className="event-burst-shard event-shard-six" />
        </span>
      </div>
    </>
  );
}
