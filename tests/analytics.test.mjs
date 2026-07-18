import assert from "node:assert/strict";
import test from "node:test";
import {
  formatVisitorLocation,
  isAutomatedUserAgent,
  isPublicVisitorIp,
  locationFromCloudflareHeaders,
  normalizeAnalyticsPath,
  normalizeLocationPart,
  normalizeVisitorIp,
} from "../server/analytics.mjs";

test("keeps public page paths and strips query parameters", () => {
  assert.equal(normalizeAnalyticsPath("/"), "/");
  assert.equal(normalizeAnalyticsPath("/articles/ddr5?from=home"), "/articles/ddr5");
  assert.equal(normalizeAnalyticsPath("/articles//ddr5"), "/articles/ddr5");
});

test("rejects private, API, asset, and external paths", () => {
  assert.equal(normalizeAnalyticsPath("/admin"), null);
  assert.equal(normalizeAnalyticsPath("/api/posts"), null);
  assert.equal(normalizeAnalyticsPath("/articles/cover.jpg"), null);
  assert.equal(normalizeAnalyticsPath("//example.com/path"), null);
  assert.equal(normalizeAnalyticsPath("https://example.com/path"), null);
});

test("normalizes valid IP addresses", () => {
  assert.equal(normalizeVisitorIp("::ffff:192.0.2.8"), "192.0.2.8");
  assert.equal(normalizeVisitorIp("2001:db8::8"), "2001:db8::8");
  assert.equal(normalizeVisitorIp("not-an-ip"), null);
});

test("identifies automated traffic", () => {
  assert.equal(isAutomatedUserAgent("Mozilla/5.0"), false);
  assert.equal(isAutomatedUserAgent("Googlebot/2.1"), true);
  assert.equal(isAutomatedUserAgent("curl/8.0"), true);
});

test("formats a compact visitor location without duplicate segments", () => {
  assert.equal(
    formatVisitorLocation({ country: "中国", region: "广东", city: "广州" }),
    "中国 · 广东 · 广州",
  );
  assert.equal(
    formatVisitorLocation({ country: "新加坡", region: "新加坡", city: "新加坡" }),
    "新加坡",
  );
  assert.equal(formatVisitorLocation({}), "未知地区");
  assert.equal(normalizeLocationPart("  广东\n省  "), "广东 省");
});

test("accepts Cloudflare location only when it belongs to the visitor IP", () => {
  const headers = {
    "cf-ray": "example-SIN",
    "cf-connecting-ip": "203.1.1.8",
    "cf-ipcountry": "中国",
    "cf-region": "广东",
    "cf-ipcity": "广州",
  };
  assert.equal(locationFromCloudflareHeaders(headers, "198.51.100.8"), null);
  assert.deepEqual(locationFromCloudflareHeaders(headers, "203.1.1.8"), {
    country: "中国",
    region: "广东",
    city: "广州",
    label: "中国 · 广东 · 广州",
    source: "cloudflare",
  });
});

test("distinguishes public visitor addresses from local and reserved ranges", () => {
  assert.equal(isPublicVisitorIp("8.8.8.8"), true);
  assert.equal(isPublicVisitorIp("203.1.1.8"), true);
  assert.equal(isPublicVisitorIp("10.0.0.8"), false);
  assert.equal(isPublicVisitorIp("192.168.1.8"), false);
  assert.equal(isPublicVisitorIp("203.0.113.8"), false);
  assert.equal(isPublicVisitorIp("::1"), false);
  assert.equal(isPublicVisitorIp("2001:4860:4860::8888"), true);
});
