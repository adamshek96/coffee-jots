export type MilestoneKey =
  | "preheat"
  | "charge"
  | "yellowing"
  | "browning"
  | "fc"
  | "fcEnds"
  | "extend"
  | "cooling"
  | "drop";

export interface RoastEvent {
  /**
   * Seconds relative to charge. Charge is always 0 so development %, phase
   * balance and batch-to-batch comparison stay meaningful; a preheat tap is
   * therefore negative (e.g. -90 = machine on 90s before the beans went in).
   */
  t: number;
  dial?: number;
  fan?: string | null;
  watts: number; // value of the device metric (watts or temp)
  shade?: number; // index into SHADES, 0-4
  sound?: string; // one of SOUNDS
}

export type EventMap = Partial<Record<MilestoneKey, RoastEvent>>;

/**
 * A colour/sound reading taken at any moment during the roast, independent of
 * milestone taps — you watch the beans continuously, not only at checkpoints.
 * `t` is charge-relative like RoastEvent (negative during preheat).
 */
export interface Observation {
  t: number;
  shade?: number; // index into SHADES
  sound?: string; // one of SOUNDS
}

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
  preheatSec?: number; // how long the machine warmed up before charge
  deviceName?: string;
  unit?: string;
  axis?: string;
  events: EventMap;
  observations?: Observation[];
  finishedAt?: number;
}

export interface Bean {
  id: string;
  name: string;
  origin?: string;
  region?: string;
  process?: string;
  desc?: string;
  /** Tasting profile lives with the bean, not the individual roast. */
  flavors?: Record<string, number>;
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
  coolWatts?: number; // metric value to drop to when Cooling is tapped
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
  coolWatts: number | null;
}

export interface Ghost {
  batch: number;
  rating: number;
  events: EventMap;
  durationSec?: number;
}

export type ActiveStatus = "idle" | "preheating" | "roasting" | "cooling" | "done";

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
  startedAt: number | null; // wall-clock ms of charge; elapsed is always recomputed
  preheatAt: number | null; // wall-clock ms the machine was switched on
  dial: number;
  fan: string | null;
  watts: number;
  events: EventMap;
  observations: Observation[];
  coolStartedAt: number | null;
  coolDuration: number;
  preheatSec?: number;
  /** Wall-clock ms of Drop — roast timing stops here. */
  droppedAt?: number | null;
}

export type LockMode = "none" | "passkey" | "passcode";

export interface LockConfig {
  mode: LockMode;
  credentialId: string | null; // passkey credential id (base64url)
  passcodeHash: string | null; // PBKDF2 hash (base64)
  passcodeSalt: string | null;
  backupCode: string | null; // recovery, shown during onboarding
  autoLockMinutes: number; // re-lock after this long away; 0 = only on launch
}

export interface Profile {
  displayName: string;
  roastery: string;
  avatar: string | null; // data URL, resized on import — stays on device
  since: number | null; // journal start date
}

export interface Settings {
  activeDeviceId: string;
  wishlist: string[];
  onboarded: boolean;
  published: Record<string, string>; // roastId -> token
  lock: string; // onboarding preference: "faceid" | "passcode" | "none"
  lastExportAt: number | null;
  profile: Profile;
  lockCfg: LockConfig;
  /** Absent on journals saved before haptics existed — read it as on. */
  haptics?: boolean;
}

export interface ExportShape {
  v: 1;
  exportedAt: string;
  roasts: Roast[];
  beans: Bean[];
  devices: Device[];
  wishlist: string[];
}
