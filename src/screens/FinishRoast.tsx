import { S, ScreenHeader } from "../components/ui";
import { wheelGeom } from "../lib/calc";
import { C, EVEN_CAPTIONS, EVEN_DOTS, LEVELS, MONO } from "../lib/constants";
import { useStore } from "../store";

export function FinishRoast() {
  const { st, set, patchA, savePost } = useStore();
  const a = st.active!;

  const rw = parseFloat(st.postWeight);
  const hasLoss = rw > 0 && a.greenWeight > 0;
  const wheel = wheelGeom(st.postFlavors);

  const cycleFamily = (name: string) => {
    const nf = { ...st.postFlavors };
    const nv = ((nf[name] || 0) + 1) % 6;
    if (nv) nf[name] = nv;
    else delete nf[name];
    set({ postFlavors: nf });
  };

  return (
    <div>
      <ScreenHeader title="Finish roast" onBack={() => set({ screen: "live" })} />

      {/* batch number */}
      <div
        style={{
          ...S.card,
          padding: "14px 16px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
        }}
      >
        <div>
          <div style={S.sectionLabel}>Batch number</div>
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 2 }}>#{a.batch || 1}</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          <button
            onClick={() => patchA({ batch: Math.max(1, (a.batch || 1) - 1) })}
            className="pressS"
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              color: C.ink,
            }}
          >
            −
          </button>
          <button
            onClick={() => patchA({ batch: (a.batch || 1) + 1 })}
            className="pressS"
            style={{
              width: 44,
              height: 44,
              borderRadius: 11,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              color: C.ink,
            }}
          >
            +
          </button>
        </div>
      </div>

      {/* roasted weight */}
      <div style={S.card}>
        <label style={S.fieldLabel}>Roasted weight (g)</label>
        <input
          value={st.postWeight}
          onChange={(e) => set({ postWeight: e.target.value.replace(/[^0-9.]/g, "") })}
          inputMode="decimal"
          placeholder="74.6"
          style={{ ...S.input, fontFamily: MONO, fontSize: 16 }}
        />
        {hasLoss ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 13 }}>
            <span style={{ color: C.muted }}>
              green {a.greenWeight}g → {rw}g
            </span>
            <span style={{ fontWeight: 700, color: C.rust }}>
              −{(a.greenWeight - rw).toFixed(1)}g ({(((a.greenWeight - rw) / a.greenWeight) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null}
      </div>

      {/* roast level */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 4 }}>Roast level</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Light to dark, left to right.</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {LEVELS.map((L) => {
            const on = st.postLevel === L.name;
            return (
              <button
                key={L.name}
                onClick={() => set({ postLevel: on ? "" : L.name })}
                className="pressS"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                  padding: "7px 13px 7px 9px",
                  borderRadius: 999,
                  border: `1px solid ${on ? L.c : C.hair}`,
                  background: on ? L.c : C.field,
                  color: on ? (L.light ? C.ink : C.cream) : C.ink,
                  fontSize: 13,
                  cursor: "pointer",
                  fontFamily: "inherit",
                }}
              >
                <span
                  style={{
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: L.c,
                    boxShadow: "inset 0 0 0 1px rgba(36,29,22,0.18)",
                  }}
                />
                {L.name}
              </button>
            );
          })}
        </div>
      </div>

      {/* evenness */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Evenness</div>
        <div style={{ display: "flex", gap: 7 }}>
          {[1, 2, 3, 4, 5].map((n) => {
            const on = st.postEven === n;
            return (
              <button
                key={n}
                onClick={() => set({ postEven: n })}
                className="pressS"
                style={{
                  flex: 1,
                  padding: "8px 5px 7px",
                  borderRadius: 11,
                  border: `1.5px solid ${on ? C.olive : C.hair}`,
                  background: on ? "#DDE3CC" : C.field,
                  cursor: "pointer",
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 2, width: "100%" }}>
                  {EVEN_DOTS[n - 1].map((d, i) => (
                    <span
                      key={i}
                      style={{ display: "block", aspectRatio: "1", borderRadius: "50% 50% 45% 55%", background: d }}
                    />
                  ))}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: on ? C.oliveDeep : C.muted }}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{EVEN_CAPTIONS[st.postEven]}</div>
      </div>

      {/* flavor wheel */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.sectionLabel}>Flavor wheel</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>Tap a family to set intensity — 0 to 5, cycles round.</div>
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
                <circle key={i} cx={d.x} cy={d.y} r={3.4} style={{ fill: d.c, stroke: C.paperLight, strokeWidth: 1.4 }} />
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

      {/* notes */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <label style={S.fieldLabel}>Notes</label>
        <textarea
          value={st.postNotes}
          onChange={(e) => set({ postNotes: e.target.value })}
          rows={3}
          placeholder="Smells great; longer preheat by 30s…"
          style={{ ...S.input, resize: "vertical" }}
        />
      </div>

      {/* rating */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Roast performance</div>
        <div style={{ display: "flex", gap: 4 }}>
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              onClick={() => set({ postRating: st.postRating === n ? 0 : n })}
              className="pressS"
              style={{
                flex: 1,
                height: 52,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 30,
                lineHeight: 1,
                color: st.postRating >= n ? C.rust : C.hair,
                padding: 0,
                outline: "none",
              }}
            >
              {st.postRating >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {["Not rated yet", "Poor — learn from it", "Below par", "Solid", "Great roast", "Best of this bean"][st.postRating]}
        </div>
      </div>

      <button onClick={savePost} className="pressY" style={{ ...S.primaryBtn, marginTop: 14 }}>
        Save to journal
      </button>
    </div>
  );
}
