// Generates the PWA icons: a tilted rust ink-stamp ring with a coffee bean,
// on the app's paper background. Pure Node — no image libraries.
import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "public", "icons");
mkdirSync(outDir, { recursive: true });

// ---- tiny PNG encoder (RGB, 8-bit) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (const b of buf) c = CRC_TABLE[(c ^ b) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length);
  const body = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body));
  return Buffer.concat([len, body, crc]);
}
function writePNG(path, w, h, rgb) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // color type RGB
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0; // filter none
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
  writeFileSync(path, png);
  console.log("wrote", path, w + "x" + h);
}

// ---- drawing ----
const PAPER = [0xd6, 0xd1, 0xc7];
const RUST = [0xa9, 0x61, 0x3a];
const BEAN = [0x7a, 0x46, 0x26];

/** Color at unit coords (x,y in -1..1), stamp occupying the full unit circle. */
function sample(x, y) {
  // stamp tilt
  const a = (-8 * Math.PI) / 180;
  const rx = x * Math.cos(a) - y * Math.sin(a);
  const ry = x * Math.sin(a) + y * Math.cos(a);
  const r = Math.hypot(rx, ry);

  // outer + inner stamp rings
  if (Math.abs(r - 0.92) < 0.035) return RUST;
  if (Math.abs(r - 0.76) < 0.018) return RUST;
  if (r < 0.92) {
    // coffee bean: ellipse with an s-curve crease
    const bx = rx / 0.52;
    const by = ry / 0.36;
    if (bx * bx + by * by < 1) {
      const crease = 0.28 * Math.sin(bx * Math.PI * 0.9);
      if (Math.abs(by - crease) < 0.13) return PAPER;
      return BEAN;
    }
    // faint stamp fill
    return [0xcf, 0xc5, 0xb4];
  }
  return PAPER;
}

function draw(size, { pad = 0.06, solid = false } = {}) {
  const rgb = Buffer.alloc(size * size * 3);
  const scale = 1 - pad * 2;
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      // 2x2 supersample
      let cr = 0;
      let cg = 0;
      let cb = 0;
      for (const [ox, oy] of [
        [0.25, 0.25],
        [0.75, 0.25],
        [0.25, 0.75],
        [0.75, 0.75],
      ]) {
        const x = (((px + ox) / size) * 2 - 1) / scale;
        const y = (((py + oy) / size) * 2 - 1) / scale;
        const c = Math.abs(x) > 1 || Math.abs(y) > 1 ? PAPER : sample(x, y);
        cr += c[0];
        cg += c[1];
        cb += c[2];
      }
      const i = (py * size + px) * 3;
      rgb[i] = cr / 4;
      rgb[i + 1] = cg / 4;
      rgb[i + 2] = cb / 4;
    }
  }
  void solid;
  return rgb;
}

writePNG(join(outDir, "icon-512.png"), 512, 512, draw(512));
writePNG(join(outDir, "icon-192.png"), 192, 192, draw(192));
// maskable: extra safe-zone padding so the stamp survives the mask
writePNG(join(outDir, "maskable-512.png"), 512, 512, draw(512, { pad: 0.16 }));
writePNG(join(outDir, "apple-touch-icon.png"), 180, 180, draw(180, { pad: 0.1 }));
