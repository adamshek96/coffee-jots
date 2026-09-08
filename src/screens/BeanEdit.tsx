import { Chip, S, ScreenHeader } from "../components/ui";
import { wheelGeom } from "../lib/calc";
import { C, MONO, PROCESSES } from "../lib/constants";
import { useStore } from "../store";
import type { Bean } from "../types";

export function BeanEdit() {
  const { st, set, saveBeanDraft, deleteBeanDraft } = useStore();
  const dr = st.beanDraft;
  if (!dr) return null;

  const patch = (p: Partial<Bean>) => set({ beanDraft: { ...dr, ...p } });
  const flavors = dr.flavors || {};
  const wheel = wheelGeom(flavors);
  const canSave = dr.name.trim().length > 0;
  const roastCount = dr.id ? st.roasts.filter((r) => r.beanId === dr.id || r.beanName === dr.name).length : 0;

  const cycleFamily = (name: string) => {
    const nf = { ...flavors };
    const nv = ((nf[name] || 0) + 1) % 6;
    if (nv) nf[name] = nv;
    else delete nf[name];
    patch({ flavors: nf });
  };

  return (
    <div>
      <ScreenHeader
        title={dr.id ? "Edit bean" : "New bean"}
        onBack={() => set({ beanDraft: null, screen: "beans" })}
      />

      <div style={S.card}>
        <label style={S.fieldLabel}>Name</label>
        <input
          value={dr.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Huila Pink Bourbon"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Origin</label>
        <input
          value={dr.origin || ""}
          onChange={(e) => patch({ origin: e.target.value })}
          placeholder="Country — earns a passport stamp"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Region / farm</label>
        <input
          value={dr.region || ""}
          onChange={(e) => patch({ region: e.target.value })}
          placeholder="e.g. Huila, Finca El Mirador"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Description</label>
        <textarea
          value={dr.desc || ""}
          onChange={(e) => patch({ desc: e.target.value })}
          rows={3}
          placeholder="How it behaves, what it tastes like…"
          style={{ ...S.input, resize: "vertical" }}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Process</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {PROCESSES.map((p) => (
            <Chip
              key={p}
              label={p}
              on={dr.process === p}
              onClick={() => patch({ process: dr.process === p ? "" : p })}
            />
          ))}
        </div>
      </div>

      {/* flavor wheel — a property of the bean, not of one roast */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.sectionLabel}>Flavor wheel</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Tap a family to set intensity — 0 to 5, cycles round.
        </div>
        <div style={{ position: "relative", width: "100%", aspectRatio: "1", maxWidth: 288, margin: "10px auto 0" }}>
          <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
            {wheel.rings.map((g, i) => (
              <g key={i}>
                <polygon points={g.pts} style={{ fill: "none", stroke: C.hair, strokeWidth: 0.8 }} />
                <text x={104} y={g.tickY} style={{ fill: "#9A9184", fontFamily: MONO, fontSize: 7 }}>
                  {g.tick}
                </text>
              </g>
            ))}
            {wheel.spokes.map((s, i) => (
              <line key={i} x1={100} y1={100} x2={s.x} y2={s.y} style={{ stroke: C.hair, strokeWidth: 0.8 }} />
            ))}
            <polygon
              points={wheel.poly}
              style={{ fill: "rgba(169,97,58,0.16)", stroke: C.rust, strokeWidth: 2, strokeLinejoin: "round" }}
            />
            {wheel.vertexDots
              .filter((d) => d.r > 3)
              .map((d, i) => (
                <circle key={i} cx={d.x} cy={d.y} r={3.4} style={{ fill: d.c, stroke: C.card, strokeWidth: 1.4 }} />
              ))}
          </svg>
          {wheel.labels.map((w) => (
            <button
              key={w.name}
              onClick={() => cycleFamily(w.name)}
              className="pressC"
              style={{
                position: "absolute",
                left: w.left + "%",
                top: w.top + "%",
                transform: "translate(-50%,-50%)",
                border: `1px solid ${w.bd}`,
                background: w.bg,
                color: w.fg,
                borderRadius: 999,
                padding: "4px 7px",
                fontFamily: MONO,
                fontSize: 9,
                fontWeight: 700,
                letterSpacing: "0.03em",
                whiteSpace: "nowrap",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span>{w.name}</span>
              <span style={{ opacity: 0.75 }}>{w.val}</span>
            </button>
          ))}
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 12, alignItems: "center" }}>
          {wheel.chips.length === 0 ? (
            <span style={{ fontSize: 12, color: C.muted }}>No families set yet.</span>
          ) : (
            wheel.chips.map((f) => (
              <span
                key={f.name}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 11px",
                  borderRadius: 999,
                  border: `1px solid ${f.c}`,
                  color: f.c,
                  fontSize: 12,
                  fontWeight: 600,
                }}
              >
                {f.name}
                <span style={{ fontFamily: MONO, letterSpacing: 1 }}>{f.dots}</span>
              </span>
            ))
          )}
        </div>
      </div>

      <button
        onClick={saveBeanDraft}
        disabled={!canSave}
        className="pressY"
        style={{ ...S.primaryBtn, marginTop: 14, opacity: canSave ? 1 : 0.4 }}
      >
        Save bean
      </button>

      {dr.id ? (
        <div style={{ textAlign: "center", marginTop: 10 }}>
          <button
            onClick={() => {
              const msg = roastCount
                ? `Delete the "${dr.name}" profile? Its ${roastCount} logged roast${roastCount === 1 ? "" : "s"} stay in your journal.`
                : `Delete the "${dr.name}" profile?`;
              if (window.confirm(msg)) deleteBeanDraft();
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
            Delete this bean profile
          </button>
        </div>
      ) : null}
    </div>
  );
}
