import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeImageMetadata } from "../server/image-sanitizer.mjs";

test("removes JPEG metadata without changing the encoded image stream", () => {
  const original = Buffer.from([
    0xff, 0xd8,
    0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46,
    0xff, 0xda, 0x00, 0x02, 0xff, 0xd9,
  ]);
  const payload = Buffer.from("Exif\0\0private-camera-data");
  const app1 = Buffer.alloc(payload.length + 4);
  app1[0] = 0xff;
  app1[1] = 0xe1;
  app1.writeUInt16BE(payload.length + 2, 2);
  payload.copy(app1, 4);
  const withMetadata = Buffer.concat([original.subarray(0, 2), app1, original.subarray(2)]);

  assert.deepEqual(sanitizeImageMetadata(withMetadata, "image/jpeg"), original);
});

test("removes textual PNG metadata while preserving image chunks", () => {
  const original = Buffer.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44,
    0x00, 0x00, 0x00, 0x00,
  ]);
  const payload = Buffer.from("Author\0private");
  const chunk = Buffer.alloc(payload.length + 12);
  chunk.writeUInt32BE(payload.length, 0);
  chunk.write("tEXt", 4, "ascii");
  payload.copy(chunk, 8);
  const withMetadata = Buffer.concat([original.subarray(0, 8), chunk, original.subarray(8)]);

  assert.deepEqual(sanitizeImageMetadata(withMetadata, "image/png"), original);
});

test("removes GIF comments while preserving animation and ICC application data", () => {
  const header = Buffer.from("GIF89a", "ascii");
  const logicalScreen = Buffer.from([1, 0, 1, 0, 0, 0, 0]);
  const comment = Buffer.concat([
    Buffer.from([0x21, 0xfe, 0x07]),
    Buffer.from("private", "ascii"),
    Buffer.from([0]),
  ]);
  const loop = Buffer.concat([
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("NETSCAPE2.0", "ascii"),
    Buffer.from([0x03, 0x01, 0x00, 0x00, 0x00]),
  ]);
  const icc = Buffer.concat([
    Buffer.from([0x21, 0xff, 0x0b]),
    Buffer.from("ICCRGBG1012", "ascii"),
    Buffer.from([0x03, 0x01, 0x02, 0x03, 0x00]),
  ]);
  const trailer = Buffer.from([0x3b]);
  const original = Buffer.concat([header, logicalScreen, loop, icc, trailer]);
  const withMetadata = Buffer.concat([header, logicalScreen, comment, loop, icc, trailer]);

  assert.deepEqual(sanitizeImageMetadata(withMetadata, "image/gif"), original);
});
