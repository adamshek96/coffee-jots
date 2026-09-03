import Dexie, { type Table } from "dexie";
import type { ActiveRoast, Bean, Device, Roast, Settings } from "./types";

/** All Dexie access lives in this file. */

interface KV {
  key: string;
  value: unknown;
}

class JotsDB extends Dexie {
  roasts!: Table<Roast, string>;
  beans!: Table<Bean, string>;
  devices!: Table<Device, string>;
  settings!: Table<KV, string>;

  constructor() {
    super("coffeejots");
    this.version(1).stores({
      roasts: "id, createdAt, beanName, origin",
      beans: "id, name",
      devices: "id",
      settings: "key",
    });
  }
}

export const db = new JotsDB();

export const DEFAULT_DEVICE: Device = {
  id: "d1",
  name: "Popper",
  metric: "watts",
  heatMax: 7,
  fan: "ohl",
  coolDefault: 180,
  note: "air roaster · watt meter clipped on",
};

export const DEFAULT_PROFILE = {
  displayName: "",
  roastery: "",
  avatar: null,
  since: null,
};

export const DEFAULT_LOCK = {
  mode: "none" as const,
  credentialId: null,
  passcodeHash: null,
  passcodeSalt: null,
  backupCode: null,
  autoLockMinutes: 15,
};

export const DEFAULT_SETTINGS: Settings = {
  activeDeviceId: DEFAULT_DEVICE.id,
  wishlist: [],
  onboarded: false,
  published: {},
  lock: "faceid",
  lastExportAt: null,
  profile: DEFAULT_PROFILE,
  lockCfg: DEFAULT_LOCK,
};

const LEGACY_KEY = "coffeejots.db.v1";

/** One-time import of the prototype's localStorage blob, if present. */
async function migrateFromLocalStorage(): Promise<void> {
  const done = await db.settings.get("migratedLegacy");
  if (done) return;
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (raw) {
      const legacy = JSON.parse(raw);
      if (legacy && Array.isArray(legacy.roasts)) {
        const existing = await db.roasts.count();
        if (existing === 0) {
          await db.transaction("rw", db.roasts, db.beans, db.devices, db.settings, async () => {
            await db.roasts.bulkPut(legacy.roasts);
            if (Array.isArray(legacy.beans)) await db.beans.bulkPut(legacy.beans);
            if (Array.isArray(legacy.devices) && legacy.devices.length) await db.devices.bulkPut(legacy.devices);
            const s: Settings = {
              ...DEFAULT_SETTINGS,
              activeDeviceId: legacy.activeDeviceId || DEFAULT_SETTINGS.activeDeviceId,
              wishlist: legacy.wishlist || [],
              onboarded: !!legacy.onboarded,
              published: legacy.published || {},
            };
            await db.settings.put({ key: "settings", value: s });
            if (legacy.active) await db.settings.put({ key: "active", value: legacy.active });
          });
        }
      }
    }
  } catch {
    // a corrupt legacy blob should never block the app
  }
  await db.settings.put({ key: "migratedLegacy", value: true });
}

export interface LoadedDB {
  roasts: Roast[];
  beans: Bean[];
  devices: Device[];
  settings: Settings;
  active: ActiveRoast | null;
}

export async function loadAll(): Promise<LoadedDB> {
  await migrateFromLocalStorage();
  let devices = await db.devices.toArray();
  if (devices.length === 0) {
    await db.devices.put(DEFAULT_DEVICE);
    devices = [DEFAULT_DEVICE];
  }
  const roasts = await db.roasts.orderBy("createdAt").reverse().toArray();
  const beans = await db.beans.toArray();
  const settingsRow = await db.settings.get("settings");
  const stored = (settingsRow?.value as Partial<Settings>) || {};
  // profile/lockCfg are nested, so merge them explicitly — journals saved before
  // these existed must still pick up the defaults rather than get `undefined`.
  const settings: Settings = {
    ...DEFAULT_SETTINGS,
    ...stored,
    profile: { ...DEFAULT_PROFILE, ...(stored.profile || {}) },
    lockCfg: { ...DEFAULT_LOCK, ...(stored.lockCfg || {}) },
  };
  if (!devices.find((d) => d.id === settings.activeDeviceId)) settings.activeDeviceId = devices[0].id;
  const activeRow = await db.settings.get("active");
  const active = (activeRow?.value as ActiveRoast | null) || null;
  return { roasts, beans, devices, settings, active };
}

export async function saveRoast(r: Roast): Promise<void> {
  await db.roasts.put(r);
}

export async function saveRoasts(rs: Roast[]): Promise<void> {
  await db.roasts.bulkPut(rs);
}

export async function replaceRoasts(rs: Roast[]): Promise<void> {
  await db.transaction("rw", db.roasts, async () => {
    await db.roasts.clear();
    await db.roasts.bulkPut(rs);
  });
}

export async function saveBean(b: Bean): Promise<void> {
  await db.beans.put(b);
}

export async function replaceBeans(bs: Bean[]): Promise<void> {
  await db.transaction("rw", db.beans, async () => {
    await db.beans.clear();
    await db.beans.bulkPut(bs);
  });
}

export async function saveDevice(d: Device): Promise<void> {
  await db.devices.put(d);
}

export async function deleteDevice(id: string): Promise<void> {
  await db.devices.delete(id);
}

export async function replaceDevices(ds: Device[]): Promise<void> {
  await db.transaction("rw", db.devices, async () => {
    await db.devices.clear();
    await db.devices.bulkPut(ds);
  });
}

export async function saveSettings(s: Settings): Promise<void> {
  await db.settings.put({ key: "settings", value: s });
}

export async function saveActive(a: ActiveRoast | null): Promise<void> {
  await db.settings.put({ key: "active", value: a });
}

export async function storageEstimate(): Promise<string> {
  try {
    const est = await navigator.storage?.estimate?.();
    if (est?.usage != null) {
      const kb = est.usage / 1024;
      return kb > 1024 ? (kb / 1024).toFixed(1) + " MB" : kb.toFixed(1) + " KB";
    }
  } catch {
    /* not supported */
  }
  return "—";
}
