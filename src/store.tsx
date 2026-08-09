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
import type { ActiveRoast, Bean, Device, DevSnap, ExportShape, MilestoneKey, Roast, Settings } from "./types";

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
  | "share";

export interface AppState {
  loaded: boolean;
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

const initialState: AppState = {
  loaded: false,
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

  useEffect(() => {
    loadAll().then((d) => {
      setSt((s) => ({
        ...s,
        loaded: true,
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
      if (key === "charge") {
        if (a.events.charge) return;
        next.startedAt = Date.now();
        next.status = "roasting";
        next.events.charge = { t: 0, dial: a.dial, fan: a.fan, watts: a.watts };
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
      set({ active: next, obsKey: key });
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
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
