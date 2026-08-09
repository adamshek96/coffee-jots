import { useEffect } from "react";
import { Stamp } from "../components/Stamp";
import { S, ScreenHeader } from "../components/ui";
import { curveFor, fmt, lossPct, originStamps, stampify } from "../lib/calc";
import { deliverImage, renderPassportPoster, renderRoastCard } from "../lib/cardImage";
import { C, LEVELS, MONO } from "../lib/constants";
import { useStore } from "../store";

const paperCard = {
  position: "relative" as const,
  border: "1px solid #A79E8C",
  borderRadius: 14,
  backgroundColor: C.paperLight,
  backgroundImage:
    "repeating-linear-gradient(0deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 16px)," +
    "repeating-linear-gradient(90deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 16px)",
  boxShadow: "0 14px 30px rgba(36,29,22,0.18)",
};

export function Share() {
  const { st, set, flash, togglePublish } = useStore();
  const isR = st.shareKind === "roast";

  const r = isR ? st.roasts.find((x) => x.id === st.shareId) || st.roasts[0] : null;
  const stamps = originStamps(st.roasts);

  const close = () => set({ screen: isR ? "detail" : "passport" });

  useEffect(() => {
    if (isR && !r) set({ screen: "home" });
  }, [isR, r, set]);
  if (isR && !r) return null;

  let body: JSX.Element;
  if (isR && r) {
    const ev = r.events || {};
    const drop = ev.drop ? ev.drop.t : r.durationSec || 0;
    const dev = ev.fc && drop ? Math.round(((drop - ev.fc.t) / drop) * 100) : null;
    const loss = lossPct(r);
    const LV = LEVELS.find((x) => x.name === r.roastLevel);
    const cg = curveFor(r);
    const originCount = r.origin ? st.roasts.filter((x) => (x.origin || "") === r.origin).length : 0;
    const stamp = r.origin ? stampify({ origin: r.origin, count: originCount }, 0, 76, false, 0, 0) : null;
    const caption =
      "Batch " +
      (r.batch || 1) +
      " · " +
      r.beanName +
      (r.origin ? " (" + r.origin + ")" : "") +
      " — " +
      (r.roastLevel || "roasted") +
      ", " +
      fmt(drop) +
      (dev != null ? ", " + dev + "% development" : "") +
      (loss != null ? ", −" + loss.toFixed(1) + "% weight" : "") +
      (r.rating ? " " + "★".repeat(r.rating) : "") +
      " #homeroasting";
    const token = st.settings.published[r.id];

    const saveImage = async () => {
      const blob = await renderRoastCard(r, originCount);
      const how = await deliverImage(blob, "coffee-jots-batch-" + (r.batch || 1) + ".png");
      flash(how === "shared" ? "Roast card shared" : "Roast card downloaded");
    };
    const copy = (text: string) => {
      try {
        void navigator.clipboard.writeText(text);
      } catch {
        /* unsupported */
      }
      flash("Copied");
    };

    body = (
      <>
        {/* roast card */}
        <div style={{ ...paperCard, padding: "20px 18px 16px", overflow: "hidden" }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 10 }}>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.16em", color: C.rust, fontWeight: 700 }}>
              BATCH {r.batch || 1}
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.1em", color: C.faint }}>
              {new Date(r.createdAt).toLocaleDateString(undefined, { month: "long", day: "numeric", year: "numeric" })}
            </span>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700, letterSpacing: "-0.03em", marginTop: 6 }}>{r.beanName}</div>
          <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 3 }}>
            {[r.origin, r.process, r.deviceName].filter(Boolean).join(" · ")}
          </div>

          {cg ? (
            <>
              <div style={{ position: "relative", height: 150, marginTop: 16, borderTop: `1px solid ${C.hair}`, borderBottom: `1px solid ${C.hair}` }}>
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                >
                  <path
                    d={cg.path}
                    style={{
                      fill: "none",
                      stroke: "#C0472B",
                      strokeWidth: 3,
                      strokeLinejoin: "round",
                      strokeLinecap: "round",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                </svg>
                {cg.dots.map((d, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: d.x + "%",
                      top: d.y + "%",
                      transform: "translate(-50%,-50%)",
                      width: 9,
                      height: 9,
                      borderRadius: "50%",
                      background: C.paperLight,
                      border: "2px solid #C0472B",
                    }}
                  />
                ))}
              </div>
              <div style={{ display: "flex", height: 10, marginTop: 6, borderRadius: 3, overflow: "hidden" }}>
                {cg.shadeSegs.map((s, i) => (
                  <div key={i} style={{ width: s.w + "%", background: s.c }} />
                ))}
              </div>
              <div style={{ ...S.mono9, marginTop: 5 }}>
                {(r.axis || "watts") + " over time · no probe, by eye and ear"}
              </div>
            </>
          ) : null}

          <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
            {(
              [
                ["Time", fmt(drop)],
                ["Dev", dev != null ? dev + "%" : "—"],
                ["Loss", loss != null ? loss.toFixed(1) + "%" : "—"],
                ["Even", r.evenness ? r.evenness + "/5" : "—"],
              ] as [string, string][]
            ).map(([l, v]) => (
              <div key={l} style={{ flex: 1 }}>
                <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.12em", color: C.faint, textTransform: "uppercase" }}>
                  {l}
                </div>
                <div style={{ fontFamily: MONO, fontSize: 17, fontWeight: 700, marginTop: 2 }}>{v}</div>
              </div>
            ))}
          </div>

          <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between", gap: 10, marginTop: 16 }}>
            <div>
              <span
                style={{
                  display: "inline-block",
                  fontSize: 11,
                  padding: "4px 11px",
                  borderRadius: 999,
                  background: LV ? LV.c : C.hair,
                  color: LV && !LV.light ? C.cream : C.ink,
                  fontWeight: 600,
                }}
              >
                {r.roastLevel || "—"}
              </span>
              <div style={{ fontSize: 15, color: C.rust, letterSpacing: 2, marginTop: 6 }}>
                {r.rating ? "★".repeat(r.rating) : ""}
              </div>
              <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: C.faint, marginTop: 8 }}>
                COFFEE JOTS · ROASTING JOURNAL
              </div>
            </div>
            {stamp ? <Stamp s={{ ...stamp, top: "ROASTED" }} /> : null}
          </div>
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
          <button
            onClick={() => void saveImage()}
            className="pressY"
            style={{ ...S.primaryBtn, flex: 1, borderRadius: 13, padding: 15, fontSize: 15 }}
          >
            Save image
          </button>
          <button
            onClick={() => copy(caption)}
            className="pressY"
            style={{ ...S.secondaryBtn, flex: 1, borderRadius: 13, padding: 15 }}
          >
            Copy caption
          </button>
        </div>

        <div style={{ ...S.card, padding: "14px 16px", marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Caption</div>
          <div style={{ fontFamily: MONO, fontSize: 12, lineHeight: 1.6, color: C.ink }}>{caption}</div>
        </div>

        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.sectionLabel}>Read-only link</div>
          <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
            Anyone with the link sees this one roast — curve, milestones, notes. Never your other roasts, never an
            account. Revoke any time. (Stub in v1 — no server behind it yet.)
          </div>
          {token ? (
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
              <div
                style={{
                  flex: 1,
                  minWidth: 0,
                  fontFamily: MONO,
                  fontSize: 13,
                  background: C.field,
                  border: `1px solid ${C.hair}`,
                  borderRadius: 11,
                  padding: "12px 13px",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                jots.link/r/{token}
              </div>
              <button
                onClick={() => copy("https://jots.link/r/" + token)}
                className="pressS"
                style={{
                  flexShrink: 0,
                  border: `1px solid ${C.olive}`,
                  background: C.olive,
                  color: C.cream,
                  borderRadius: 11,
                  padding: "12px 14px",
                  fontSize: 13,
                  fontWeight: 600,
                  fontFamily: "inherit",
                  cursor: "pointer",
                }}
              >
                Copy
              </button>
            </div>
          ) : null}
          <button
            onClick={() => togglePublish(r.id)}
            className="pressY"
            style={{
              width: "100%",
              marginTop: 12,
              border: `1px solid ${token ? C.rust : C.olive}`,
              background: token ? "transparent" : C.olive,
              color: token ? C.rust : C.cream,
              borderRadius: 13,
              padding: 14,
              fontSize: 15,
              fontWeight: 600,
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            {token ? "Revoke link" : "Create read-only link"}
          </button>
        </div>
      </>
    );
  } else {
    const savePoster = async () => {
      const blob = await renderPassportPoster(st.roasts);
      const how = await deliverImage(blob, "coffee-jots-passport.png");
      flash(how === "shared" ? "Passport poster shared" : "Passport poster downloaded");
    };
    body = (
      <>
        <div style={{ ...paperCard, padding: "22px 16px 18px" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.2em", color: C.rust, fontWeight: 700, textAlign: "center" }}>
            COFFEE PASSPORT
          </div>
          <div style={{ fontFamily: MONO, fontSize: 52, fontWeight: 700, textAlign: "center", lineHeight: 1.1, marginTop: 6 }}>
            {stamps.length}
          </div>
          <div style={{ fontSize: 12, color: C.muted, textAlign: "center" }}>origins roasted at home</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "14px 16px", justifyContent: "center", marginTop: 18 }}>
            {stamps.map((s, i) => {
              const spec = stampify(s, i, 88, false, 0, 0);
              return (
                <div key={s.origin}>
                  <Stamp s={spec} />
                </div>
              );
            })}
          </div>
          <div style={{ fontFamily: MONO, fontSize: 9, letterSpacing: "0.14em", color: C.faint, textAlign: "center", marginTop: 20 }}>
            COFFEE JOTS · ROASTING JOURNAL
          </div>
        </div>
        <button
          onClick={() => void savePoster()}
          className="pressY"
          style={{ ...S.primaryBtn, borderRadius: 13, padding: 16, fontSize: 15, marginTop: 14 }}
        >
          Save poster
        </button>
      </>
    );
  }

  return (
    <div>
      <ScreenHeader title={isR ? "Share this roast" : "Share your passport"} onBack={close} glyph="✕" />
      {body}
    </div>
  );
}
