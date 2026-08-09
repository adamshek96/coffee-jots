import type { Bean, Device } from "../types";

/**
 * Camera scanning is simulated in v1, exactly like the prototype.
 * To make it real later, implement Scanner with getUserMedia + an on-device
 * model and swap the export at the bottom — the onboarding screens only talk
 * to this interface.
 */

export interface ScanField {
  k: string;
  v: string;
  note?: string;
  confidence?: "high" | "med";
}

export interface MachineScan {
  fields: ScanField[];
  device: Omit<Device, "id">;
}

export interface BagScan {
  fields: ScanField[];
  bean: Omit<Bean, "id">;
}

export interface Scanner {
  scanMachine(): Promise<MachineScan>;
  scanBag(): Promise<BagScan>;
}

const delay = (ms: number) => new Promise<void>((res) => setTimeout(res, ms));

class SimulatedScanner implements Scanner {
  async scanMachine(): Promise<MachineScan> {
    await delay(1700);
    return {
      fields: [
        { k: "Model", v: "Popper", note: "nameplate" },
        { k: "Heat dial", v: "1 – 7", note: "7 detents seen" },
        { k: "Fan", v: "OFF / LOW / HIGH", note: "3-position knob" },
        { k: "Probe", v: "none", note: "no thermocouple port" },
        { k: "So we track", v: "watts over time", note: "clip-on meter" },
      ],
      device: {
        name: "Popper",
        metric: "watts",
        heatMax: 7,
        fan: "ohl",
        coolDefault: 180,
        note: "air roaster · watt meter clipped on",
      },
    };
  }

  async scanBag(): Promise<BagScan> {
    await delay(1500);
    return {
      fields: [
        { k: "Bean", v: "Yirgacheffe Lot 7", confidence: "high" },
        { k: "Origin", v: "Ethiopia", confidence: "high" },
        { k: "Process", v: "Washed", confidence: "high" },
        { k: "Notes on bag", v: "jasmine, bergamot, peach", confidence: "med" },
      ],
      bean: {
        name: "Yirgacheffe Lot 7",
        origin: "Ethiopia",
        process: "Washed",
        desc: "jasmine, bergamot, peach",
      },
    };
  }
}

export const scanner: Scanner = new SimulatedScanner();
