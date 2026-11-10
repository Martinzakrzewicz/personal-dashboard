import { deflateSync } from 'node:zlib';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'public');
mkdirSync(outDir, { recursive: true });

const ACCENT = [59, 130, 246, 255];
const WHITE = [255, 255, 255, 255];
const WHITE_SOFT = [235, 243, 255, 255];

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const typeBuffer = Buffer.from(type, 'ascii');
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crc]);
}

function roundedRect(pixels, size, x, y, w, h, radius, color) {
  for (let py = Math.floor(y); py < Math.ceil(y + h); py += 1) {
    for (let px = Math.floor(x); px < Math.ceil(x + w); px += 1) {
      if (px < 0 || py < 0 || px >= size || py >= size) continue;
      const cx = Math.min(Math.max(px + 0.5, x + radius), x + w - radius);
      const cy = Math.min(Math.max(py + 0.5, y + radius), y + h - radius);
      const dx = px + 0.5 - cx;
      const dy = py + 0.5 - cy;
      if (dx * dx + dy * dy <= radius * radius) {
        const index = (py * size + px) * 4;
        pixels[index] = color[0];
        pixels[index + 1] = color[1];
        pixels[index + 2] = color[2];
        pixels[index + 3] = color[3];
      }
    }
  }
}

function renderIcon(size) {
  const scale = 4;
  const hi = size * scale;
  const big = new Uint8Array(hi * hi * 4);
  roundedRect(big, hi, 0, 0, hi, hi, 0, ACCENT);

  // Dashboard tiles, proportionally matching public/favicon.svg.
  const unit = hi / 64;
  const r = 4 * unit;
  roundedRect(big, hi, 13 * unit, 13 * unit, 17 * unit, 17 * unit, r, WHITE);
  roundedRect(big, hi, 34 * unit, 13 * unit, 17 * unit, 10 * unit, r, WHITE_SOFT);
  roundedRect(big, hi, 13 * unit, 34 * unit, 17 * unit, 17 * unit, r, WHITE_SOFT);
  roundedRect(big, hi, 34 * unit, 27 * unit, 17 * unit, 24 * unit, r, WHITE);

  const pixels = new Uint8Array(size * size * 4);
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const sums = [0, 0, 0, 0];
      for (let sy = 0; sy < scale; sy += 1) {
        for (let sx = 0; sx < scale; sx += 1) {
          const index = ((y * scale + sy) * hi + (x * scale + sx)) * 4;
          for (let c = 0; c < 4; c += 1) sums[c] += big[index + c];
        }
      }
      const out = (y * size + x) * 4;
      for (let c = 0; c < 4; c += 1) pixels[out + c] = Math.round(sums[c] / (scale * scale));
    }
  }

  const raw = Buffer.alloc((size * 4 + 1) * size);
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 4 + 1)] = 0;
    Buffer.from(pixels.buffer, y * size * 4, size * 4).copy(raw, y * (size * 4 + 1) + 1);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8;
  ihdr[9] = 6;
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw, { level: 9 })),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

const outputs = [
  ['pwa-192x192.png', 192],
  ['pwa-512x512.png', 512],
  ['apple-touch-icon.png', 180],
];

for (const [name, size] of outputs) {
  writeFileSync(resolve(outDir, name), renderIcon(size));
  console.log(`generated public/${name} (${size}x${size})`);
}
