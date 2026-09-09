// Generates the app icons: the Jots mark — a clay "j" whose tittle floats free
// above the stem — in cream on olive. Pure Node, no image libraries.
//
// The mark is defined as signed distance fields so it can be rendered at any
// size and lit properly, rather than traced by hand per resolution.
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
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  const raw = Buffer.alloc(h * (w * 3 + 1));
  for (let y = 0; y < h; y++) {
    raw[y * (w * 3 + 1)] = 0;
    rgb.copy(raw, y * (w * 3 + 1) + 1, y * w * 3, (y + 1) * w * 3);
  }
  writeFileSync(
    path,
    Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      chunk("IHDR", ihdr),
      chunk("IDAT", deflateSync(raw, { level: 9 })),
      chunk("IEND", Buffer.alloc(0)),
    ]),
  );
  console.log("wrote", path, `${w}x${h}`);
}

// ---- palette ----
const OLIVE = [0x57, 0x56, 0x18];
const OLIVE_DEEP = [0x3d, 0x3c, 0x0e];
const CREAM = [0xf4, 0xf1, 0xe9];

// ---- geometry of the mark, in unit space (-1..1, y down) ----
const T = 0.175; // stroke half-thickness
const STEM_X = 0.26;
const STEM_TOP = -0.16;
const STEM_BOT = 0.2;
const HOOK_C = [0.0, 0.2];
const HOOK_R = 0.26;
const HOOK_A1 = (152 * Math.PI) / 180;
const DOT_C = [0.26, -0.56];
const DOT_R = 0.205;

function sdSegment(px, py, ax, ay, bx, by) {
  const pax = px - ax;
  const pay = py - ay;
  const bax = bx - ax;
  const bay = by - ay;
  const h = Math.max(0, Math.min(1, (pax * bax + pay * bay) / (bax * bax + bay * bay)));
  return Math.hypot(pax - bax * h, pay - bay * h);
}

/** Distance to a circular arc sweeping from angle 0 to a1 (radians, y down). */
function sdArc(px, py, cx, cy, r, a1) {
  const dx = px - cx;
  const dy = py - cy;
  let a = Math.atan2(dy, dx);
  if (a < 0) a += Math.PI * 2;
  if (a >= 0 && a <= a1) return Math.abs(Math.hypot(dx, dy) - r);
  const e0 = [cx + r, cy];
  const e1 = [cx + r * Math.cos(a1), cy + r * Math.sin(a1)];
  return Math.min(Math.hypot(px - e0[0], py - e0[1]), Math.hypot(px - e1[0], py - e1[1]));
}

/** Distance to the j's stroke centreline (stem + hook), and to the tittle. */
function strokeDist(x, y) {
  return Math.min(
    sdSegment(x, y, STEM_X, STEM_TOP, STEM_X, STEM_BOT),
    sdArc(x, y, HOOK_C[0], HOOK_C[1], HOOK_R, HOOK_A1),
  );
}
function dotDist(x, y) {
  return Math.hypot(x - DOT_C[0], y - DOT_C[1]);
}

// key light from the upper left, slightly in front
const L = (() => {
  const v = [-0.42, -0.58, 0.70];
  const m = Math.hypot(...v);
  return v.map((c) => c / m);
})();

function shade(base, d, radius) {
  // Treat the stroke as a half-round tube: height falls off toward the edge.
  const t = Math.min(1, d / radius);
  const nz = Math.sqrt(Math.max(0.0001, 1 - t * t));
  return { nz, t };
}

/** Colour at unit coords, or null for background. */
function sampleMark(x, y) {
  const ds = strokeDist(x, y) - T;
  const dd = dotDist(x, y) - DOT_R;

  if (dd <= 0) {
    // sphere normal
    const nx = (x - DOT_C[0]) / DOT_R;
    const ny = (y - DOT_C[1]) / DOT_R;
    const nz = Math.sqrt(Math.max(0.0001, 1 - nx * nx - ny * ny));
    const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const k = 0.52 + 0.62 * diff;
    // tight specular so it reads as a rounded ball
    const spec = Math.pow(Math.max(0, nz * 0.55 + diff), 14) * 0.5;
    return CREAM.map((c) => Math.min(255, c * k + 255 * spec));
  }

  if (ds <= 0) {
    const dist = strokeDist(x, y);
    // approximate the tube normal from the gradient of the distance field
    const e = 0.004;
    const gx = (strokeDist(x + e, y) - strokeDist(x - e, y)) / (2 * e);
    const gy = (strokeDist(x, y + e) - strokeDist(x, y - e)) / (2 * e);
    const { nz, t } = shade(CREAM, dist, T);
    const nx = gx * t;
    const ny = gy * t;
    const diff = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const k = 0.5 + 0.64 * diff;
    return CREAM.map((c) => Math.min(255, c * k));
  }
  return null;
}

/** Soft contact shadow: the mark, offset down-right and blurred. */
function shadowAt(x, y) {
  const ox = x - 0.055;
  const oy = y - 0.085;
  const d = Math.min(strokeDist(ox, oy) - T, dotDist(ox, oy) - DOT_R);
  if (d > 0.11) return 0;
  return Math.min(1, Math.max(0, 1 - d / 0.11)) * 0.5;
}

function draw(size, { scale = 1 }) {
  const rgb = Buffer.alloc(size * size * 3);
  const SS = 3; // supersample
  for (let py = 0; py < size; py++) {
    for (let px = 0; px < size; px++) {
      let r = 0;
      let g = 0;
      let b = 0;
      for (let sy = 0; sy < SS; sy++) {
        for (let sx = 0; sx < SS; sx++) {
          // offset by the mark's bounding-box centre so it sits optically centred
          const x = (((px + (sx + 0.5) / SS) / size) * 2 - 1) / scale + 0.03;
          const y = (((py + (sy + 0.5) / SS) / size) * 2 - 1) / scale - 0.065;

          // olive ground with a gentle vertical lift
          const lift = 1 + (1 - (y + 1) / 2) * 0.1;
          let c = OLIVE.map((v) => Math.min(255, v * lift));

          const sh = shadowAt(x, y);
          if (sh > 0) c = c.map((v, i) => v * (1 - sh) + OLIVE_DEEP[i] * sh);

          const m = sampleMark(x, y);
          if (m) c = m;

          r += c[0];
          g += c[1];
          b += c[2];
        }
      }
      const n = SS * SS;
      const i = (py * size + px) * 3;
      rgb[i] = r / n;
      rgb[i + 1] = g / n;
      rgb[i + 2] = b / n;
    }
  }
  return rgb;
}

// scale < 1 zooms out, leaving more olive around the mark
writePNG(join(outDir, "icon-512.png"), 512, 512, draw(512, { scale: 0.78 }));
writePNG(join(outDir, "icon-192.png"), 192, 192, draw(192, { scale: 0.78 }));
// maskable: Android crops to a circle, so keep the mark well inside the safe zone
writePNG(join(outDir, "maskable-512.png"), 512, 512, draw(512, { scale: 0.56 }));
writePNG(join(outDir, "apple-touch-icon.png"), 180, 180, draw(180, { scale: 0.74 }));
