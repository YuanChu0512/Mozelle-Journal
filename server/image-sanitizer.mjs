const JPEG_METADATA_MARKERS = new Set([
  0xe1,
  ...Array.from({ length: 11 }, (_, index) => 0xe3 + index),
  0xef,
  0xfe,
]);

function stripJpegMetadata(buffer) {
  if (buffer.length < 4 || buffer[0] !== 0xff || buffer[1] !== 0xd8) return buffer;
  const segments = [buffer.subarray(0, 2)];
  let position = 2;

  while (position < buffer.length) {
    if (buffer[position] !== 0xff) throw new Error("Invalid JPEG marker stream.");
    const start = position;
    while (position < buffer.length && buffer[position] === 0xff) position += 1;
    if (position >= buffer.length) throw new Error("Truncated JPEG marker.");
    const marker = buffer[position];
    position += 1;

    if (marker === 0xda) {
      segments.push(buffer.subarray(start));
      return Buffer.concat(segments);
    }

    const standalone = marker === 0xd8 || marker === 0xd9 || marker === 0x01 ||
      (marker >= 0xd0 && marker <= 0xd7);
    if (standalone) {
      segments.push(buffer.subarray(start, position));
      if (marker === 0xd9) return Buffer.concat(segments);
      continue;
    }

    if (position + 2 > buffer.length) throw new Error("Truncated JPEG segment length.");
    const length = buffer.readUInt16BE(position);
    const end = position + length;
    if (length < 2 || end > buffer.length) throw new Error("Invalid JPEG segment length.");
    if (!JPEG_METADATA_MARKERS.has(marker)) segments.push(buffer.subarray(start, end));
    position = end;
  }

  return Buffer.concat(segments);
}

function stripPngMetadata(buffer) {
  const signature = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  if (buffer.length < 12 || !buffer.subarray(0, 8).equals(signature)) return buffer;
  const chunks = [buffer.subarray(0, 8)];
  const metadataTypes = new Set(["eXIf", "tEXt", "zTXt", "iTXt", "tIME"]);
  let position = 8;

  while (position < buffer.length) {
    if (position + 12 > buffer.length) throw new Error("Truncated PNG chunk.");
    const length = buffer.readUInt32BE(position);
    const end = position + 12 + length;
    if (end > buffer.length) throw new Error("Invalid PNG chunk length.");
    const type = buffer.toString("ascii", position + 4, position + 8);
    if (!metadataTypes.has(type)) chunks.push(buffer.subarray(position, end));
    position = end;
    if (type === "IEND") break;
  }

  return Buffer.concat(chunks);
}

function stripWebpMetadata(buffer) {
  if (
    buffer.length < 12 ||
    buffer.toString("ascii", 0, 4) !== "RIFF" ||
    buffer.toString("ascii", 8, 12) !== "WEBP"
  ) {
    return buffer;
  }

  const chunks = [];
  let position = 12;
  while (position + 8 <= buffer.length) {
    const type = buffer.toString("ascii", position, position + 4);
    const length = buffer.readUInt32LE(position + 4);
    const paddedLength = length + (length % 2);
    const end = position + 8 + paddedLength;
    if (end > buffer.length) throw new Error("Invalid WebP chunk length.");

    if (type !== "EXIF" && type !== "XMP ") {
      if (type === "VP8X" && length > 0) {
        const chunk = Buffer.from(buffer.subarray(position, end));
        chunk[8] &= ~0x0c;
        chunks.push(chunk);
      } else {
        chunks.push(buffer.subarray(position, end));
      }
    }
    position = end;
  }

  const body = Buffer.concat(chunks);
  const header = Buffer.from(buffer.subarray(0, 12));
  header.writeUInt32LE(body.length + 4, 4);
  return Buffer.concat([header, body]);
}

function gifSubBlocksEnd(buffer, start) {
  let position = start;
  while (position < buffer.length) {
    const length = buffer[position];
    position += 1;
    if (length === 0) return position;
    position += length;
    if (position > buffer.length) throw new Error("Invalid GIF sub-block length.");
  }
  throw new Error("Truncated GIF sub-block stream.");
}

function stripGifMetadata(buffer) {
  const signature = buffer.toString("ascii", 0, 6);
  if (signature !== "GIF87a" && signature !== "GIF89a") return buffer;
  if (buffer.length < 13) throw new Error("Truncated GIF header.");

  const globalTableSize = buffer[10] & 0x80
    ? 3 * (2 ** ((buffer[10] & 0x07) + 1))
    : 0;
  let position = 13 + globalTableSize;
  if (position > buffer.length) throw new Error("Truncated GIF color table.");
  const blocks = [buffer.subarray(0, position)];

  while (position < buffer.length) {
    const start = position;
    const marker = buffer[position];

    if (marker === 0x3b) {
      blocks.push(buffer.subarray(position, position + 1));
      return Buffer.concat(blocks);
    }

    if (marker === 0x21) {
      if (position + 3 > buffer.length) throw new Error("Truncated GIF extension.");
      const label = buffer[position + 1];
      const firstBlockLength = buffer[position + 2];
      const firstBlockStart = position + 3;
      const end = gifSubBlocksEnd(buffer, position + 2);
      const applicationId = label === 0xff
        ? buffer.toString(
            "ascii",
            firstBlockStart,
            Math.min(firstBlockStart + firstBlockLength, buffer.length),
          )
        : "";
      const keepApplication = applicationId === "NETSCAPE2.0" ||
        applicationId === "ANIMEXTS1.0" ||
        applicationId === "ICCRGBG1012";
      if (label !== 0xfe && (label !== 0xff || keepApplication)) {
        blocks.push(buffer.subarray(start, end));
      }
      position = end;
      continue;
    }

    if (marker === 0x2c) {
      if (position + 10 > buffer.length) throw new Error("Truncated GIF image descriptor.");
      const localTableSize = buffer[position + 9] & 0x80
        ? 3 * (2 ** ((buffer[position + 9] & 0x07) + 1))
        : 0;
      position += 10 + localTableSize;
      if (position >= buffer.length) throw new Error("Truncated GIF image data.");
      position += 1;
      position = gifSubBlocksEnd(buffer, position);
      blocks.push(buffer.subarray(start, position));
      continue;
    }

    throw new Error("Unsupported GIF block marker.");
  }

  throw new Error("GIF trailer is missing.");
}

export function sanitizeImageMetadata(buffer, mimeType) {
  if (mimeType === "image/jpeg") return stripJpegMetadata(buffer);
  if (mimeType === "image/png") return stripPngMetadata(buffer);
  if (mimeType === "image/webp") return stripWebpMetadata(buffer);
  if (mimeType === "image/gif") return stripGifMetadata(buffer);
  return buffer;
}
