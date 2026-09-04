import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_SETTINGS,
  deleteDevice as dbDeleteDevice,
  loadAll,
  replaceBeans,
  replaceDevices,
  replaceRoasts,
  saveActive,
  saveBean,
  saveDevice,
  saveRoast,
  saveSettings,
} from "./db";
import { FANS, METRICS, MS } from "./lib/constants";
import { vibrate } from "./lib/haptics";
import { createPasskey, generateBackupCode, hashPasscode, randomSalt, safeEqual } from "./lib/lock";
import type {
  ActiveRoast,
  Bean,
  Device,
  DevSnap,
  ExportShape,
  MilestoneKey,
  Profile,
  Roast,
  Settings,
} from "./types";

export type Screen =
  | "onboard"
  | "home"
  | "setup"
  | "live"
  | "post"
  | "detail"
  | "passport"
  | "analytics"
  | "devices"
  | "device"
  | "share"
  | "profile";

export interface AppState {
  loaded: boolean;
  locked: boolean;
  screen: Screen;
  q: string;
  detailId: string | null;
  roasts: Roast[];
  beans: Bean[];
  devices: Device[];
  settings: Settings;
  active: ActiveRoast | null;
  draft: Device | null;
  obsKey: MilestoneKey | null;
  ghostOn: boolean;
  compareId: string | null;
  shareKind: "roast" | "passport" | null;
  shareId: string | null;
  toast: string;
  // onboarding
  obStep: number;
  obScan: Record<string, "busy" | "done" | undefined>;
  obLock: string;
  // new-roast form
  setupMode: "pick" | "new";
  setupBeanId: string | null;
  setupName: string;
  setupOrigin: string;
  setupProcess: string;
  setupDesc: string;
  setupGreen: string;
  setupBatch: number | null;
  // finish-roast form
  postWeight: string;
  postLevel: string;
  postEven: number;
  postNotes: string;
  postFlavors: Record<string, number>;
  postRating: number;
}

/**
 * Beans are actually in the machine — the app must not put a lock screen in
 * front of the milestone rail. Applies on launch and to auto-lock alike.
 */
function roastInProgress(a: ActiveRoast | null): boolean {
  return !!a && (a.status === "preheating" || a.status === "roasting" || a.status === "cooling");
}

const initialState: AppState = {
  loaded: false,
  locked: false,
  screen: "home",
  q: "",
  detailId: null,
  roasts: [],
  beans: [],
  devices: [],
  settings: DEFAULT_SETTINGS,
  active: null,
  draft: null,
  obsKey: null,
  ghostOn: true,
  compareId: null,
  shareKind: null,
  shareId: null,
  toast: "",
  obStep: 0,
  obScan: {},
  obLock: "faceid",
  setupMode: "pick",
  setupBeanId: null,
  setupName: "",
  setupOrigin: "",
  setupProcess: "",
  setupDesc: "",
  setupGreen: "",
  setupBatch: null,
  postWeight: "",
  postLevel: "",
  postEven: 0,
  postNotes: "",
  postFlavors: {},
  postRating: 0,
};

export interface Store {
  st: AppState;
  set: (patch: Partial<AppState>) => void;
  flash: (msg: string) => void;
  dev: (id?: string) => Device;
  devSnap: (d: Device) => DevSnap;
  nextBatch: (beanName: string) => number;
  tap: (key: MilestoneKey) => void;
  patchA: (p: Partial<ActiveRoast>) => void;
  setObservation: (key: MilestoneKey, patch: { shade?: number; sound?: string }) => void;
  beginRoast: () => void;
  savePost: () => void;
  discardActive: () => void;
  saveDraft: () => void;
  deleteDraft: () => void;
  useDevice: (id: string) => void;
  toggleWishlist: (origin: string) => void;
  togglePublish: (roastId: string) => void;
  finishOnboarding: (toast?: string) => void;
  exportJournal: () => void;
  importJournal: (file: File) => void;
  savedAt: number | null;
  // profile + lock
  saveProfile: (p: Partial<Profile>) => void;
  unlock: () => void;
  lockNow: () => void;
  enablePasskeyLock: () => Promise<boolean>;
  enablePasscodeLock: (code: string) => Promise<boolean>;
  disableLock: () => void;
  checkPasscode: (code: string) => Promise<boolean>;
  setAutoLockMinutes: (m: number) => void;
  ensureBackupCode: () => string;
}

const Ctx = createContext<Store | null>(null);

export function useStore(): Store {
  const s = useContext(Ctx);
  if (!s) throw new Error("useStore outside provider");
  return s;
}

export function StoreProvider({ children }: { children: ReactNode }) {
  const [st, setSt] = useState<AppState>(initialState);
  const [savedAt, setSavedAt] = useState<number | null>(null);
  const ref = useRef(st);
  ref.current = st;
  const toastTimer = useRef<ReturnType<typeof setTimeout>>();
  const backupGuard = useRef<string | null>(null);

  useEffect(() => {
    loadAll().then((d) => {
      setSt((s) => ({
        ...s,
        loaded: true,
        // Reloading mid-roast must not strand the user behind the lock screen.
        locked: d.settings.lockCfg.mode !== "none" && !roastInProgress(d.active),
        roasts: d.roasts,
        beans: d.beans,
        devices: d.devices,
        settings: d.settings,
        active: d.active,
        obLock: d.settings.lock || "faceid",
        screen: d.settings.onboarded ? "home" : "onboard",
      }));
    });
  }, []);

  /**
   * Auto-lock after time away — but never while a roast is in progress.
   * Getting locked out mid-roast with beans in the machine would be worse
   * than the privacy it buys.
   */
  useEffect(() => {
    let leftAt = 0;
    const onVisibility = () => {
      const s = ref.current;
      if (document.visibilityState === "hidden") {
        leftAt = Date.now();
        return;
      }
      const cfg = s.settings.lockCfg;
      if (cfg.mode === "none" || s.locked || roastInProgress(s.active)) return;
      const mins = cfg.autoLockMinutes;
      if (mins > 0 && leftAt && Date.now() - leftAt > mins * 60_000) {
        setSt((prev) => ({ ...prev, locked: true }));
      }
    };
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const set = useCallback((patch: Partial<AppState>) => {
    setSt((s) => ({ ...s, ...patch }));
  }, []);

  const touch = useCallback(() => setSavedAt(Date.now()), []);

  const flash = useCallback((msg: string) => {
    setSt((s) => ({ ...s, toast: msg }));
    clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setSt((s) => ({ ...s, toast: "" })), 1800);
  }, []);

  const dev = useCallback((id?: string): Device => {
    const s = ref.current;
    return s.devices.find((d) => d.id === (id || s.settings.activeDeviceId)) || s.devices[0];
  }, []);

  const devSnap = useCallback((d: Device): DevSnap => {
    const m = METRICS[d.metric] || METRICS.watts;
    return {
      id: d.id,
      name: d.name,
      label: m.label,
      unit: m.unit,
      axis: m.axis,
      steps: m.steps,
      heatMax: d.heatMax || 0,
      fanOpts: FANS[d.fan] || null,
      coolDefault: d.coolDefault,
    };
  }, []);

  const nextBatch = useCallback((beanName: string): number => {
    const b = ref.current.roasts.filter((r) => r.beanName === beanName).map((r) => r.batch || 0);
    return (b.length ? Math.max(...b) : 0) + 1;
  }, []);

  const persistActive = useCallback(
    (a: ActiveRoast | null) => {
      void saveActive(a).then(touch);
    },
    [touch],
  );

  const patchA = useCallback(
    (p: Partial<ActiveRoast>) => {
      const a = ref.current.active;
      if (!a) return;
      const next = { ...a, ...p };
      set({ active: next });
      persistActive(next);
    },
    [set, persistActive],
  );

  /** Milestone tap — the roast state machine. */
  const tap = useCallback(
    (key: MilestoneKey) => {
      const s = ref.current;
      const a = s.active;
      if (!a) return;
      const next: ActiveRoast = { ...a, events: { ...a.events } };
      if (key === "preheat") {
        if (a.events.preheat || a.startedAt) return;
        next.preheatAt = Date.now();
        next.status = "preheating";
        // t is provisional — it becomes negative (relative to charge) below.
        next.events.preheat = { t: 0, dial: a.dial, fan: a.fan, watts: a.watts };
      } else if (key === "charge") {
        if (a.events.charge) return;
        const now = Date.now();
        next.startedAt = now;
        next.status = "roasting";
        next.events.charge = { t: 0, dial: a.dial, fan: a.fan, watts: a.watts };
        if (a.preheatAt) {
          // Re-anchor preheat to charge: negative seconds before beans-in.
          const preheatSec = (now - a.preheatAt) / 1000;
          next.events.preheat = { ...next.events.preheat!, t: -preheatSec };
          next.preheatSec = preheatSec;
        }
      } else {
        if (!a.startedAt || a.events[key]) return;
        const t = (Date.now() - a.startedAt) / 1000;
        next.events[key] = { t, dial: a.dial, fan: a.fan, watts: a.watts };
        if (key === "cooling") {
          const D = a.device;
          if (D.heatMax > 0) next.dial = 1;
          if (D.fanOpts) next.fan = D.fanOpts[D.fanOpts.length - 1];
        }
        if (key === "drop") {
          next.status = "cooling";
          next.coolStartedAt = Date.now();
        }
      }
      vibrate();
      // No bean colour or sound to log at preheat — the machine is still empty.
      set({ active: next, obsKey: key === "preheat" ? null : key });
      persistActive(next);
    },
    [set, persistActive],
  );

  const setObservation = useCallback(
    (key: MilestoneKey, patch: { shade?: number; sound?: string }) => {
      const a = ref.current.active;
      if (!a || !a.events[key]) return;
      const next: ActiveRoast = {
        ...a,
        events: { ...a.events, [key]: { ...a.events[key]!, ...patch } },
      };
      set({ active: next });
      persistActive(next);
    },
    [set, persistActive],
  );

  const beginRoast = useCallback(() => {
    const s = ref.current;
    const g = parseFloat(s.setupGreen);
    let bean: Bean | undefined;
    let beans = s.beans;
    if (s.setupMode === "pick") bean = s.beans.find((b) => b.id === s.setupBeanId);
    else if (s.setupName.trim()) {
      bean = {
        id: "b" + Date.now(),
        name: s.setupName.trim(),
        origin: s.setupOrigin.trim(),
        process: s.setupProcess,
        desc: s.setupDesc.trim(),
      };
      beans = [bean, ...s.beans];
      void saveBean(bean).then(touch);
    }
    if (!bean || !g || g <= 0) return;
    const device = dev();
    const D = devSnap(device);
    const prior = s.roasts.filter((r) => r.beanName === bean!.name && r.events && r.events.drop);
    prior.sort((x, y) => (y.rating || 0) - (x.rating || 0) || y.createdAt - x.createdAt);
    const g0 = prior[0];
    const ghost = g0
      ? { batch: g0.batch || 1, rating: g0.rating || 0, events: g0.events, durationSec: g0.durationSec }
      : null;
    const active: ActiveRoast = {
      id: "r" + Date.now(),
      createdAt: Date.now(),
      beanId: bean.id,
      beanName: bean.name,
      origin: bean.origin,
      process: bean.process,
      beanDesc: bean.desc || "",
      greenWeight: g,
      batch: s.setupBatch != null ? s.setupBatch : nextBatch(bean.name),
      ghost,
      device: D,
      deviceName: D.name,
      unit: D.unit,
      axis: D.axis,
      status: "idle",
      startedAt: null,
      preheatAt: null,
      dial: D.heatMax ? Math.ceil(D.heatMax * 0.6) : 0,
      fan: D.fanOpts ? D.fanOpts[Math.min(1, D.fanOpts.length - 1)] : null,
      watts: (METRICS[device.metric] || METRICS.watts).start,
      events: {},
      coolStartedAt: null,
      coolDuration: D.coolDefault,
    };
    set({ obsKey: null, beans, screen: "live", active });
    persistActive(active);
  }, [dev, devSnap, nextBatch, set, persistActive, touch]);

  const savePost = useCallback(() => {
    const s = ref.current;
    const a = s.active;
    if (!a) return;
    const ev = a.events;
    const total = ev.drop ? ev.drop.t : ev.fcEnds ? ev.fcEnds.t : ev.fc ? ev.fc.t : 0;
    const rw = parseFloat(s.postWeight);
    const rec: Roast = {
      id: a.id,
      createdAt: a.createdAt,
      beanId: a.beanId,
      beanName: a.beanName,
      origin: a.origin,
      process: a.process,
      beanDesc: a.beanDesc,
      batch: a.batch,
      greenWeight: a.greenWeight,
      deviceName: a.deviceName,
      unit: a.unit,
      axis: a.axis,
      events: a.events,
      roastedWeight: isNaN(rw) ? null : rw,
      roastLevel: s.postLevel,
      evenness: s.postEven,
      rating: s.postRating,
      notes: s.postNotes,
      flavors: { ...s.postFlavors },
      durationSec: total,
      preheatSec: a.preheatSec,
      finishedAt: Date.now(),
    };
    set({ roasts: [rec, ...s.roasts], active: null, detailId: rec.id, compareId: null, screen: "detail" });
    void saveRoast(rec).then(touch);
    persistActive(null);
  }, [set, persistActive, touch]);

  const discardActive = useCallback(() => {
    set({ active: null, obsKey: null, screen: "home" });
    persistActive(null);
  }, [set, persistActive]);

  const persistSettings = useCallback(
    (settings: Settings) => {
      void saveSettings(settings).then(touch);
    },
    [touch],
  );

  const saveDraft = useCallback(() => {
    const s = ref.current;
    const dr = s.draft;
    if (!dr || !dr.name.trim()) return;
    const d: Device = { ...dr, name: dr.name.trim(), id: dr.id || "d" + Date.now() };
    const existed = s.devices.some((x) => x.id === d.id);
    const devices = existed ? s.devices.map((x) => (x.id === d.id ? d : x)) : [...s.devices, d];
    const settings = { ...s.settings, activeDeviceId: d.id };
    set({ devices, settings, draft: null, screen: "devices" });
    void saveDevice(d).then(touch);
    persistSettings(settings);
  }, [set, persistSettings, touch]);

  const deleteDraft = useCallback(() => {
    const s = ref.current;
    const dr = s.draft;
    if (!dr || !dr.id || s.devices.length <= 1) return;
    const devices = s.devices.filter((x) => x.id !== dr.id);
    const settings = {
      ...s.settings,
      activeDeviceId: s.settings.activeDeviceId === dr.id ? devices[0].id : s.settings.activeDeviceId,
    };
    set({ devices, settings, draft: null, screen: "devices" });
    void dbDeleteDevice(dr.id).then(touch);
    persistSettings(settings);
  }, [set, persistSettings, touch]);

  const useDevice = useCallback(
    (id: string) => {
      const settings = { ...ref.current.settings, activeDeviceId: id };
      set({ settings });
      persistSettings(settings);
    },
    [set, persistSettings],
  );

  const toggleWishlist = useCallback(
    (origin: string) => {
      const s = ref.current;
      const wanted = s.settings.wishlist.includes(origin);
      const settings = {
        ...s.settings,
        wishlist: wanted ? s.settings.wishlist.filter((x) => x !== origin) : [...s.settings.wishlist, origin],
      };
      set({ settings });
      persistSettings(settings);
    },
    [set, persistSettings],
  );

  const togglePublish = useCallback(
    (roastId: string) => {
      const s = ref.current;
      const published = { ...s.settings.published };
      let msg: string;
      if (published[roastId]) {
        delete published[roastId];
        msg = "Link revoked";
      } else {
        published[roastId] = Math.random().toString(36).slice(2, 7);
        msg = "Link created";
      }
      const settings = { ...s.settings, published };
      set({ settings });
      persistSettings(settings);
      flash(msg);
    },
    [set, persistSettings, flash],
  );

  const finishOnboarding = useCallback(
    (toast?: string) => {
      const s = ref.current;
      const settings = { ...s.settings, onboarded: true, lock: s.obLock };
      set({ settings, screen: "home" });
      persistSettings(settings);
      if (toast) flash(toast);
    },
    [set, persistSettings, flash],
  );

  const exportJournal = useCallback(() => {
    const s = ref.current;
    const shape: ExportShape = {
      v: 1,
      exportedAt: new Date().toISOString(),
      roasts: s.roasts,
      beans: s.beans,
      devices: s.devices,
      wishlist: s.settings.wishlist,
    };
    const blob = new Blob([JSON.stringify(shape, null, 2)], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "coffee-jots-" + new Date().toISOString().slice(0, 10) + ".json";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    const settings = { ...s.settings, lastExportAt: Date.now() };
    set({ settings });
    persistSettings(settings);
    flash("Journal exported");
  }, [set, persistSettings, flash]);

  const importJournal = useCallback(
    (file: File) => {
      const fr = new FileReader();
      fr.onload = () => {
        try {
          const d = JSON.parse(String(fr.result));
          if (!d.roasts || !Array.isArray(d.roasts)) throw new Error("bad file");
          const s = ref.current;
          if (s.roasts.length > 0) {
            const ok = window.confirm(
              "Restore will replace the " +
                s.roasts.length +
                " roasts on this device with the " +
                d.roasts.length +
                " in the file. Continue?",
            );
            if (!ok) return;
          }
          const beans: Bean[] = Array.isArray(d.beans) ? d.beans : s.beans;
          const devices: Device[] = Array.isArray(d.devices) && d.devices.length ? d.devices : s.devices;
          const roasts: Roast[] = [...d.roasts].sort((a, b) => b.createdAt - a.createdAt);
          const settings = {
            ...s.settings,
            wishlist: Array.isArray(d.wishlist) ? d.wishlist : [],
            activeDeviceId: devices.find((x) => x.id === s.settings.activeDeviceId)
              ? s.settings.activeDeviceId
              : devices[0].id,
          };
          set({ roasts, beans, devices, settings, screen: "home" });
          void Promise.all([replaceRoasts(roasts), replaceBeans(beans), replaceDevices(devices)]).then(touch);
          persistSettings(settings);
          flash("Imported " + roasts.length + " roasts");
        } catch {
          flash("That file isn't a Jots journal");
        }
      };
      fr.readAsText(file);
    },
    [set, persistSettings, flash, touch],
  );

  // ---- profile ----

  const saveProfile = useCallback(
    (p: Partial<Profile>) => {
      const s = ref.current;
      const profile = { ...s.settings.profile, ...p };
      if (profile.since == null) profile.since = Date.now();
      const settings = { ...s.settings, profile };
      set({ settings });
      persistSettings(settings);
    },
    [set, persistSettings],
  );

  // ---- lock ----

  const unlock = useCallback(() => set({ locked: false }), [set]);

  const lockNow = useCallback(() => {
    if (ref.current.settings.lockCfg.mode === "none") return;
    set({ locked: true });
  }, [set]);

  /**
   * The backup code must be generated exactly once — the user writes it down,
   * so a second generation would invalidate the copy in their logbook. The ref
   * guard covers the window before a setState has committed (and StrictMode's
   * double-invocation), which the settings check alone can't.
   */
  const ensureBackupCode = useCallback((): string => {
    const s = ref.current;
    const existing = s.settings.lockCfg.backupCode || backupGuard.current;
    if (existing) {
      backupGuard.current = existing;
      return existing;
    }
    const code = generateBackupCode();
    backupGuard.current = code;
    const settings = { ...s.settings, lockCfg: { ...s.settings.lockCfg, backupCode: code } };
    set({ settings });
    persistSettings(settings);
    return code;
  }, [set, persistSettings]);

  const enablePasskeyLock = useCallback(async (): Promise<boolean> => {
    const s = ref.current;
    const label = s.settings.profile.displayName || s.settings.profile.roastery || "Coffee Jots";
    const credentialId = await createPasskey(label);
    if (!credentialId) return false;
    const settings: Settings = {
      ...s.settings,
      lock: "faceid",
      lockCfg: {
        ...s.settings.lockCfg,
        mode: "passkey",
        credentialId,
        backupCode: s.settings.lockCfg.backupCode || backupGuard.current || generateBackupCode(),
      },
    };
    set({ settings });
    persistSettings(settings);
    return true;
  }, [set, persistSettings]);

  const enablePasscodeLock = useCallback(
    async (code: string): Promise<boolean> => {
      if (!/^\d{4,8}$/.test(code)) return false;
      const s = ref.current;
      const salt = randomSalt();
      const hash = await hashPasscode(code, salt);
      const settings: Settings = {
        ...s.settings,
        lock: "passcode",
        lockCfg: {
          ...s.settings.lockCfg,
          mode: "passcode",
          passcodeHash: hash,
          passcodeSalt: salt,
          credentialId: null,
          backupCode: s.settings.lockCfg.backupCode || backupGuard.current || generateBackupCode(),
        },
      };
      set({ settings });
      persistSettings(settings);
      return true;
    },
    [set, persistSettings],
  );

  const checkPasscode = useCallback(async (code: string): Promise<boolean> => {
    const cfg = ref.current.settings.lockCfg;
    if (!cfg.passcodeHash || !cfg.passcodeSalt) return false;
    const hash = await hashPasscode(code, cfg.passcodeSalt);
    return safeEqual(hash, cfg.passcodeHash);
  }, []);

  const disableLock = useCallback(() => {
    const s = ref.current;
    const settings: Settings = {
      ...s.settings,
      lock: "none",
      lockCfg: { ...s.settings.lockCfg, mode: "none", credentialId: null, passcodeHash: null, passcodeSalt: null },
    };
    set({ settings, locked: false });
    persistSettings(settings);
  }, [set, persistSettings]);

  const setAutoLockMinutes = useCallback(
    (m: number) => {
      const s = ref.current;
      const settings = { ...s.settings, lockCfg: { ...s.settings.lockCfg, autoLockMinutes: m } };
      set({ settings });
      persistSettings(settings);
    },
    [set, persistSettings],
  );

  const value = useMemo<Store>(
    () => ({
      st,
      set,
      flash,
      dev,
      devSnap,
      nextBatch,
      tap,
      patchA,
      setObservation,
      beginRoast,
      savePost,
      discardActive,
      saveDraft,
      deleteDraft,
      useDevice,
      toggleWishlist,
      togglePublish,
      finishOnboarding,
      exportJournal,
      importJournal,
      savedAt,
      saveProfile,
      unlock,
      lockNow,
      enablePasskeyLock,
      enablePasscodeLock,
      disableLock,
      checkPasscode,
      setAutoLockMinutes,
      ensureBackupCode,
    }),
    [
      st,
      set,
      flash,
      dev,
      devSnap,
      nextBatch,
      tap,
      patchA,
      setObservation,
      beginRoast,
      savePost,
      discardActive,
      saveDraft,
      deleteDraft,
      useDevice,
      toggleWishlist,
      togglePublish,
      finishOnboarding,
      exportJournal,
      importJournal,
      savedAt,
      saveProfile,
      unlock,
      lockNow,
      enablePasskeyLock,
      enablePasscodeLock,
      disableLock,
      checkPasscode,
      setAutoLockMinutes,
      ensureBackupCode,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
