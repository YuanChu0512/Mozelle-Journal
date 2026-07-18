import assert from "node:assert/strict";
import test from "node:test";
import {
  isAutomatedUserAgent,
  normalizeAnalyticsPath,
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
