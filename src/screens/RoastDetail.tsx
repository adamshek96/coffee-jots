import { useEffect } from "react";
import { StaticWheel, WheelChips } from "../components/FlavorWheel";
import { S, ScreenHeader } from "../components/ui";
import { fmt, lossPct } from "../lib/calc";
import { C, KEYS, LEVELS, MONO, MS, PHASE, SHADES } from "../lib/constants";
import { useStore } from "../store";

export function RoastDetail() {
  const { st, set } = useStore();
  const r = st.roasts.find((x) => x.id === st.detailId);
  useEffect(() => {
    // roast vanished (e.g. restore) — bounce home
    if (!r) set({ screen: "home", detailId: null });
  }, [r, set]);
  if (!r) return null;

  const ev = r.events || {};
  const LV = LEVELS.find((x) => x.name === r.roastLevel);
  const pts = KEYS.map((k) => (ev[k] ? { k, ...ev[k]! } : null)).filter(Boolean) as ({
    k: (typeof KEYS)[number];
  } & { t: number; watts: number; shade?: number })[];
  const hasCurve = pts.length >= 2;
  const dropT = ev.drop ? ev.drop.t : r.durationSec || (pts.length ? pts[pts.length - 1].t : 0);

  let curvePath = "";
  let curveDots: { x: string; y: string; tag: string; tl: string; tagShift: string }[] = [];
  let comparePath: string | null = null;
  let shadeSegs: { left: string; w: string; c: string }[] = [];
  let yTicks: { topPct: string; label: string }[] = [];
  let phaseRects: { left: string; w: string; fill: string }[] = [];

  const cmpR = st.compareId ? st.roasts.find((x) => x.id === st.compareId) : null;

  if (hasCurve) {
    const maxT = dropT || pts[pts.length - 1].t || 1;
    const ws = pts.map((p) => p.watts);
    let lo = Math.min(...ws);
    let hi = Math.max(...ws);
    const span = Math.max(40, hi - lo);
    lo = Math.floor((lo - span * 0.18) / 10) * 10;
    hi = Math.ceil((hi + span * 0.18) / 10) * 10;
    const X = (t: number) => 4 + (t / maxT) * 92;
    const Y = (w: number) => 8 + (1 - (w - lo) / (hi - lo)) * 84;
    curvePath = pts.map((p, i) => (i ? "L" : "M") + X(p.t).toFixed(2) + "," + Y(p.watts).toFixed(2)).join(" ");
    const TAGS: Record<string, string> = {
      charge: "CH",
      yellowing: "YE",
      browning: "BR",
      fc: "FC",
      fcEnds: "FE",
      cooling: "CO",
      drop: "DR",
    };
    let lastLabel = -99;
    let lastTag = -99;
    let tagAlt = false;
    curveDots = pts.map((p) => {
      const xp = X(p.t);
      const showTl = xp - lastLabel >= 9;
      if (showTl) lastLabel = xp;
      if (xp - lastTag < 8) tagAlt = !tagAlt;
      else tagAlt = false;
      lastTag = xp;
      return {
        x: xp.toFixed(2),
        y: Y(p.watts).toFixed(2),
        tag: TAGS[p.k],
        tl: showTl ? fmt(p.t) : "",
        tagShift: tagAlt ? "-320%" : "-190%",
      };
    });
    if (cmpR) {
      const cpts = KEYS.map((k) => cmpR.events[k] || null).filter(Boolean) as { t: number; watts: number }[];
      comparePath = cpts
        .map(
          (p, i) =>
            (i ? "L" : "M") +
            X(Math.min(p.t, maxT)).toFixed(2) +
            "," +
            Y(Math.max(lo, Math.min(hi, p.watts))).toFixed(2),
        )
        .join(" ");
    }
    const kk = KEYS.filter((k) => ev[k]);
    kk.forEach((k, i) => {
      const e = ev[k]!;
      const nxt = kk[i + 1] ? ev[kk[i + 1]]! : null;
      if (e.shade == null) return;
      const t0 = e.t;
      const t1 = nxt ? nxt.t : dropT;
      shadeSegs.push({
        left: ((t0 / maxT) * 100).toFixed(2),
        w: (((t1 - t0) / maxT) * 100).toFixed(2),
        c: SHADES[e.shade].c,
      });
    });
    const mid = Math.round((lo + hi) / 2 / 10) * 10;
    yTicks = [hi, mid, lo].map((w) => ({ topPct: Y(w).toFixed(2), label: String(w) }));
    const rects: { left: number; w: number; fill: string }[] = [];
    if (ev.yellowing) rects.push({ left: X(0), w: X(ev.yellowing.t) - X(0), fill: PHASE.drying + "2E" });
    if (ev.yellowing && ev.fc)
      rects.push({ left: X(ev.yellowing.t), w: X(ev.fc.t) - X(ev.yellowing.t), fill: PHASE.maillard + "2E" });
    if (ev.fc && dropT) rects.push({ left: X(ev.fc.t), w: X(dropT) - X(ev.fc.t), fill: PHASE.development + "2E" });
    phaseRects = rects.map((x) => ({ left: x.left.toFixed(2), w: x.w.toFixed(2), fill: x.fill }));
  }

  const phases: { key: string; label: string; d: number }[] = [];
  if (ev.yellowing) phases.push({ key: "drying", label: "Drying", d: ev.yellowing.t });
  if (ev.yellowing && ev.fc) phases.push({ key: "maillard", label: "Maillard", d: ev.fc.t - ev.yellowing.t });
  if (ev.fc && dropT) phases.push({ key: "development", label: "Development", d: dropT - ev.fc.t });
  const pTotal = phases.reduce((x, p) => x + p.d, 0) || 1;

  const sumRows: { k: string; v: string }[] = [
    { k: "Batch", v: "#" + (r.batch || 1) },
    { k: "Duration", v: fmt(r.durationSec || dropT) },
    {
      k: "Green → roasted",
      v: r.greenWeight + "g → " + (typeof r.roastedWeight === "number" ? r.roastedWeight + "g" : "—"),
    },
  ];
  const loss = lossPct(r);
  if (loss != null) sumRows.push({ k: "Weight loss", v: loss.toFixed(1) + "%" });
  if (r.roastLevel) sumRows.push({ k: "Roast level", v: r.roastLevel });
  if (r.evenness) sumRows.push({ k: "Evenness", v: r.evenness + "/5" });
  if (r.rating) sumRows.push({ k: "Performance", v: r.rating + "/5" });
  sumRows.push({ k: "Roaster", v: r.deviceName || "Popper" });
  if (r.origin) sumRows.push({ k: "Origin", v: r.origin });
  if (r.process) sumRows.push({ k: "Process", v: r.process });

  const sibs = st.roasts.filter((x) => x.beanName === r.beanName && x.id !== r.id && x.events && x.events.drop);
  const devPctOf = (x: typeof r) => {
    const e = x.events || {};
    const dt = e.drop ? e.drop.t : x.durationSec;
    return e.fc && dt ? Math.round(((dt - e.fc.t) / dt) * 100) + "%" : "—";
  };
  const lossOf = (x: typeof r) => {
    const l = lossPct(x);
    return l != null ? l.toFixed(1) + "%" : "—";
  };

  const flavors = r.flavors || {};
  const hasFlavor = Object.keys(flavors).some((k) => flavors[k]);

  return (
    <div>
      <ScreenHeader
        title="Roast details"
        onBack={() => set({ screen: "home" })}
        right={
          <button
            onClick={() => set({ screen: "share", shareKind: "roast", shareId: r.id })}
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

      {/* title card */}
      <div style={{ ...S.card, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em" }}>{r.beanName}</div>
        <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 4 }}>
          {new Date(r.createdAt).toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
        </div>
        <div style={{ display: "flex", justifyContent: "center", gap: 7, marginTop: 10, flexWrap: "wrap" }}>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 11,
              padding: "4px 10px",
              borderRadius: 999,
              background: C.olive,
              color: C.cream,
              fontWeight: 700,
            }}
          >
            Batch {r.batch || 1}
          </span>
          {r.origin || r.process ? (
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                border: `1px solid ${C.hair}`,
                color: C.muted,
                fontWeight: 600,
              }}
            >
              {[r.origin, r.process].filter(Boolean).join(" · ")}
            </span>
          ) : null}
          {r.roastLevel ? (
            <span
              style={{
                fontSize: 11,
                padding: "4px 10px",
                borderRadius: 999,
                background: LV?.c || "#E2E7D4",
                color: LV ? (LV.light ? C.ink : C.cream) : C.oliveDeep,
                fontWeight: 600,
              }}
            >
              {r.roastLevel}
            </span>
          ) : null}
        </div>
        {r.rating ? (
          <div style={{ fontSize: 20, letterSpacing: 3, color: C.rust, marginTop: 10 }}>
            {"★".repeat(r.rating) + "☆".repeat(5 - r.rating)}
          </div>
        ) : null}
        {r.beanDesc ? (
          <div
            style={{
              fontSize: 13,
              color: C.muted,
              lineHeight: 1.5,
              marginTop: 12,
              textAlign: "left",
              paddingLeft: 10,
              borderLeft: `2px solid ${C.hair}`,
            }}
          >
            {r.beanDesc}
          </div>
        ) : null}
      </div>

      {/* curve */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 12 }}>{(r.axis || "watts") + " curve"}</div>
        {hasCurve ? (
          <>
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 28, position: "relative", flexShrink: 0 }}>
                {yTicks.map((yt, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      right: 0,
                      top: yt.topPct + "%",
                      transform: "translateY(-50%)",
                      fontFamily: MONO,
                      fontSize: 9,
                      color: C.faint,
                    }}
                  >
                    {yt.label}
                  </div>
                ))}
              </div>
              <div
                style={{
                  flex: 1,
                  position: "relative",
                  height: 188,
                  border: `1px solid ${C.hair}`,
                  backgroundColor: C.paperLight,
                  backgroundImage:
                    "repeating-linear-gradient(0deg, rgba(183,175,159,0.55) 0px, rgba(183,175,159,0.55) 0.5px, transparent 0.5px, transparent 15px)," +
                    "repeating-linear-gradient(90deg, rgba(183,175,159,0.55) 0px, rgba(183,175,159,0.55) 0.5px, transparent 0.5px, transparent 15px)",
                }}
              >
                {phaseRects.map((pr, i) => (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      top: 0,
                      bottom: 0,
                      left: pr.left + "%",
                      width: pr.w + "%",
                      background: pr.fill,
                    }}
                  />
                ))}
                <svg
                  viewBox="0 0 100 100"
                  preserveAspectRatio="none"
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
                >
                  {comparePath ? (
                    <path
                      d={comparePath}
                      style={{
                        fill: "none",
                        stroke: C.compare,
                        strokeWidth: 2,
                        strokeDasharray: "5 4",
                        strokeLinejoin: "round",
                        vectorEffect: "non-scaling-stroke",
                      }}
                    />
                  ) : null}
                  <path
                    d={curvePath}
                    style={{
                      fill: "none",
                      stroke: "#C0472B",
                      strokeWidth: 2.5,
                      strokeLinejoin: "round",
                      strokeLinecap: "round",
                      vectorEffect: "non-scaling-stroke",
                    }}
                  />
                </svg>
                {curveDots.map((d, i) => (
                  <span key={i}>
                    <span
                      style={{
                        position: "absolute",
                        left: d.x + "%",
                        top: d.y + "%",
                        transform: "translate(-50%,-50%)",
                        width: 10,
                        height: 10,
                        borderRadius: "50%",
                        background: C.paperLight,
                        border: "2px solid #C0472B",
                      }}
                    />
                    <span
                      style={{
                        position: "absolute",
                        left: d.x + "%",
                        top: d.y + "%",
                        transform: `translate(-50%,${d.tagShift})`,
                        fontFamily: MONO,
                        fontSize: 8,
                        fontWeight: 700,
                        color: C.rust,
                      }}
                    >
                      {d.tag}
                    </span>
                  </span>
                ))}
              </div>
            </div>
            <div style={{ position: "relative", height: 14, marginLeft: 34, marginTop: 4 }}>
              {curveDots.map((d, i) =>
                d.tl ? (
                  <div
                    key={i}
                    style={{
                      position: "absolute",
                      left: d.x + "%",
                      transform: "translateX(-50%)",
                      fontFamily: MONO,
                      fontSize: 9,
                      color: C.faint,
                    }}
                  >
                    {d.tl}
                  </div>
                ) : null,
              )}
            </div>
            {shadeSegs.length > 0 ? (
              <div style={{ marginLeft: 34, marginTop: 8 }}>
                <div style={{ display: "flex", height: 14, borderRadius: 4, overflow: "hidden", border: `1px solid ${C.hair}` }}>
                  {shadeSegs.map((s, i) => (
                    <div key={i} style={{ width: s.w + "%", background: s.c }} />
                  ))}
                </div>
                <div style={{ ...S.mono9, marginTop: 4 }}>bean color, as you saw it</div>
              </div>
            ) : null}
            <div style={{ ...S.mono9, marginTop: 6 }}>{(r.axis || "watts") + " · time →"}</div>
          </>
        ) : (
          <div style={{ fontSize: 13, color: C.muted }}>Not enough milestones logged to draw a curve.</div>
        )}
      </div>

      {/* phase breakdown */}
      {phases.length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Phase breakdown</div>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 30 }}>
            {phases.map((p) => (
              <div
                key={p.key}
                style={{
                  width: ((p.d / pTotal) * 100).toFixed(1) + "%",
                  background: PHASE[p.key],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3A2F1A",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: MONO,
                }}
              >
                {Math.round((p.d / pTotal) * 100) + "%"}
              </div>
            ))}
          </div>
          <div style={{ marginTop: 10, display: "flex", flexDirection: "column", gap: 2 }}>
            {phases.map((p) => (
              <div
                key={p.key}
                style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "3px 0", fontSize: 13 }}
              >
                <span style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <span style={{ width: 9, height: 9, borderRadius: 2, background: PHASE[p.key] }} />
                  {p.label}
                </span>
                <span style={{ fontFamily: MONO }}>{fmt(p.d)}</span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {/* compare batches */}
      {sibs.length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 4 }}>Compare batches</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>
            Overlay another batch of this bean on the curve above.
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {sibs.map((s) => {
              const on = st.compareId === s.id;
              return (
                <button
                  key={s.id}
                  onClick={() => set({ compareId: on ? null : s.id })}
                  className="pressS"
                  style={{
                    padding: "8px 13px",
                    borderRadius: 999,
                    border: `1px solid ${on ? C.compare : C.hair}`,
                    background: on ? C.compare : C.field,
                    color: on ? C.cream : C.ink,
                    fontFamily: MONO,
                    fontSize: 12,
                    cursor: "pointer",
                  }}
                >
                  {"B" + (s.batch || 1) + (s.rating ? " " + "★".repeat(s.rating) : "")}
                </button>
              );
            })}
          </div>
          {cmpR ? (
            <div style={{ marginTop: 14 }}>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 62px 62px",
                  paddingBottom: 6,
                  borderBottom: `1px solid ${C.hair}`,
                  fontSize: 11,
                  color: C.muted,
                }}
              >
                <span>{"Batch " + (r.batch || 1) + " vs batch " + (cmpR.batch || 1)}</span>
                <span style={{ textAlign: "right", color: "#C0472B" }}>this</span>
                <span style={{ textAlign: "right", color: C.compare }}>other</span>
              </div>
              {[
                { k: "Duration", a: fmt(r.durationSec || 0), b: fmt(cmpR.durationSec || 0) },
                { k: "Development", a: devPctOf(r), b: devPctOf(cmpR) },
                { k: "Weight loss", a: lossOf(r), b: lossOf(cmpR) },
                {
                  k: "Rating",
                  a: r.rating ? r.rating + "★" : "—",
                  b: cmpR.rating ? cmpR.rating + "★" : "—",
                },
              ].map((row) => (
                <div
                  key={row.k}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 62px 62px",
                    padding: "7px 0",
                    borderBottom: "1px solid rgba(183,175,159,0.4)",
                  }}
                >
                  <span style={{ fontSize: 13, color: C.muted }}>{row.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", fontWeight: 700 }}>{row.a}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: C.compare }}>{row.b}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* flavor wheel */}
      {hasFlavor ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={S.sectionLabel}>Flavor wheel</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            <StaticWheel flavors={flavors} />
            <WheelChips flavors={flavors} />
          </div>
        </div>
      ) : null}

      {/* summary */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 6 }}>Summary</div>
        {sumRows.map((s) => (
          <div
            key={s.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid rgba(183,175,159,0.35)",
            }}
          >
            <span style={{ color: C.muted, fontSize: 13 }}>{s.k}</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{s.v}</span>
          </div>
        ))}
      </div>

      {/* notes */}
      {r.notes ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 6 }}>Notes</div>
          <div style={{ fontSize: 13, lineHeight: 1.5 }}>{r.notes}</div>
        </div>
      ) : null}

      {/* milestone log */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>Milestone log</div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 52px 40px 56px",
            paddingBottom: 6,
            borderBottom: `1px solid ${C.hair}`,
            fontSize: 11,
            color: C.muted,
          }}
        >
          <span>Event</span>
          <span style={{ textAlign: "right" }}>Time</span>
          <span style={{ textAlign: "right" }}>Dial</span>
          <span style={{ textAlign: "right" }}>{r.unit || "W"}</span>
        </div>
        {KEYS.filter((k) => ev[k]).map((k) => {
          const m = MS.find((x) => x.key === k)!;
          const e = ev[k]!;
          return (
            <div
              key={k}
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 52px 40px 56px",
                padding: "7px 0",
                borderBottom: "1px solid rgba(183,175,159,0.4)",
                alignItems: "baseline",
              }}
            >
              <span style={{ minWidth: 0 }}>
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  {e.shade != null ? (
                    <span
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: "50%",
                        background: SHADES[e.shade].c,
                        flexShrink: 0,
                        boxShadow: "inset 0 0 0 1px rgba(36,29,22,0.25)",
                      }}
                    />
                  ) : null}
                  <span style={{ fontSize: 13, fontWeight: 600 }}>{m.label}</span>
                </span>
                {e.sound ? (
                  <span style={{ display: "block", fontFamily: MONO, fontSize: 10, color: C.muted, marginTop: 2, paddingLeft: 15 }}>
                    {e.sound}
                  </span>
                ) : null}
              </span>
              <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{fmt(e.t)}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{e.dial ? String(e.dial) : "—"}</span>
              <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>{e.watts + (r.unit || "W")}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
