"use client";

import { useEffect, useRef } from "react";

type TrailPoint = { x: number; y: number };

type WakeShard = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  size: number;
  angle: number;
  spin: number;
};

type WakePalette = {
  primary: [number, number, number];
  secondary: [number, number, number];
};

const rgba = ([red, green, blue]: [number, number, number], alpha: number) =>
  `rgba(${red}, ${green}, ${blue}, ${alpha})`;

export default function AmbientEffects() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d", { alpha: true });
    if (!canvas || !context) return;

    const pointerQuery = window.matchMedia("(min-width: 941px) and (pointer: fine)");
    const motionQuery = window.matchMedia("(prefers-reduced-motion: no-preference)");
    const trail: TrailPoint[] = Array.from({ length: 17 }, () => ({ x: 0, y: 0 }));
    const shards: WakeShard[] = [];
    const target = { x: 0, y: 0 };
    let palette: WakePalette = {
      primary: [121, 103, 223],
      secondary: [198, 154, 74],
    };
    let frame = 0;
    let lastFrame = 0;
    let lastPaint = 0;
    let lastMove = 0;
    let lastPointerSample = 0;
    let lastPointerX = 0;
    let lastPointerY = 0;
    let lastShardAt = 0;
    let initialized = false;
    let width = 0;
    let height = 0;
    let pixelRatio = 1;

    const canAnimate = () =>
      pointerQuery.matches &&
      motionQuery.matches &&
      document.documentElement.dataset.motion !== "lite";

    const updatePalette = () => {
      const night = canvas.closest(".theme-night") !== null;
      palette = night
        ? { primary: [98, 233, 141], secondary: [195, 255, 98] }
        : { primary: [121, 103, 223], secondary: [198, 154, 74] };
    };

    const clearCanvas = () => {
      context.setTransform(1, 0, 0, 1, 0, 0);
      context.clearRect(0, 0, canvas.width, canvas.height);
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
    };

    const resizeCanvas = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      pixelRatio = Math.min(window.devicePixelRatio || 1, 1.35);
      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      clearCanvas();
    };

    const stop = () => {
      if (frame) window.cancelAnimationFrame(frame);
      frame = 0;
      lastFrame = 0;
      lastPaint = 0;
      initialized = false;
      shards.length = 0;
      canvas.dataset.rendering = "false";
      canvas.dataset.shardCount = "0";
      clearCanvas();
    };

    const traceTrail = () => {
      const tail = trail[trail.length - 1];
      const head = trail[0];
      const gradient = context.createLinearGradient(tail.x, tail.y, head.x, head.y);
      gradient.addColorStop(0, rgba(palette.secondary, 0));
      gradient.addColorStop(0.34, rgba(palette.primary, 0.16));
      gradient.addColorStop(0.72, rgba(palette.primary, 0.58));
      gradient.addColorStop(1, rgba(palette.secondary, 0.96));

      context.beginPath();
      context.moveTo(tail.x, tail.y);
      for (let index = trail.length - 2; index > 0; index -= 1) {
        const current = trail[index];
        const next = trail[index - 1];
        context.quadraticCurveTo(
          current.x,
          current.y,
          (current.x + next.x) * 0.5,
          (current.y + next.y) * 0.5,
        );
      }
      context.quadraticCurveTo(trail[1].x, trail[1].y, head.x, head.y);
      context.lineCap = "round";
      context.lineJoin = "round";

      context.strokeStyle = rgba(palette.primary, 0.055);
      context.lineWidth = 18;
      context.stroke();
      context.strokeStyle = rgba(palette.primary, 0.14);
      context.lineWidth = 6;
      context.stroke();
      context.strokeStyle = gradient;
      context.lineWidth = 1.35;
      context.stroke();
    };

    const drawShards = (elapsed: number) => {
      context.globalCompositeOperation = "lighter";
      for (let index = shards.length - 1; index >= 0; index -= 1) {
        const shard = shards[index];
        shard.life -= elapsed / 760;
        if (shard.life <= 0) {
          shards.splice(index, 1);
          continue;
        }
        shard.x += shard.vx * elapsed;
        shard.y += shard.vy * elapsed;
        shard.vx *= 0.986;
        shard.vy = shard.vy * 0.986 + 0.0009 * elapsed;
        shard.angle += shard.spin * elapsed;
        const alpha = Math.sin(Math.min(1, shard.life) * Math.PI) * 0.72;

        context.save();
        context.translate(shard.x, shard.y);
        context.rotate(shard.angle);
        context.fillStyle = rgba(
          index % 3 === 0 ? palette.secondary : palette.primary,
          alpha,
        );
        context.fillRect(-shard.size * 0.5, -shard.size * 0.5, shard.size, shard.size);
        context.restore();
      }
      context.globalCompositeOperation = "source-over";
      canvas.dataset.shardCount = String(shards.length);
    };

    const drawHead = () => {
      const head = trail[0];
      const next = trail[2];
      const angle = Math.atan2(head.y - next.y, head.x - next.x);
      context.save();
      context.translate(head.x, head.y);
      context.rotate(angle + Math.PI * 0.25);
      context.strokeStyle = rgba(palette.secondary, 0.88);
      context.lineWidth = 1;
      context.strokeRect(-3.5, -3.5, 7, 7);
      context.restore();
    };

    const animate = (now: number) => {
      if (!canAnimate()) {
        stop();
        return;
      }

      frame = window.requestAnimationFrame(animate);
      if (lastPaint && now - lastPaint < 1000 / 90) return;
      const elapsed = Math.min(32, lastFrame ? now - lastFrame : 16.67);
      lastFrame = now;
      lastPaint = now;

      trail[0].x += (target.x - trail[0].x) * 0.42;
      trail[0].y += (target.y - trail[0].y) * 0.42;
      for (let index = 1; index < trail.length; index += 1) {
        const pull = Math.max(0.16, 0.3 - index * 0.0065);
        trail[index].x += (trail[index - 1].x - trail[index].x) * pull;
        trail[index].y += (trail[index - 1].y - trail[index].y) * pull;
      }

      const idleFor = now - lastMove;
      const fade = Math.max(0, Math.min(1, 1 - (idleFor - 120) / 680));
      clearCanvas();
      context.globalAlpha = fade;
      traceTrail();
      drawHead();
      context.globalAlpha = 1;
      drawShards(elapsed);

      const tail = trail[trail.length - 1];
      const settled = Math.hypot(target.x - tail.x, target.y - tail.y) < 0.7;
      if (fade <= 0 && shards.length === 0 && settled) stop();
    };

    const spawnShards = (speed: number, deltaX: number, deltaY: number, now: number) => {
      if (speed < 0.42 || now - lastShardAt < 30 || shards.length >= 24) return;
      lastShardAt = now;
      const count = speed > 1.35 ? 2 : 1;
      const direction = Math.atan2(deltaY, deltaX);
      for (let index = 0; index < count; index += 1) {
        const side = index === 0 ? 1 : -1;
        const spread = (Math.random() - 0.5) * 0.55;
        const velocity = Math.min(0.15, 0.045 + speed * 0.035);
        shards.push({
          x: target.x + (Math.random() - 0.5) * 8,
          y: target.y + (Math.random() - 0.5) * 8,
          vx: Math.cos(direction + Math.PI * 0.72 * side + spread) * velocity,
          vy: Math.sin(direction + Math.PI * 0.72 * side + spread) * velocity,
          life: 1,
          size: 1.6 + Math.random() * 2.5,
          angle: Math.random() * Math.PI,
          spin: (Math.random() - 0.5) * 0.012,
        });
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      if (!canAnimate()) return;
      const now = performance.now();
      target.x = event.clientX;
      target.y = event.clientY;
      updatePalette();

      if (!initialized) {
        trail.forEach((point) => {
          point.x = target.x;
          point.y = target.y;
        });
        lastPointerX = target.x;
        lastPointerY = target.y;
        lastPointerSample = now;
        initialized = true;
      } else {
        const deltaX = target.x - lastPointerX;
        const deltaY = target.y - lastPointerY;
        const elapsed = Math.max(8, now - lastPointerSample);
        spawnShards(Math.hypot(deltaX, deltaY) / elapsed, deltaX, deltaY, now);
        lastPointerX = target.x;
        lastPointerY = target.y;
        lastPointerSample = now;
      }

      lastMove = now;
      canvas.dataset.rendering = "true";
      if (!frame) frame = window.requestAnimationFrame(animate);
    };

    const handlePointerOut = (event: PointerEvent) => {
      if (!event.relatedTarget) lastMove = performance.now() - 140;
    };

    const handlePreferenceChange = () => {
      if (!canAnimate()) stop();
    };

    resizeCanvas();
    window.addEventListener("resize", resizeCanvas, { passive: true });
    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    window.addEventListener("pointerout", handlePointerOut, { passive: true });
    window.addEventListener("blur", stop);
    pointerQuery.addEventListener("change", handlePreferenceChange);
    motionQuery.addEventListener("change", handlePreferenceChange);

    return () => {
      stop();
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerout", handlePointerOut);
      window.removeEventListener("blur", stop);
      pointerQuery.removeEventListener("change", handlePreferenceChange);
      motionQuery.removeEventListener("change", handlePreferenceChange);
    };
  }, []);

  return (
    <div className="global-ambient-effects" aria-hidden="true">
      <canvas
        ref={canvasRef}
        className="originium-wake-canvas"
        data-rendering="false"
        data-shard-count="0"
      />
    </div>
  );
}
