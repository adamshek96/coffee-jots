import { S, ScreenHeader } from "../components/ui";
import { wheelGeom } from "../lib/calc";
import { C, MONO } from "../lib/constants";
import { useStore } from "../store";
import type { Bean } from "../types";

export const NEW_BEAN: Bean = { id: "", name: "", origin: "", region: "", process: "", desc: "", flavors: {} };

export function Beans() {
  const { st, set } = useStore();

  return (
    <div>
      <ScreenHeader title="Bean profiles" onBack={() => set({ screen: "home" })} />
      <div style={{ fontSize: 13, color: C.muted, margin: "0 0 14px 52px" }}>
        Origin, process and tasting notes live here — edit one and every roast of that bean follows.
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {st.beans.map((b) => {
          const count = st.roasts.filter((r) => r.beanId === b.id || r.beanName === b.name).length;
          const chips = wheelGeom(b.flavors || {}).chips;
          return (
            <div
              key={b.id}
              onClick={() => set({ screen: "bean", beanDraft: { ...b, flavors: { ...(b.flavors || {}) } } })}
              className="press"
              style={{ ...S.card, cursor: "pointer" }}
            >
              <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>{b.name}</div>
                  <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>
                    {[b.origin, b.region, b.process].filter(Boolean).join(" · ") || "no origin set"}
                  </div>
                </div>
                <span style={{ fontFamily: MONO, fontSize: 11, color: C.muted, flexShrink: 0 }}>
                  {count ? "×" + count : "unroasted"}
                </span>
              </div>
              {b.desc ? (
                <div
                  style={{
                    fontSize: 13,
                    color: C.ink,
                    lineHeight: 1.5,
                    marginTop: 8,
                    paddingLeft: 10,
                    borderLeft: `2px solid ${C.hair}`,
                  }}
                >
                  {b.desc}
                </div>
              ) : null}
              {chips.length ? (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                  {chips.map((f) => (
                    <span
                      key={f.name}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "4px 9px",
                        borderRadius: 999,
                        border: `1px solid ${f.c}`,
                        color: f.c,
                        fontSize: 11,
                        fontWeight: 600,
                      }}
                    >
                      {f.name}
                      <span style={{ fontFamily: MONO, letterSpacing: 1 }}>{f.dots}</span>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          );
        })}
        {st.beans.length === 0 ? (
          <div style={{ ...S.card, fontSize: 13, color: C.muted }}>
            No bean profiles yet. Add one here, or create it when you start a roast.
          </div>
        ) : null}
      </div>

      <button
        onClick={() => set({ screen: "bean", beanDraft: { ...NEW_BEAN, flavors: {} } })}
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
        }}
      >
        + &nbsp;New bean profile
      </button>
    </div>
  );
}
