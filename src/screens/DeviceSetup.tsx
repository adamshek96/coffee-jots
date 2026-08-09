import { Chip, S, ScreenHeader } from "../components/ui";
import { fmt } from "../lib/calc";
import { C, METRICS, MONO } from "../lib/constants";
import { useStore } from "../store";
import type { Device, FanKind, MetricKind } from "../types";

export function DeviceSetup() {
  const { st, set, saveDraft, deleteDraft } = useStore();
  const dr = st.draft;
  if (!dr) return null;

  const patch = (p: Partial<Device>) => set({ draft: { ...dr, ...p } });
  const metric = METRICS[dr.metric] || METRICS.watts;
  const canSave = dr.name.trim().length > 0;
  const canDelete = !!dr.id && st.devices.length > 1;

  return (
    <div>
      <ScreenHeader title={dr.id ? "Edit device" : "New device"} onBack={() => set({ draft: null, screen: "devices" })} />

      <div style={S.card}>
        <label style={S.fieldLabel}>Device name</label>
        <input value={dr.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Popper" style={S.input} />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Description</label>
        <input
          value={dr.note || ""}
          onChange={(e) => patch({ note: e.target.value })}
          placeholder="air roaster · watt meter clipped on"
          style={S.input}
        />
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>What it tracks</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {(
            [
              ["watts", "Watts (W)"],
              ["tempF", "Temp (°F)"],
              ["tempC", "Temp (°C)"],
            ] as [MetricKind, string][]
          ).map(([k, l]) => (
            <Chip key={k} label={l} on={dr.metric === k} onClick={() => patch({ metric: k })} />
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
          Your roast curve will plot {metric.axis} over time. No other readings are recorded.
        </div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 8 }}>
          stepper: −{metric.steps[0]} · −{metric.steps[1]} · +{metric.steps[1]} · +{metric.steps[0]}
        </div>
      </div>

      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Heat dial</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {[0, 3, 5, 7, 10].map((n) => (
            <Chip key={n} label={n ? "1–" + n : "None"} on={dr.heatMax === n} onClick={() => patch({ heatMax: n })} mono />
          ))}
        </div>
        <div style={{ ...S.sectionLabel, margin: "16px 0 8px" }}>Fan settings</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {(
            [
              ["none", "None"],
              ["ohl", "OFF / LOW / HIGH"],
              ["o123", "OFF / 1 / 2 / 3"],
            ] as [FanKind, string][]
          ).map(([k, l]) => (
            <Chip key={k} label={l} on={dr.fan === k} onClick={() => patch({ fan: k })} />
          ))}
        </div>
        <div style={{ ...S.sectionLabel, margin: "16px 0 8px" }}>Cooling timer default</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => patch({ coolDefault: Math.max(30, dr.coolDefault - 30) })}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 11,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              color: C.ink,
            }}
          >
            −30s
          </button>
          <div style={{ flex: 1.2, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 20 }}>
            {fmt(dr.coolDefault)}
          </div>
          <button
            onClick={() => patch({ coolDefault: dr.coolDefault + 30 })}
            style={{
              flex: 1,
              height: 44,
              borderRadius: 11,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 13,
              cursor: "pointer",
              color: C.ink,
            }}
          >
            +30s
          </button>
        </div>
      </div>

      <button
        onClick={saveDraft}
        disabled={!canSave}
        className="pressY"
        style={{ ...S.primaryBtn, marginTop: 14, opacity: canSave ? 1 : 0.4 }}
      >
        Save device
      </button>
      {canDelete ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={() => {
              if (window.confirm("Delete " + (dr.name || "this device") + "? Past roasts keep their own copy of its settings.")) {
                deleteDraft();
              }
            }}
            style={{
              border: "none",
              background: "none",
              color: C.rust,
              fontSize: 12,
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 8,
            }}
          >
            Delete this device
          </button>
        </div>
      ) : null}
    </div>
  );
}
