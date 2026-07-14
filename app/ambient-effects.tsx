"use client";

import { useEffect, useRef } from "react";

export default function AmbientEffects() {
  const auraRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const aura = auraRef.current;
    if (!aura) return;

    const pointerQuery = window.matchMedia("(min-width: 941px) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    let frame = 0;
    let x = window.innerWidth * 0.5;
    let y = window.innerHeight * 0.5;

    const canAnimate = () =>
      pointerQuery.matches &&
      motionQuery.matches &&
      document.documentElement.dataset.motion !== "lite";

    const hideAura = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      aura.dataset.active = "false";
    };

    const paintAura = () => {
      frame = 0;
      if (!canAnimate()) {
        hideAura();
        return;
      }
      aura.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      aura.dataset.active = "true";
    };

    const handlePointerMove = (event: PointerEvent) => {
      x = event.clientX;
      y = event.clientY;
      if (!frame) frame = window.requestAnimationFrame(paintAura);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) hideAura();
    };

    const handlePreferenceChange = () => {
      if (!canAnimate()) hideAura();
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("blur", hideAura);
    pointerQuery.addEventListener("change", handlePreferenceChange);
    motionQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      hideAura();
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", hideAura);
      pointerQuery.removeEventListener("change", handlePreferenceChange);
      motionQuery.removeEventListener("change", handlePreferenceChange);
    };
  }, []);

  return (
    <div className="global-ambient-effects" aria-hidden="true">
      <span ref={auraRef} className="global-pointer-aura" data-active="false">
        <i className="global-pointer-ring ring-outer" />
        <i className="global-pointer-ring ring-inner" />
      </span>
      <span className="global-edge-signal edge-signal-left" />
      <span className="global-edge-signal edge-signal-right" />
    </div>
  );
}
