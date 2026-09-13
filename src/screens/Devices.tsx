import { useState } from "react";
import { ClayObject } from "../components/ClayObject";
import { S, ScreenHeader } from "../components/ui";
import { buildPopper, POPPER_PARTS } from "../lib/models/popper";
import type { PopperPart } from "../lib/models/popper";
import { fmt } from "../lib/calc";
import { C, FANS, METRICS, MONO } from "../lib/constants";
import { useStore } from "../store";
import type { Device } from "../types";

function devSummary(d: Device): { k: string; v: string }[] {
  const m = METRICS[d.metric] || METRICS.watts;
  const f = FANS[d.fan];
  return [
    { k: "Tracks", v: m.label + " (" + m.unit + ") over time" },
    { k: "Heat", v: d.heatMax ? "dial 1–" + d.heatMax : "no heat dial" },
    { k: "Fan", v: f ? f.join(" / ") : "none" },
    { k: "Cooling", v: fmt(d.coolDefault) + (d.coolWatts != null ? " · " + d.coolWatts + m.unit : "") },
  ];
}

/**
 * The machine itself, at the top of its own screen. Turning it over is the
 * point — the parts are tappable, and each one answers with what Jots actually
 * records from it, so the object doubles as the explanation of the rail.
 */
function PopperHero() {
  const [part, setPart] = useState<PopperPart>("body");
  const info = POPPER_PARTS[part];
  return (
    <div style={{ ...S.card, padding: "6px 14px 14px", marginBottom: 14 }}>
      <ClayObject
        build={buildPopper}
        reach={1.5}
        lift={0.74}
        height={240}
        shadow={[1.5, 1.3]}
        label="The popper roaster, in three dimensions — drag to turn it, tap a part to read what it does"
        onPartTap={(p) => setPart(p as PopperPart)}
      />
      <div style={{ borderTop: `1px solid ${C.hair}`, paddingTop: 11, marginTop: 4 }}>
        <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.12em", color: C.olive, fontWeight: 700 }}>
          {info.title.toUpperCase()}
        </div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.5, marginTop: 4 }}>{info.body}</div>
        <div style={{ fontFamily: MONO, fontSize: 9.5, color: C.faint, marginTop: 8, letterSpacing: "0.06em" }}>
          DRAG TO TURN · TAP A PART
        </div>
      </div>
    </div>
  );
}

export function Devices() {
  const { st, set, useDevice } = useStore();

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
        <ScreenHeader title="Roaster devices" onBack={() => set({ screen: "home" })} />
      </div>
      <div style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 52px" }}>
        Each device sets up its own live panel — what it tracks, its controls, its cooling default.
      </div>

      <PopperHero />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {st.devices.map((d, i) => {
          const active = d.id === st.settings.activeDeviceId;
          return (
            <div key={d.id} style={{ ...S.card, border: `1.5px solid ${active ? C.olive : C.hair}`, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: `${i * 80}ms` }}>
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{d.name}</div>
                  <div style={{ fontSize: 12, color: C.muted, marginTop: 2 }}>{d.note || ""}</div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: C.olive }}>
                  {active ? "IN USE" : ""}
                </span>
              </div>
              <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 2 }}>
                {devSummary(d).map((row) => (
                  <div
                    key={row.k}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      gap: 10,
                      padding: "4px 0",
                      borderBottom: "1px solid rgba(183,175,159,0.35)",
                    }}
                  >
                    <span style={{ fontSize: 12, color: C.muted }}>{row.k}</span>
                    <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{row.v}</span>
                  </div>
                ))}
              </div>
              <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                <button
                  onClick={() => useDevice(d.id)}
                  className="pressY"
                  style={{
                    flex: 1,
                    border: "none",
                    borderRadius: 11,
                    padding: 11,
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: active ? "#DDE3CC" : C.olive,
                    color: active ? C.oliveDeep : C.cream,
                  }}
                >
                  {active ? "In use" : "Use this"}
                </button>
                <button
                  onClick={() => set({ screen: "device", draft: { ...d } })}
                  className="pressY"
                  style={{
                    flex: 1,
                    border: `1px solid ${C.hair}`,
                    borderRadius: 11,
                    padding: 11,
                    fontFamily: "inherit",
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: "pointer",
                    background: "transparent",
                    color: C.ink,
                  }}
                >
                  Edit
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <button
        onClick={() =>
          set({
            screen: "device",
            draft: { id: "", name: "", metric: "watts", heatMax: 7, fan: "ohl", coolDefault: 180, note: "" },
          })
        }
        className="pressY"
        style={{
          width: "100%",
          border: "1px dashed #A79E8C",
          background: "transparent",
          borderRadius: 14,
          padding: 16,
          marginTop: 12,
          fontFamily: "inherit",
          fontSize: 15,
          fontWeight: 600,
          color: C.olive,
          cursor: "pointer",
          animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)",
          animationDelay: `${Math.max(st.devices.length, 1) * 80}ms`,
        }}
      >
        + &nbsp;New roaster device
      </button>
    </div>
  );
}
