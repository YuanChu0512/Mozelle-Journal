import { isIP } from "node:net";

const AUTOMATED_AGENT_PATTERN =
  /bot|crawler|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|curl|wget|python-requests|uptime|monitor/i;

const IGNORED_PATH_PREFIXES = [
  "/admin",
  "/api",
  "/_next",
  "/uploads",
];

const IGNORED_FILE_PATTERN =
  /\.(?:avif|css|gif|ico|jpe?g|js|json|map|png|svg|txt|webmanifest|webp|woff2?)$/i;

export function normalizeAnalyticsPath(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 500 || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return null;
  }

  let parsed;
  try {
    parsed = new URL(candidate, "https://mozelle.local");
  } catch {
    return null;
  }

  const pathname = parsed.pathname.replace(/\/{2,}/g, "/");
  if (
    IGNORED_PATH_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    ) ||
    IGNORED_FILE_PATTERN.test(pathname)
  ) {
    return null;
  }

  return pathname;
}

export function normalizeVisitorIp(value) {
  if (typeof value !== "string") return null;
  const candidate = value.trim().replace(/^::ffff:/i, "");
  return isIP(candidate) ? candidate : null;
}

export function isAutomatedUserAgent(value) {
  return typeof value === "string" && AUTOMATED_AGENT_PATTERN.test(value);
}
