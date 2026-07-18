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

export function normalizeLocationPart(value, maxLength = 80) {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

export function formatVisitorLocation({ country, region, city } = {}) {
  const parts = [country, region, city]
    .map((part) => normalizeLocationPart(part))
    .filter((part) => part && part !== "XX")
    .filter((part, index, values) => values.indexOf(part) === index);
  return parts.join(" · ") || "未知地区";
}

export function locationFromCloudflareHeaders(headers = {}, visitorIp = "") {
  const connectingIp = normalizeVisitorIp(headers["cf-connecting-ip"]);
  if (!headers["cf-ray"] || !connectingIp || connectingIp !== visitorIp) return null;

  const country = normalizeLocationPart(headers["cf-ipcountry"]);
  const region = normalizeLocationPart(headers["cf-region"]);
  const city = normalizeLocationPart(headers["cf-ipcity"]);
  if (!country && !region && !city) return null;

  return {
    country,
    region,
    city,
    label: formatVisitorLocation({ country, region, city }),
    source: "cloudflare",
  };
}

export function isPublicVisitorIp(value) {
  const ip = normalizeVisitorIp(value);
  if (!ip) return false;
  if (ip.includes(":")) {
    const normalized = ip.toLowerCase();
    return !(
      normalized === "::" ||
      normalized === "::1" ||
      normalized.startsWith("fc") ||
      normalized.startsWith("fd") ||
      /^fe[89ab]/.test(normalized) ||
      normalized.startsWith("2001:db8:")
    );
  }

  const [a, b, c] = ip.split(".").map(Number);
  return !(
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 0 && (c === 0 || c === 2)) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    (a === 198 && b === 51 && c === 100) ||
    (a === 203 && b === 0 && c === 113) ||
    a >= 224
  );
}
