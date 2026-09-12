import { Stamp } from "../components/Stamp";
import { S, ScreenHeader } from "../components/ui";
import { originStamps, stampify } from "../lib/calc";
import { C, GHOST_ORIGINS, MONO } from "../lib/constants";
import { useStore } from "../store";

const DYS = [-4, 10, -10, 6, -2, 12];

export function Passport() {
  const { st, set, toggleWishlist } = useStore();
  const stamps = originStamps(st.roasts);
  const earned = new Set(stamps.map((s) => s.origin.toLowerCase()));
  const ghosts = GHOST_ORIGINS.filter((o) => !earned.has(o.toLowerCase())).slice(0, 6);

  return (
    <div>
      <ScreenHeader
        title="Passport"
        onBack={() => set({ screen: "home" })}
        right={
          <button
            onClick={() => set({ screen: "share", shareKind: "passport", shareId: null })}
            className="pressS"
            style={{
              height: 40,
              padding: "0 14px",
              borderRadius: 12,
              border: `1px solid ${C.olive}`,
              background: C.olive,
              color: C.cream,
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: "0.06em",
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            SHARE
          </button>
        }
      />

      <div style={{ ...S.card, padding: "18px 16px", textAlign: "center", animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}>
        <div style={S.sectionLabel}>Countries collected</div>
        <div style={{ fontFamily: MONO, fontSize: 46, fontWeight: 700, letterSpacing: "-0.02em", lineHeight: 1.15 }}>
          {stamps.length}
        </div>
        <div style={{ fontSize: 12, color: C.muted }}>A stamp for every bean origin you've roasted.</div>
      </div>

      {/* stamp page */}
      <div
        style={{
          position: "relative",
          marginTop: 12,
          border: `1px solid ${C.hair}`,
          borderRadius: 16,
          padding: "26px 14px",
          backgroundColor: C.paperLight,
          backgroundImage:
            "repeating-linear-gradient(0deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 17px)," +
            "repeating-linear-gradient(90deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 17px)",
          boxShadow: "inset 0 0 22px rgba(122,113,95,0.16)",
        }}
      >
        <div style={{ position: "absolute", top: 0, bottom: 0, left: 26, width: 1, background: "rgba(169,97,58,0.35)" }} />
        <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.2em", color: C.faint, textAlign: "center", marginBottom: 16 }}>
          — ENTRIES —
        </div>
        {stamps.length === 0 ? (
          <div style={{ fontSize: 13, color: C.muted, textAlign: "center", padding: "10px 0 16px" }}>
            Roast a bean with an origin set and its stamp lands here.
          </div>
        ) : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "16px 18px", justifyContent: "center" }}>
          {stamps.map((s, i) => {
            const spec = stampify(s, i, 104, false, DYS[i % 6], 0);
            return (
              // positioning stays on the outer node so the landing animation,
              // which owns transform, doesn't fight the vertical offset
              <div key={s.origin} style={{ transform: `translateY(${spec.dy}px)` }}>
                <div className="cjStamp" style={{ animationDelay: `${i * 85}ms` }}>
                  <Stamp s={spec} showDate />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ghost stamps */}
      {ghosts.length > 0 ? (
        <div style={{ ...S.card, padding: "18px 14px", marginTop: 12, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: "200ms" }}>
          <div style={{ ...S.sectionLabel, marginBottom: 6, textAlign: "center" }}>Still to collect</div>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center", marginBottom: 14 }}>
            {st.settings.wishlist.length
              ? st.settings.wishlist.length + " on your buy list — tap a stamp to drop it"
              : "Tap a ghost stamp to add that origin to your buy list."}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 16px", justifyContent: "center" }}>
            {ghosts.map((o, i) => {
              const wanted = st.settings.wishlist.indexOf(o) >= 0;
              const s = stampify({ origin: o }, i, 86, true, DYS[(i + 3) % 6], 0);
              const spec = {
                ...s,
                c: wanted ? C.rust : s.c,
                op: wanted ? 0.9 : s.op,
                top: wanted ? "ON THE LIST" : "TO ROAST",
                fsTop: wanted ? (86 * 0.07).toFixed(1) : s.fsTop,
              };
              return (
                <div
                  key={o}
                  onClick={() => toggleWishlist(o)}
                  className="press"
                  style={{ transform: `translateY(${spec.dy}px)`, cursor: "pointer" }}
                >
                  <Stamp s={spec} />
                </div>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
