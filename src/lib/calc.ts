import { FAMILIES, KEYS, SHADES } from "./constants";
import type { EventMap, Roast } from "../types";

/** 65 -> "1:05" */
export function fmt(s: number): string {
  s = Math.max(0, Math.floor(s));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
}

/** Like fmt, but keeps the sign — preheat times are negative (before charge). */
export function fmtSigned(s: number): string {
  return (s < 0 ? "−" : "") + fmt(Math.abs(s));
}

/** Heat-dial color ramp, straw yellow -> deep red. */
export function ramp(n: number): string[] {
  const A = [231, 193, 92];
  const B = [172, 59, 36];
  return Array.from({ length: n }, (_, i) => {
    const t = n === 1 ? 1 : i / (n - 1);
    return (
      "#" +
      A.map((v, j) =>
        Math.round(v + (B[j] - v) * t)
          .toString(16)
          .padStart(2, "0"),
      ).join("")
    );
  });
}

export interface StampSource {
  origin: string;
  count?: number;
  date?: string;
  firstTs?: number;
}

/** Group roasts by origin into passport stamps, oldest first. */
export function originStamps(roasts: Roast[]): StampSource[] {
  const m: Record<string, { origin: string; count: number; firstTs: number }> = {};
  roasts.forEach((r) => {
    const o = (r.origin || "").trim();
    if (!o) return;
    const k = o.toLowerCase();
    if (!m[k]) m[k] = { origin: o, count: 0, firstTs: r.createdAt };
    m[k].count++;
    if (r.createdAt < m[k].firstTs) m[k].firstTs = r.createdAt;
  });
  return Object.values(m)
    .sort((a, b) => a.firstTs - b.firstTs)
    .map((s) => ({
      ...s,
      date: new Date(s.firstTs)
        .toLocaleDateString(undefined, { month: "short", year: "2-digit" })
        .replace(" ", " '"),
    }));
}

export interface StampSpec {
  c: string;
  size: number;
  dy: number;
  ml: number;
  rot: number;
  bs: "solid" | "dashed";
  bg: string;
  op: number;
  top: string;
  origin: string;
  fsTop: string;
  fsName: string;
  mid: string;
  fsMid: string;
  date: string;
  fsDate: string;
}

const STAMP_COLORS = ["#A9613A", "#575618", "#3B4A6B", "#7A5230", "#4A6B3B"];

/** Turn an origin into a tilted circular ink stamp spec. */
export function stampify(s: StampSource, i: number, size: number, locked: boolean, dy = 0, ml = 0): StampSpec {
  const c = locked ? "#8F8776" : STAMP_COLORS[i % STAMP_COLORS.length];
  return {
    c,
    size,
    dy,
    ml,
    rot: (i % 2 === 0 ? -1 : 1) * (3 + (i % 3) * 3),
    bs: locked ? "dashed" : "solid",
    bg: locked ? "transparent" : c + "14",
    op: locked ? 0.55 : 1,
    top: locked ? "TO ROAST" : "ROASTED",
    origin: s.origin,
    fsTop: (size * 0.085).toFixed(1),
    fsName: (s.origin.length > 9 ? size * 0.115 : size * 0.15).toFixed(1),
    mid: locked ? "?" : "×" + (s.count || 1),
    fsMid: (size * (locked ? 0.15 : 0.11)).toFixed(1),
    date: locked ? "" : s.date || "",
    fsDate: (size * 0.08).toFixed(1),
  };
}

export interface CurveGeom {
  path: string;
  dots: { x: string; y: string }[];
  shadeSegs: { left: string; w: string; c: string }[];
  dropT: number;
}

/** Compact curve used by the share card. */
export function curveFor(r: Roast): CurveGeom | null {
  const ev: EventMap = r.events || {};
  const pts = KEYS.map((k) => (ev[k] ? { k, ...ev[k]! } : null)).filter(Boolean) as ({ k: string } & {
    t: number;
    watts: number;
    shade?: number;
  })[];
  if (pts.length < 2) return null;
  const dropT = ev.drop ? ev.drop.t : r.durationSec || pts[pts.length - 1].t;
  const ws = pts.map((p) => p.watts);
  let lo = Math.min(...ws);
  let hi = Math.max(...ws);
  const span = Math.max(40, hi - lo);
  lo = Math.floor((lo - span * 0.18) / 10) * 10;
  hi = Math.ceil((hi + span * 0.18) / 10) * 10;
  // Preheat sits at negative time, so the domain starts at min(0, t).
  const minT = Math.min(0, ...pts.map((p) => p.t));
  const spanT = (dropT || 1) - minT || 1;
  const X = (t: number) => 3 + ((t - minT) / spanT) * 94;
  const Y = (w: number) => 8 + (1 - (w - lo) / (hi - lo)) * 84;
  const kk = KEYS.filter((k) => ev[k]);
  const shadeSegs: CurveGeom["shadeSegs"] = [];
  kk.forEach((k, i) => {
    const e = ev[k]!;
    const n = kk[i + 1] ? ev[kk[i + 1]]! : null;
    if (e.shade == null) return;
    const t1 = n ? n.t : dropT;
    shadeSegs.push({
      left: X(e.t).toFixed(2),
      w: (X(t1) - X(e.t)).toFixed(2),
      c: SHADES[e.shade].c,
    });
  });
  return {
    path: pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(2) + "," + Y(p.watts).toFixed(2)).join(" "),
    dots: pts.map((p) => ({ x: X(p.t).toFixed(2), y: Y(p.watts).toFixed(2) })),
    shadeSegs,
    dropT,
  };
}

export interface WheelGeom {
  rings: { pts: string; tickY: string; tick: string }[];
  spokes: { x: string; y: string }[];
  poly: string;
  labels: { name: string; val: string; left: string; top: string; bg: string; fg: string; bd: string }[];
  tips: { x: string; y: string; t: string; c: string; op: number }[];
  vertexDots: { x: string; y: string; c: string; r: number }[];
  chips: { name: string; c: string; dots: string }[];
}

const ABBR: Record<string, string> = {
  Fruity: "FR",
  Sweet: "SW",
  "Nutty/Cocoa": "NU",
  Spicy: "SP",
  Floral: "FL",
  Herbal: "HE",
  Roasted: "RO",
  Earthy: "EA",
};

/** Radar-wheel geometry for a flavors map (family -> 0-5). */
export function wheelGeom(flavors: Record<string, number>): WheelGeom {
  const R = 62;
  const CTR = 100;
  const n = FAMILIES.length;
  const pt = (i: number, r: number): [number, number] => {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    return [CTR + Math.cos(a) * r, CTR + Math.sin(a) * r];
  };
  const rings = [1, 2, 3, 4, 5].map((k) => ({
    pts: FAMILIES.map((_, i) =>
      pt(i, (R * k) / 5)
        .map((v) => v.toFixed(1))
        .join(","),
    ).join(" "),
    tickY: (CTR - (R * k) / 5 + 3).toFixed(1),
    tick: String(k),
  }));
  const spokes = FAMILIES.map((_, i) => {
    const p = pt(i, R);
    return { x: p[0].toFixed(1), y: p[1].toFixed(1) };
  });
  const poly = FAMILIES.map((f, i) =>
    pt(i, R * ((flavors[f.name] || 0) / 5))
      .map((v) => v.toFixed(1))
      .join(","),
  ).join(" ");
  const labels = FAMILIES.map((f, i) => {
    const a = ((-90 + i * (360 / n)) * Math.PI) / 180;
    const v = flavors[f.name] || 0;
    return {
      name: f.name,
      val: String(v),
      left: (50 + Math.cos(a) * 43).toFixed(1),
      top: (50 + Math.sin(a) * 43).toFixed(1),
      bg: v ? f.c : "#EFEBE2",
      fg: v ? (f.name === "Floral" ? "#241D16" : "#F4F1E9") : "#6B6154",
      bd: v ? f.c : "#B7AF9F",
    };
  });
  const tips = FAMILIES.map((f, i) => {
    const p = pt(i, R + 16);
    const v = flavors[f.name] || 0;
    return { x: p[0].toFixed(1), y: (p[1] + 3.5).toFixed(1), t: ABBR[f.name], c: v ? f.c : "#A39B8B", op: v ? 1 : 0.55 };
  });
  const vertexDots = FAMILIES.map((f, i) => {
    const v = flavors[f.name] || 0;
    const p = pt(i, R * (v / 5));
    return { x: p[0].toFixed(1), y: p[1].toFixed(1), c: v ? f.c : "#B7AF9F", r: v ? 4.6 : 2.2 };
  });
  const chips = FAMILIES.filter((f) => flavors[f.name])
    .sort((x, y) => flavors[y.name] - flavors[x.name])
    .map((f) => ({ name: f.name, c: f.c, dots: "●".repeat(Math.round(flavors[f.name])) }));
  return { rings, spokes, poly, labels, chips, tips, vertexDots };
}

export const avg = (a: number[]): number | null => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : null);

export const lossPct = (r: { greenWeight?: number; roastedWeight?: number | null }): number | null =>
  typeof r.roastedWeight === "number" && r.greenWeight
    ? ((r.greenWeight - r.roastedWeight) / r.greenWeight) * 100
    : null;
