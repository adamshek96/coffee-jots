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
  // By time, not by rail order: a heat change can be tapped before FC Ends, and
  // drawing the line in rail order would double it back on itself.
  const pts = (KEYS.map((k) => (ev[k] ? { k, ...ev[k]! } : null)).filter(Boolean) as ({ k: string } & {
    t: number;
    watts: number;
    shade?: number;
  })[]).sort((a, b) => a.t - b.t);
  if (pts.length < 2) return null;
  const dropT = ev.drop ? ev.drop.t : r.durationSec || pts[pts.length - 1].t;
  const ws = pts.map((p) => p.watts);
  let lo = Math.min(...ws);
  let hi = Math.max(...ws);
  const span = Math.max(40, hi - lo);
  // Neither watts nor a probe reading goes below zero, so the axis doesn't.
  lo = Math.max(0, Math.floor((lo - span * 0.18) / 10) * 10);
  hi = Math.ceil((hi + span * 0.18) / 10) * 10;
  // Preheat sits at negative time, so the domain starts at min(0, t).
  const minT = Math.min(0, ...pts.map((p) => p.t));
  const spanT = (dropT || 1) - minT || 1;
  const X = (t: number) => 3 + ((t - minT) / spanT) * 94;
  const Y = (w: number) => 8 + (1 - (w - lo) / (hi - lo)) * 84;
  const shadeSegs: CurveGeom["shadeSegs"] = [];
  // Same precedence as the detail view: observation timeline first, then the
  // per-milestone shades that pre-observation roasts carry.
  const shadeObs = (r.observations || []).filter((o) => o.shade != null).sort((x, y) => x.t - y.t);
  if (shadeObs.length) {
    shadeObs.forEach((o, i) => {
      const t1 = shadeObs[i + 1] ? shadeObs[i + 1].t : dropT;
      shadeSegs.push({ left: X(o.t).toFixed(2), w: (X(t1) - X(o.t)).toFixed(2), c: SHADES[o.shade!].c });
    });
  } else {
    const kk = KEYS.filter((k) => ev[k]).sort((a, b) => ev[a]!.t - ev[b]!.t);
    kk.forEach((k, i) => {
      const e = ev[k]!;
      const n = kk[i + 1] ? ev[kk[i + 1]]! : null;
      if (e.shade == null) return;
      shadeSegs.push({
        left: X(e.t).toFixed(2),
        w: (X(n ? n.t : dropT) - X(e.t)).toFixed(2),
        c: SHADES[e.shade].c,
      });
    });
  }
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

interface RoastLike {
  events?: EventMap;
  durationSec?: number;
}

/**
 * When the heat came off: Cooling if it was tapped, otherwise the Drop.
 *
 * Everything after this point is the beans coasting in a cold machine, which
 * is why it — not the Drop — is what the phases are measured against. Measured
 * this way drying, maillard and development account for the whole roast.
 */
export function heatOffAt(r: RoastLike): number {
  const ev = r.events || {};
  const total = ev.drop ? ev.drop.t : r.durationSec || 0;
  return ev.cooling ? ev.cooling.t : total;
}

export interface DevWindow {
  /** First crack. */
  start: number;
  /** Heat off — see heatOffAt. */
  end: number;
  /**
   * Where the heat was changed inside the window, if it was, and which way it
   * went: -1 down, 1 up, 0 when only the fan moved or nothing did.
   */
  heatChange: { t: number; dir: -1 | 0 | 1 } | null;
  seconds: number;
  /** Share of the heated roast spent developing, 0–1. */
  ratio: number;
}

/**
 * Development: first crack until the heat comes off.
 *
 * The heat-change mark is deliberately not a boundary. It records that the
 * heat moved part-way through — down to stop the beans running away, up to
 * drive them on — which is a variation in how you develop, not the end of
 * developing. Splitting the window there would report two short phases where
 * there is one long one, and would make a steered roast look under-developed
 * precisely because it was steered.
 *
 * This is the single definition; every development figure in the app reads it,
 * so the number on a share card can't drift from the one on the curve.
 */
export function devWindow(r: RoastLike): DevWindow | null {
  const ev = r.events || {};
  if (!ev.fc) return null;
  const end = heatOffAt(r);
  if (!end || end <= ev.fc.t) return null;

  const dir = heatChangeDir(ev);
  return {
    start: ev.fc.t,
    end,
    heatChange: ev.extend ? { t: ev.extend.t, dir: dir ?? 0 } : null,
    seconds: end - ev.fc.t,
    ratio: (end - ev.fc.t) / end,
  };
}

/**
 * Which way the heat moved at the change: -1 down, 1 up, 0 if only the fan
 * did. Null when there was no change to report.
 *
 * Compared against whatever was in force just before the tap — the previous
 * milestone, usually first crack, or FC Ends if the change came after it. The
 * dial leads where the machine has one, since the meter only follows it.
 */
export function heatChangeDir(ev: EventMap): -1 | 0 | 1 | null {
  const ex = ev.extend;
  if (!ex) return null;
  const before = KEYS.filter((k) => ev[k] && ev[k]!.t < ex.t)
    .map((k) => ev[k]!)
    .sort((a, b) => a.t - b.t)
    .pop();
  if (!before) return 0;
  if (before.dial != null && ex.dial != null && ex.dial !== before.dial) return ex.dial > before.dial ? 1 : -1;
  if (ex.watts !== before.watts) return ex.watts > before.watts ? 1 : -1;
  return 0;
}

/** "↓ eased" / "↑ raised" / "changed" — direction as a fingertip-sized label. */
export const heatChangeLabel = (dir: -1 | 0 | 1): string =>
  dir < 0 ? "↓ eased" : dir > 0 ? "↑ raised" : "changed";

/** "eased" / "raised" / "changed", from which way the heat actually went. */
export const heatChangeVerb = (dir: -1 | 0 | 1): string =>
  dir < 0 ? "eased" : dir > 0 ? "raised" : "changed";

/** Development as a whole-number percent, the figure shown on cards. */
export const devPct = (r: RoastLike): number | null => {
  const d = devWindow(r);
  return d ? Math.round(d.ratio * 100) : null;
};

export interface StackedCurve {
  id: string;
  label: string;
  path: string;
  fc: { x: string; y: string } | null;
  /** 0 = four stars or better, 1 = rated below that, 2 = never rated. */
  band: 0 | 1 | 2;
}

export interface StackedGeom {
  curves: StackedCurve[];
  unit: string;
  yTicks: { topPct: string; label: string }[];
  xTicks: { leftPct: string; label: string }[];
  /** Where t=0 falls — first crack when aligned, otherwise charge. */
  originPct: string;
  /** Roasts left out: too few points, wrong unit, or no first crack to align on. */
  skipped: number;
}

/** Roughly four to six gridlines, on a step that reads as a round time. */
const niceStep = (span: number): number => [30, 60, 120, 180, 300, 600, 900].find((s) => span / s <= 6) || 1800;

/**
 * Every roast's curve on one pair of axes.
 *
 * `alignFc` slides each curve so first crack sits at zero. Left as logged, the
 * curves fan out by however long each roast took to get going, which buries the
 * thing worth comparing; aligned, the development tails stack up against each
 * other and the shape of a good roast is actually visible.
 */
export function stackedCurves(roasts: Roast[], alignFc: boolean): StackedGeom | null {
  // Watts and °F on one axis would be meaningless, so the chart speaks whichever
  // unit most of the journal is in and reports how many roasts that left out.
  const tally: Record<string, number> = {};
  roasts.forEach((r) => {
    const u = r.unit || "W";
    tally[u] = (tally[u] || 0) + 1;
  });
  const unit = Object.keys(tally).sort((a, b) => tally[b] - tally[a])[0];
  if (!unit) return null;

  const prepped: { r: Roast; pts: { t: number; w: number }[]; fcT: number | null }[] = [];
  let skipped = 0;
  roasts.forEach((r) => {
    const ev = r.events || {};
    // Stop just short of heat-off. Cooling and the drop carry the machine's
    // cooled-down reading rather than anything you roasted with, and letting
    // them into the range squashes every curve into the top of the chart to
    // make room for a cliff that says nothing about the trajectory.
    const stop = heatOffAt(r);
    const pts = KEYS.filter((k) => ev[k] && ev[k]!.t < stop)
      .map((k) => ({ t: ev[k]!.t, w: ev[k]!.watts }))
      .sort((a, b) => a.t - b.t);
    const fcT = ev.fc ? ev.fc.t : null;
    if ((r.unit || "W") !== unit || pts.length < 2 || (alignFc && fcT == null)) {
      skipped++;
      return;
    }
    const off = alignFc ? fcT! : 0;
    prepped.push({ r, pts: pts.map((p) => ({ t: p.t - off, w: p.w })), fcT: fcT == null ? null : fcT - off });
  });
  if (!prepped.length) return null;

  const allT = prepped.flatMap((p) => p.pts.map((x) => x.t));
  const allW = prepped.flatMap((p) => p.pts.map((x) => x.w));
  const minT = Math.min(...allT);
  const maxT = Math.max(...allT);
  const spanT = maxT - minT || 1;
  let lo = Math.min(...allW);
  let hi = Math.max(...allW);
  const span = Math.max(40, hi - lo);
  // Neither watts nor a bean-probe reading can go below zero, so the axis doesn't.
  lo = Math.max(0, Math.floor((lo - span * 0.1) / 10) * 10);
  hi = Math.ceil((hi + span * 0.1) / 10) * 10;
  const X = (t: number) => 4 + ((t - minT) / spanT) * 92;
  const Y = (w: number) => 8 + (1 - (w - lo) / (hi - lo)) * 84;

  const curves: StackedCurve[] = prepped.map(({ r, pts, fcT }) => ({
    id: r.id,
    label: r.beanName + " #" + (r.batch || 1),
    path: pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(2) + "," + Y(p.w).toFixed(2)).join(" "),
    fc: fcT == null ? null : { x: X(fcT).toFixed(2), y: Y(r.events!.fc!.watts).toFixed(2) },
    band: !r.rating ? 2 : r.rating >= 4 ? 0 : 1,
  }));
  // Best-rated last so they land on top of the pile rather than under it.
  curves.sort((a, b) => b.band - a.band);

  const mid = Math.round((lo + hi) / 2 / 10) * 10;
  const step = niceStep(spanT);
  const xTicks: StackedGeom["xTicks"] = [];
  for (let t = Math.ceil(minT / step) * step; t <= maxT; t += step) {
    xTicks.push({ leftPct: X(t).toFixed(2), label: fmtSigned(t) });
  }

  return {
    curves,
    unit,
    yTicks: [hi, mid, lo].map((w) => ({ topPct: Y(w).toFixed(2), label: String(w) })),
    xTicks,
    originPct: X(0).toFixed(2),
    skipped,
  };
}
