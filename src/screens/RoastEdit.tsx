import { EditableWheel } from "../components/FlavorWheel";
import { Chip, DangerAction, S, ScreenHeader } from "../components/ui";
import { fmt } from "../lib/calc";
import { C, EVEN_CAPTIONS, EVEN_DOTS, LEVELS, MONO } from "../lib/constants";
import { useStore } from "../store";
import type { Roast } from "../types";

/** Edit or delete a roast already in the journal. */
export function RoastEdit() {
  const { st, set, saveRoastDraft, deleteRoastDraft, setBeanFlavors } = useStore();
  const dr = st.roastDraft;
  if (!dr) return null;

  const patch = (p: Partial<Roast>) => set({ roastDraft: { ...dr, ...p } });
  const green = dr.greenWeight || 0;
  const rw = typeof dr.roastedWeight === "number" ? dr.roastedWeight : NaN;
  const hasLoss = rw > 0 && green > 0;

  // Flavour lives on the bean; fall back to the roast for orphaned entries.
  const bean = st.beans.find((b) => b.id === dr.beanId || b.name === dr.beanName);
  const beanFlavors = (bean ? bean.flavors : dr.flavors) || {};

  const numField = (v: number | null | undefined) => (v == null || isNaN(v as number) ? "" : String(v));

  return (
    <div>
      <ScreenHeader title="Edit roast" onBack={() => set({ roastDraft: null, screen: "detail" })} />

      {/* which roast, and things that can't be edited here */}
      <div style={{ ...S.card, marginBottom: 12 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: "-0.02em" }}>{dr.beanName}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>
          {new Date(dr.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {dr.durationSec ? " · " + fmt(dr.durationSec) : ""}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
          The curve and milestone times were recorded live and stay as they were. Change the bean itself in{" "}
          <button
            onClick={() => {
              const bean = st.beans.find((b) => b.id === dr.beanId || b.name === dr.beanName);
              if (bean) set({ screen: "bean", beanDraft: { ...bean, flavors: { ...(bean.flavors || {}) } } });
              else set({ screen: "beans" });
            }}
            style={{
              border: "none",
              background: "none",
              padding: 0,
              color: C.olive,
              fontFamily: "inherit",
              fontSize: 12,
              textDecoration: "underline",
              cursor: "pointer",
            }}
          >
            bean profiles
          </button>
          .
        </div>
      </div>

      {/* batch */}
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
          <div style={{ fontFamily: MONO, fontSize: 20, fontWeight: 700, marginTop: 2 }}>#{dr.batch || 1}</div>
        </div>
        <div style={{ display: "flex", gap: 7 }}>
          {[-1, 1].map((d) => (
            <button
              key={d}
              onClick={() => patch({ batch: Math.max(1, (dr.batch || 1) + d) })}
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
              {d < 0 ? "−" : "+"}
            </button>
          ))}
        </div>
      </div>

      {/* weights */}
      <div style={S.card}>
        <label style={S.fieldLabel}>Green weight (g)</label>
        <input
          value={numField(dr.greenWeight)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            patch({ greenWeight: raw === "" ? 0 : parseFloat(raw) });
          }}
          inputMode="decimal"
          style={{ ...S.input, fontFamily: MONO, fontSize: 16 }}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Roasted weight (g)</label>
        <input
          value={numField(dr.roastedWeight)}
          onChange={(e) => {
            const raw = e.target.value.replace(/[^0-9.]/g, "");
            patch({ roastedWeight: raw === "" ? null : parseFloat(raw) });
          }}
          inputMode="decimal"
          placeholder="not recorded"
          style={{ ...S.input, fontFamily: MONO, fontSize: 16 }}
        />
        {hasLoss ? (
          <div style={{ marginTop: 10, display: "flex", justifyContent: "space-between", fontFamily: MONO, fontSize: 13 }}>
            <span style={{ color: C.muted }}>
              green {green}g → {rw}g
            </span>
            <span style={{ fontWeight: 700, color: C.rust }}>
              −{(green - rw).toFixed(1)}g ({(((green - rw) / green) * 100).toFixed(1)}%)
            </span>
          </div>
        ) : null}
      </div>

      {/* roast level */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Roast level</div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {LEVELS.map((L) => {
            const on = dr.roastLevel === L.name;
            return (
              <button
                key={L.name}
                onClick={() => patch({ roastLevel: on ? "" : L.name })}
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
            const on = dr.evenness === n;
            return (
              <button
                key={n}
                onClick={() => patch({ evenness: on ? 0 : n })}
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
                    <span key={i} style={{ display: "block", aspectRatio: "1", borderRadius: "50% 50% 45% 55%", background: d }} />
                  ))}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: on ? C.oliveDeep : C.muted }}>
                  {n}
                </span>
              </button>
            );
          })}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>{EVEN_CAPTIONS[dr.evenness || 0]}</div>
      </div>

      {/* process (kept per-roast, since it can differ from the current profile) */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Origin &amp; process on this roast</div>
        <input
          value={dr.origin || ""}
          onChange={(e) => patch({ origin: e.target.value })}
          placeholder="Country — drives your passport stamps"
          style={S.input}
        />
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
          {["Washed", "Honey", "Natural", "Anaerobic", "Wet Hulled", "Experimental"].map((p) => (
            <Chip key={p} label={p} on={dr.process === p} onClick={() => patch({ process: dr.process === p ? "" : p })} />
          ))}
        </div>
      </div>

      {/* flavour — stored on the bean, editable here for convenience */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.sectionLabel}>Flavor wheel</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4, lineHeight: 1.5 }}>
          {bean
            ? `Tap a family to set intensity. Saved on the "${bean.name}" bean profile, so every batch of it shares these notes.`
            : "This roast has no bean profile, so tasting notes are stored on the roast itself."}
        </div>
        <EditableWheel
          flavors={beanFlavors}
          onChange={(next) => {
            if (bean) setBeanFlavors(bean.id, next);
            else patch({ flavors: next });
          }}
        />
      </div>

      {/* notes */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <label style={S.fieldLabel}>Notes</label>
        <textarea
          value={dr.notes || ""}
          onChange={(e) => patch({ notes: e.target.value })}
          rows={3}
          placeholder="What you'd do differently…"
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
              onClick={() => patch({ rating: dr.rating === n ? 0 : n })}
              className="pressS"
              style={{
                flex: 1,
                height: 52,
                border: "none",
                background: "none",
                cursor: "pointer",
                fontSize: 30,
                lineHeight: 1,
                color: (dr.rating || 0) >= n ? C.rust : C.hair,
                padding: 0,
                outline: "none",
              }}
            >
              {(dr.rating || 0) >= n ? "★" : "☆"}
            </button>
          ))}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 6 }}>
          {["Not rated yet", "Poor — learn from it", "Below par", "Solid", "Great roast", "Best of this bean"][dr.rating || 0]}
        </div>
      </div>

      <button onClick={saveRoastDraft} className="pressY" style={{ ...S.primaryBtn, marginTop: 14 }}>
        Save changes
      </button>

      <DangerAction
        label="Delete this roast"
        message={`Delete batch ${dr.batch || 1} of ${dr.beanName}? This removes the roast and its curve from your journal for good.`}
        confirmLabel="Delete roast"
        onConfirm={deleteRoastDraft}
      />
    </div>
  );
}
