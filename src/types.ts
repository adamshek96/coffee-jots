export type MilestoneKey =
  | "charge"
  | "yellowing"
  | "browning"
  | "fc"
  | "fcEnds"
  | "cooling"
  | "drop";

export interface RoastEvent {
  t: number; // seconds since charge
  dial?: number;
  fan?: string | null;
  watts: number; // value of the device metric (watts or temp)
  shade?: number; // index into SHADES, 0-4
  sound?: string; // one of SOUNDS
}

export type EventMap = Partial<Record<MilestoneKey, RoastEvent>>;

export interface Roast {
  id: string;
  createdAt: number;
  beanId?: string;
  beanName: string;
  origin?: string;
  process?: string;
  beanDesc?: string;
  batch?: number;
  greenWeight: number;
  roastedWeight?: number | null;
  roastLevel?: string;
  evenness?: number;
  rating?: number;
  notes?: string;
  flavors?: Record<string, number>; // family -> 0-5
  durationSec?: number;
  deviceName?: string;
  unit?: string;
  axis?: string;
  events: EventMap;
  finishedAt?: number;
}

export interface Bean {
  id: string;
  name: string;
  origin?: string;
  process?: string;
  desc?: string;
}

export type MetricKind = "watts" | "tempF" | "tempC";
export type FanKind = "none" | "ohl" | "o123";

export interface Device {
  id: string;
  name: string;
  metric: MetricKind;
  heatMax: number; // 0 = no heat dial
  fan: FanKind;
  coolDefault: number; // seconds
  note?: string;
}

/** Frozen snapshot of the device profile a roast runs on. */
export interface DevSnap {
  id: string;
  name: string;
  label: string;
  unit: string;
  axis: string;
  steps: [number, number];
  heatMax: number;
  fanOpts: string[] | null;
  coolDefault: number;
}

export interface Ghost {
  batch: number;
  rating: number;
  events: EventMap;
  durationSec?: number;
}

export type ActiveStatus = "idle" | "roasting" | "cooling";

export interface ActiveRoast {
  id: string;
  createdAt: number;
  beanId?: string;
  beanName: string;
  origin?: string;
  process?: string;
  beanDesc?: string;
  greenWeight: number;
  batch: number;
  ghost: Ghost | null;
  device: DevSnap;
  deviceName: string;
  unit: string;
  axis: string;
  status: ActiveStatus;
  startedAt: number | null; // wall-clock ms; elapsed is always recomputed
  dial: number;
  fan: string | null;
  watts: number;
  events: EventMap;
  coolStartedAt: number | null;
  coolDuration: number;
}

export interface Settings {
  activeDeviceId: string;
  wishlist: string[];
  onboarded: boolean;
  published: Record<string, string>; // roastId -> token
  lock: string; // "faceid" | "passcode" | "none" — recorded, not enforced in v1
  lastExportAt: number | null;
}

export interface ExportShape {
  v: 1;
  exportedAt: string;
  roasts: Roast[];
  beans: Bean[];
  devices: Device[];
  wishlist: string[];
}
