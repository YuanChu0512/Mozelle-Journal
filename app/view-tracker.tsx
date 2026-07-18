"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DUPLICATE_WINDOW_MS = 10_000;

export default function ViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || pathname === "/admin" || pathname.startsWith("/admin/")) return;

    const now = Date.now();
    const storageKey = "mozelle-last-page-view";
    try {
      const previous = JSON.parse(window.sessionStorage.getItem(storageKey) || "null") as
        | { path?: string; at?: number }
        | null;
      if (
        previous?.path === pathname &&
        typeof previous.at === "number" &&
        now - previous.at < DUPLICATE_WINDOW_MS
      ) {
        return;
      }
      window.sessionStorage.setItem(storageKey, JSON.stringify({ path: pathname, at: now }));
    } catch {
      // Tracking must never interfere with page rendering when storage is blocked.
    }

    void fetch("/api/analytics/view", {
      method: "POST",
      credentials: "same-origin",
      keepalive: true,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
