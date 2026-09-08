import { Chip, S, ScreenHeader } from "../components/ui";
import { C, MONO, PROCESSES } from "../lib/constants";
import { useStore } from "../store";

export function NewRoast() {
  const store = useStore();
  const { st, set, beginRoast, nextBatch } = store;

  const picked = st.beans.find((b) => b.id === st.setupBeanId);
  const bName = st.setupMode === "pick" ? (picked ? picked.name : "") : st.setupName.trim();
  const autoBatch = bName ? nextBatch(bName) : 1;
  const batchVal = st.setupBatch != null ? st.setupBatch : autoBatch;
  const g = parseFloat(st.setupGreen);
  const canBegin = g > 0 && (st.setupMode === "pick" ? !!st.setupBeanId : st.setupName.trim().length > 0);

  return (
    <div>
      <ScreenHeader title="New roast" onBack={() => set({ screen: "home" })} />

      {/* roaster */}
      <div
        onClick={() => set({ screen: "devices" })}
        className="press"
        style={{
          ...S.card,
          padding: "13px 16px",
          marginBottom: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <div>
          <div style={S.sectionLabel}>Roaster</div>
          <div style={{ fontWeight: 700, fontSize: 15, marginTop: 2 }}>{store.dev().name}</div>
        </div>
        <span style={{ fontFamily: MONO, fontSize: 11, color: C.olive }}>change →</span>
      </div>

      {/* bean */}
      <div style={S.card}>
        <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Bean</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
          <Chip
            label="Use saved"
            on={st.setupMode === "pick"}
            onClick={() => set({ setupMode: "pick" })}
            style={{ flex: 1, padding: "9px 12px", fontWeight: 600 }}
          />
          <Chip
            label="New profile"
            on={st.setupMode === "new"}
            onClick={() => set({ setupMode: "new", setupBatch: null })}
            style={{ flex: 1, padding: "9px 12px", fontWeight: 600 }}
          />
        </div>
        {st.setupMode === "pick" ? (
          <>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {st.beans.map((b) => (
                <Chip
                  key={b.id}
                  label={b.name}
                  on={st.setupBeanId === b.id}
                  // Switching bean clears any hand-set batch so the number
                  // re-derives for the bean you actually picked.
                  onClick={() => set({ setupBeanId: b.id, setupBatch: null })}
                />
              ))}
              {st.beans.length === 0 ? (
                <span style={{ fontSize: 13, color: C.muted }}>No saved beans yet — switch to New profile.</span>
              ) : null}
            </div>
            {picked ? (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  gap: 10,
                  marginTop: 12,
                }}
              >
                <span style={{ fontSize: 12, color: C.muted, fontFamily: MONO, minWidth: 0 }}>
                  {[picked.origin, picked.region, picked.process].filter(Boolean).join(" · ") || "no details yet"}
                </span>
                <button
                  onClick={() => set({ screen: "bean", beanDraft: { ...picked, flavors: { ...(picked.flavors || {}) } } })}
                  className="pressS"
                  style={{
                    flexShrink: 0,
                    border: `1px solid ${C.hair}`,
                    background: C.field,
                    borderRadius: 999,
                    padding: "5px 12px",
                    fontFamily: MONO,
                    fontSize: 11,
                    cursor: "pointer",
                    color: C.olive,
                  }}
                >
                  edit bean →
                </button>
              </div>
            ) : null}
            {picked?.desc ? (
              <div
                style={{
                  fontSize: 13,
                  color: C.ink,
                  lineHeight: 1.5,
                  marginTop: 6,
                  paddingLeft: 10,
                  borderLeft: `2px solid ${C.hair}`,
                }}
              >
                {picked.desc}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <label style={S.fieldLabel}>Profile name</label>
            <input
              value={st.setupName}
              onChange={(e) => set({ setupName: e.target.value })}
              placeholder="e.g. Ethiopian Yirgacheffe"
              style={S.input}
            />
            <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Origin</label>
            <input
              value={st.setupOrigin}
              onChange={(e) => set({ setupOrigin: e.target.value })}
              placeholder="Country / region"
              style={S.input}
            />
            <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Description</label>
            <textarea
              value={st.setupDesc}
              onChange={(e) => set({ setupDesc: e.target.value })}
              rows={2}
              placeholder="How it behaves, what it tastes like…"
              style={{ ...S.input, resize: "vertical" }}
            />
            <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Process</label>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {PROCESSES.map((p) => (
                <Chip
                  key={p}
                  label={p}
                  on={st.setupProcess === p}
                  onClick={() => set({ setupProcess: st.setupProcess === p ? "" : p })}
                />
              ))}
            </div>
          </>
        )}
      </div>

      {/* batch number */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Batch number</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button
            onClick={() => set({ setupBatch: Math.max(1, batchVal - 1) })}
            className="pressS"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              color: C.ink,
              flexShrink: 0,
            }}
          >
            −
          </button>
          <div
            style={{
              flex: 1,
              display: "flex",
              alignItems: "baseline",
              justifyContent: "center",
              gap: 5,
              background: C.field,
              border: `1px solid ${C.hair}`,
              borderRadius: 12,
              height: 48,
            }}
          >
            <span style={{ fontFamily: MONO, fontSize: 13, color: C.muted, alignSelf: "center" }}>#</span>
            <input
              value={String(batchVal)}
              onChange={(e) => {
                const v = parseInt(e.target.value.replace(/[^0-9]/g, ""), 10);
                set({ setupBatch: isNaN(v) ? null : Math.max(1, v) });
              }}
              inputMode="numeric"
              style={{
                width: 56,
                background: "none",
                border: "none",
                textAlign: "center",
                fontFamily: MONO,
                fontSize: 22,
                fontWeight: 700,
                color: C.ink,
                padding: 0,
                alignSelf: "center",
              }}
            />
          </div>
          <button
            onClick={() => set({ setupBatch: batchVal + 1 })}
            className="pressS"
            style={{
              width: 48,
              height: 48,
              borderRadius: 12,
              border: `1px solid ${C.hair}`,
              background: C.field,
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: 18,
              cursor: "pointer",
              color: C.ink,
              flexShrink: 0,
            }}
          >
            +
          </button>
        </div>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: 8 }}>
          <span style={{ fontSize: 12, color: C.muted }}>
            {st.setupBatch != null
              ? "Set by hand · auto would be " + autoBatch
              : bName
                ? "Auto — batch " + autoBatch + " of " + bName
                : "Auto — first batch of a new bean"}
          </span>
          <button
            onClick={() => set({ setupBatch: null })}
            style={{
              border: "none",
              background: "none",
              color: C.olive,
              fontSize: 12,
              fontWeight: 600,
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 2,
              flexShrink: 0,
            }}
          >
            reset
          </button>
        </div>
      </div>

      {/* green weight */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <label style={S.fieldLabel}>Green weight (g)</label>
        <input
          value={st.setupGreen}
          onChange={(e) => set({ setupGreen: e.target.value.replace(/[^0-9.]/g, "") })}
          inputMode="decimal"
          placeholder="91.6"
          style={{ ...S.input, fontFamily: MONO, fontSize: 16 }}
        />
        <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>Compared to roasted weight for weight-loss %.</div>
      </div>

      <div style={{ textAlign: "center", marginTop: 12 }}>
        <button
          onClick={() => set({ screen: "beans" })}
          style={{
            border: "none",
            background: "none",
            color: C.muted,
            fontFamily: MONO,
            fontSize: 11,
            textDecoration: "underline",
            cursor: "pointer",
            padding: 6,
          }}
        >
          manage bean profiles
        </button>
      </div>

      <button
        onClick={beginRoast}
        disabled={!canBegin}
        className="pressY"
        style={{ ...S.primaryBtn, marginTop: 14, opacity: canBegin ? 1 : 0.4 }}
      >
        Go to roaster →
      </button>
    </div>
  );
}
