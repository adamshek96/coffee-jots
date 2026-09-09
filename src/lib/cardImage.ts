import { curveFor, fmt, lossPct, originStamps, stampify } from "./calc";
import type { StampSpec } from "./calc";
import { C, LEVELS } from "./constants";
import type { Roast } from "../types";

/**
 * Real PNG export for the share cards. The prototype only toasted
 * "saved to Photos"; here we draw the same card with canvas and hand it to
 * the iOS share sheet (or download it elsewhere).
 */

const W = 1080;
const MONO = "'Space Mono', monospace";
const GROT = "'Space Grotesk', system-ui, sans-serif";

function paper(ctx: CanvasRenderingContext2D, w: number, h: number) {
  ctx.fillStyle = C.paperLight;
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = "rgba(183,175,159,0.4)";
  ctx.lineWidth = 1.5;
  for (let x = 0; x <= w; x += 48) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  for (let y = 0; y <= h; y += 48) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(w, y);
    ctx.stroke();
  }
  ctx.strokeStyle = "#A79E8C";
  ctx.lineWidth = 3;
  ctx.strokeRect(1.5, 1.5, w - 3, h - 3);
}

/**
 * The passport stamp, drawn on canvas so an exported PNG matches the screen.
 * Rings are stroked as jittered segments rather than true circles, which is
 * how the rough inked edge reads without SVG filters.
 */
function drawStamp(ctx: CanvasRenderingContext2D, s: StampSpec, cx: number, cy: number, scale = 1) {
  const r = (s.size / 2) * scale;
  const locked = s.bs === "dashed";

  // Seeded from the origin so a country stamps the same way every time.
  let seed = [...s.origin].reduce((a, ch) => a + ch.charCodeAt(0), 7);
  const rnd = () => {
    seed = (seed * 1103515245 + 12345) & 0x7fffffff;
    return seed / 0x7fffffff;
  };

  /** A ring drawn as short jittered arcs, with occasional gaps in the ink. */
  const inkRing = (radius: number, width: number, gapChance: number) => {
    const steps = 90;
    ctx.lineWidth = width;
    ctx.lineCap = "round";
    for (let i = 0; i < steps; i++) {
      if (rnd() < gapChance) continue;
      const a0 = (i / steps) * Math.PI * 2;
      const a1 = ((i + 1.15) / steps) * Math.PI * 2;
      const j = 1 + (rnd() - 0.5) * 0.016;
      ctx.beginPath();
      ctx.arc(0, 0, radius * j, a0, a1);
      ctx.stroke();
    }
  };

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate((s.rot * Math.PI) / 180);
  ctx.strokeStyle = s.c;
  ctx.fillStyle = s.c;
  ctx.globalAlpha = locked ? 0.5 : 0.88;

  if (locked) {
    ctx.setLineDash([5 * scale, 4 * scale]);
    ctx.lineWidth = 1.6 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.lineWidth = 1 * scale;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.68, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  } else {
    inkRing(r * 0.94, 1.5 * scale, 0.05);
    inkRing(r * 0.85, 3.6 * scale, 0.07);
    inkRing(r * 0.67, 1.1 * scale, 0.05);
    // serrated die edge
    ctx.lineWidth = 1.4 * scale;
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r * 0.904, Math.sin(a) * r * 0.904);
      ctx.lineTo(Math.cos(a) * r * 0.94, Math.sin(a) * r * 0.94);
      ctx.stroke();
    }
  }

  ctx.textAlign = "center";
  ctx.font = `700 ${Number(s.fsTop) * scale}px ${GROT}`;
  ctx.fillText(s.top, 0, -r * 0.3);
  ctx.font = `700 ${Number(s.fsName) * scale}px ${MONO}`;
  ctx.fillText(s.origin.toUpperCase(), 0, r * 0.08);
  ctx.font = `700 ${Number(s.fsMid) * scale}px ${MONO}`;
  ctx.fillText(s.mid, 0, r * 0.36);
  if (s.date) {
    ctx.font = `400 ${Number(s.fsDate) * scale}px ${MONO}`;
    ctx.globalAlpha *= 0.8;
    ctx.fillText(s.date, 0, r * 0.58);
  }
  ctx.restore();
}

export async function renderRoastCard(r: Roast, originCount: number): Promise<Blob> {
  await document.fonts.ready;
  const H = 1350;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  paper(ctx, W, H);

  const P = 66; // padding
  const ev = r.events || {};
  const drop = ev.drop ? ev.drop.t : r.durationSec || 0;
  const dev = ev.fc && drop ? Math.round(((drop - ev.fc.t) / drop) * 100) : null;
  const loss = lossPct(r);
  const LV = LEVELS.find((x) => x.name === r.roastLevel);
  const cg = curveFor(r);

  // header
  ctx.fillStyle = C.rust;
  ctx.font = `700 30px ${MONO}`;
  ctx.textAlign = "left";
  ctx.fillText("BATCH " + (r.batch || 1), P, P + 30);
  ctx.fillStyle = C.faint;
  ctx.textAlign = "right";
  ctx.font = `400 28px ${MONO}`;
  ctx.fillText(
    new Date(r.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" }),
    W - P,
    P + 30,
  );

  ctx.textAlign = "left";
  ctx.fillStyle = C.ink;
  ctx.font = `700 72px ${GROT}`;
  ctx.fillText(r.beanName, P, P + 128);
  ctx.fillStyle = C.muted;
  ctx.font = `400 30px ${MONO}`;
  ctx.fillText([r.origin, r.process, r.deviceName].filter(Boolean).join(" · "), P, P + 178);

  // curve
  const curveTop = P + 230;
  const curveH = 430;
  ctx.strokeStyle = C.hair;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(P, curveTop);
  ctx.lineTo(W - P, curveTop);
  ctx.moveTo(P, curveTop + curveH);
  ctx.lineTo(W - P, curveTop + curveH);
  ctx.stroke();
  if (cg) {
    const mapX = (x: number) => P + (x / 100) * (W - 2 * P);
    const mapY = (y: number) => curveTop + (y / 100) * curveH;
    ctx.strokeStyle = "#C0472B";
    ctx.lineWidth = 7;
    ctx.lineJoin = "round";
    ctx.lineCap = "round";
    ctx.beginPath();
    cg.path.split(" ").forEach((seg) => {
      const op = seg[0];
      const [x, y] = seg.slice(1).split(",").map(Number);
      if (op === "M") ctx.moveTo(mapX(x), mapY(y));
      else ctx.lineTo(mapX(x), mapY(y));
    });
    ctx.stroke();
    cg.dots.forEach((d) => {
      ctx.beginPath();
      ctx.arc(mapX(Number(d.x)), mapY(Number(d.y)), 11, 0, Math.PI * 2);
      ctx.fillStyle = C.paperLight;
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.stroke();
    });
    // shade strip
    const stripY = curveTop + curveH + 18;
    let sx = P;
    cg.shadeSegs.forEach((s) => {
      const w = (Number(s.w) / 100) * (W - 2 * P);
      ctx.fillStyle = s.c;
      ctx.fillRect(P + (Number(s.left) / 100) * (W - 2 * P), stripY, w, 26);
      sx += w;
    });
    ctx.fillStyle = C.faint;
    ctx.font = `400 24px ${MONO}`;
    ctx.fillText((r.axis || "watts") + " over time · no probe, by eye and ear", P, stripY + 70);
  }

  // stats
  const statsY = curveTop + curveH + 160;
  const stats: [string, string][] = [
    ["TIME", fmt(drop)],
    ["DEV", dev != null ? dev + "%" : "—"],
    ["LOSS", loss != null ? loss.toFixed(1) + "%" : "—"],
    ["EVEN", r.evenness ? r.evenness + "/5" : "—"],
  ];
  stats.forEach(([l, v], i) => {
    const x = P + i * ((W - 2 * P) / 4);
    ctx.fillStyle = C.faint;
    ctx.font = `400 24px ${MONO}`;
    ctx.fillText(l, x, statsY);
    ctx.fillStyle = C.ink;
    ctx.font = `700 46px ${MONO}`;
    ctx.fillText(v, x, statsY + 56);
  });

  // level pill + stars
  const footY = statsY + 160;
  if (r.roastLevel) {
    ctx.fillStyle = LV ? LV.c : C.hair;
    const tw = ctx.measureText(r.roastLevel).width;
    ctx.beginPath();
    ctx.roundRect(P, footY, tw + 70, 62, 31);
    ctx.fill();
    ctx.fillStyle = LV && !LV.light ? C.cream : C.ink;
    ctx.font = `600 30px ${GROT}`;
    ctx.fillText(r.roastLevel, P + 34, footY + 41);
  }
  if (r.rating) {
    ctx.fillStyle = C.rust;
    ctx.font = `400 44px ${GROT}`;
    ctx.fillText("★".repeat(r.rating), P, footY + 130);
  }
  ctx.fillStyle = C.faint;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText("COFFEE JOTS · ROASTING JOURNAL", P, H - P);

  // origin stamp
  if (r.origin) {
    const spec = stampify({ origin: r.origin, count: originCount }, 0, 76, false, 0, 0);
    drawStamp(ctx, spec, W - P - 130, footY + 80, 2.6);
  }

  return new Promise((res) => cv.toBlob((b) => res(b!), "image/png"));
}

export async function renderPassportPoster(roasts: Roast[]): Promise<Blob> {
  await document.fonts.ready;
  const stamps = originStamps(roasts);
  const perRow = 3;
  const rows = Math.max(1, Math.ceil(stamps.length / perRow));
  const H = 560 + rows * 320 + 120;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const ctx = cv.getContext("2d")!;
  paper(ctx, W, H);

  ctx.textAlign = "center";
  ctx.fillStyle = C.rust;
  ctx.font = `700 32px ${MONO}`;
  ctx.fillText("C O F F E E   P A S S P O R T", W / 2, 140);
  ctx.fillStyle = C.ink;
  ctx.font = `700 190px ${MONO}`;
  ctx.fillText(String(stamps.length), W / 2, 350);
  ctx.fillStyle = C.muted;
  ctx.font = `400 34px ${GROT}`;
  ctx.fillText("origins roasted at home", W / 2, 420);

  const DYS = [-12, 30, -30, 18, -6, 36];
  stamps.forEach((s, i) => {
    const spec = stampify(s, i, 88, false, 0, 0);
    const col = i % perRow;
    const row = Math.floor(i / perRow);
    const cx = W / 2 + (col - (perRow - 1) / 2) * 330;
    const cy = 620 + row * 320 + DYS[i % 6];
    drawStamp(ctx, { ...spec, date: s.date || "" }, cx, cy, 3);
  });

  ctx.fillStyle = C.faint;
  ctx.font = `400 24px ${MONO}`;
  ctx.fillText("COFFEE JOTS · ROASTING JOURNAL", W / 2, H - 70);

  return new Promise((res) => cv.toBlob((b) => res(b!), "image/png"));
}

/** iOS gets the share sheet (Save Image / Files); everything else downloads. */
export async function deliverImage(blob: Blob, filename: string): Promise<"shared" | "downloaded"> {
  const file = new File([blob], filename, { type: "image/png" });
  if (navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file] });
      return "shared";
    } catch {
      /* user cancelled or share failed — fall through to download */
    }
  }
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  return "downloaded";
}
