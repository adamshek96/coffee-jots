import type { FanKind, MetricKind, MilestoneKey } from "../types";

// ---- palette (see TWEAKING.md) ----
export const C = {
  paper: "#D6D1C7",
  card: "#E6E2D9",
  ink: "#241D16",
  muted: "#6B6154",
  hair: "#B7AF9F",
  olive: "#575618",
  rust: "#A9613A",
  cream: "#F4F1E9",
  field: "#EFEBE2",
  paperLight: "#EFEBE1",
  faint: "#8A8073",
  readoutBg: "#191B1F",
  readout: "#8FB4D6",
  compare: "#3B4A6B",
  oliveDeep: "#43420F",
  clayBrew: "#7A4C31",
};

export const PHASE: Record<string, string> = {
  drying: "#E7C15C",
  maillard: "#DE8A3B",
  development: "#C0472B",
  extended: "#8E3B22",
};

export const MONO = "'Space Mono', monospace";
export const GROT = "'Space Grotesk', system-ui, sans-serif";

// ---- flavor families ----
export const FAMILIES: { name: string; c: string }[] = [
  { name: "Fruity", c: "#C0472B" },
  { name: "Sweet", c: "#DE8A3B" },
  { name: "Nutty/Cocoa", c: "#7A5230" },
  { name: "Spicy", c: "#A9613A" },
  { name: "Floral", c: "#E7C15C" },
  { name: "Herbal", c: "#4A6B3B" },
  { name: "Roasted", c: "#241D16" },
  { name: "Earthy", c: "#6B6154" },
];

// 3×3 bean swatches behind the evenness 1-5 buttons
export const EVEN_DOTS: string[][] = [
  ["#E7C15C", "#3A2A18", "#C0842F", "#241D16", "#E0B558", "#8A5A25", "#2E2115", "#DE8A3B", "#6B4420"],
  ["#DDB055", "#4A3418", "#B0752B", "#8A5A25", "#D69A46", "#6B4420", "#3A2A18", "#C0842F", "#9A6528"],
  ["#C0842F", "#7A5230", "#A9613A", "#8A5A25", "#B0752B", "#6B4420", "#9A6528", "#A06B2E", "#7E5326"],
  ["#8E5F2B", "#7A5230", "#8A5A25", "#815829", "#7E5326", "#8A5A25", "#79512C", "#845A2A", "#7A5230"],
  ["#7F5629", "#7F5629", "#7F5629", "#7F5629", "#7F5629", "#7F5629", "#7F5629", "#7F5629", "#7F5629"],
];

export const EVEN_CAPTIONS = [
  "1 = patchy · 5 = uniform throughout",
  "1 — badly patchy, scorched next to pale",
  "2 — visibly uneven, mixed shades",
  "3 — mostly even, a few outliers",
  "4 — even, slight variation",
  "5 — uniform throughout",
];

// ---- bean color swatches during the roast ----
export const SHADES: { name: string; c: string }[] = [
  { name: "Green", c: "#8E9B6B" },
  { name: "Straw", c: "#D9BE7A" },
  { name: "Tan", c: "#B98650" },
  { name: "Brown", c: "#7A4626" },
  { name: "Dark", c: "#3A2116" },
];

export const SOUNDS = ["Quiet", "Ticking", "Snapping", "Rolling crackle"];

// ---- roast levels, light to dark ----
export const LEVELS: { name: string; c: string; light?: boolean }[] = [
  { name: "Cinnamon", c: "#CBA070", light: true },
  { name: "Light", c: "#B98650", light: true },
  { name: "City", c: "#A66C3A" },
  { name: "City+", c: "#8E5730" },
  { name: "Full City", c: "#7A4626" },
  { name: "Full City+", c: "#5E351D" },
  { name: "Vienna", c: "#442615" },
  { name: "French", c: "#2B180E" },
];

export const PROCESSES = ["Washed", "Honey", "Natural", "Anaerobic", "Wet Hulled", "Experimental"];

// ---- device metrics & fans ----
export const METRICS: Record<
  MetricKind,
  { key: MetricKind; label: string; unit: string; axis: string; steps: [number, number]; start: number }
> = {
  watts: { key: "watts", label: "Watts", unit: "W", axis: "watts", steps: [10, 5], start: 950 },
  tempF: { key: "tempF", label: "Temp", unit: "°F", axis: "temperature", steps: [10, 5], start: 380 },
  tempC: { key: "tempC", label: "Temp", unit: "°C", axis: "temperature", steps: [5, 2], start: 195 },
};

export const FANS: Record<FanKind, string[] | null> = {
  none: null,
  ohl: ["OFF", "LOW", "HIGH"],
  o123: ["OFF", "1", "2", "3"],
};

// ---- milestones, in rail order ----
export const KEYS: MilestoneKey[] = [
  "preheat",
  "charge",
  "yellowing",
  "browning",
  "fc",
  "fcEnds",
  "extend",
  "cooling",
  "drop",
];

export const MS: { key: MilestoneKey; label: string; hint: string }[] = [
  { key: "preheat", label: "Preheat", hint: "machine on, warming up" },
  { key: "charge", label: "Charge", hint: "beans in, roast time starts here" },
  { key: "yellowing", label: "Yellowing", hint: "drying done, straw color" },
  { key: "browning", label: "Browning", hint: "maillard, smells bready" },
  { key: "fc", label: "First Crack", hint: "first snaps" },
  { key: "fcEnds", label: "FC Ends", hint: "cracking slows" },
  { key: "extend", label: "Heat Change", hint: "optional — moved the heat, up or down" },
  { key: "cooling", label: "Cooling", hint: "heat off, fan high, coasting" },
  { key: "drop", label: "Drop", hint: "ends the roast, stops the clock" },
];

/** Milestones that are optional — the roast is complete without them. */
export const OPTIONAL_MS: MilestoneKey[] = ["preheat", "extend", "cooling"];

// origins offered as ghost stamps in the Passport
export const GHOST_ORIGINS = ["Costa Rica", "Indonesia", "Yemen", "Rwanda", "Honduras", "Peru", "Panama", "Burundi"];
