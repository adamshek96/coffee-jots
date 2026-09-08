import { StaticWheel } from "../components/FlavorWheel";
import { S, ScreenHeader } from "../components/ui";
import { avg, fmt, lossPct } from "../lib/calc";
import { C, FAMILIES, LEVELS, MONO, PHASE } from "../lib/constants";
import { useStore } from "../store";

export function Analytics() {
  const { st, set } = useStore();
  const R = st.roasts;

  // roasts per month, last 6
  const mo: { y: number; m: number; label: string; n: number }[] = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    mo.push({
      y: d.getFullYear(),
      m: d.getMonth(),
      label: d.toLocaleDateString(undefined, { month: "short" }).toUpperCase(),
      n: 0,
    });
  }
  R.forEach((r) => {
    const d = new Date(r.createdAt);
    const slot = mo.find((x) => x.y === d.getFullYear() && x.m === d.getMonth());
    if (slot) slot.n++;
  });
  const moMax = Math.max(1, ...mo.map((x) => x.n));

  // bean by bean
  const byBean: Record<string, { name: string; n: number; loss: number[]; rating: number[] }> = {};
  R.forEach((r) => {
    const k = r.beanName;
    if (!byBean[k]) byBean[k] = { name: k, n: 0, loss: [], rating: [] };
    const b = byBean[k];
    b.n++;
    const l = lossPct(r);
    if (l != null) b.loss.push(l);
    if (r.rating) b.rating.push(r.rating);
  });

  // level spread
  const lv: Record<string, number> = {};
  R.forEach((r) => {
    if (r.roastLevel) lv[r.roastLevel] = (lv[r.roastLevel] || 0) + 1;
  });
  const lvTotal = Object.values(lv).reduce((x, y) => x + y, 0) || 1;

  // rating distribution
  const rc = [0, 0, 0, 0, 0];
  R.forEach((r) => {
    if (r.rating) rc[r.rating - 1]++;
  });
  const rcMax = Math.max(1, ...rc);

  // phase balance
  const fr: Record<string, number[]> = { drying: [], maillard: [], development: [] };
  R.forEach((r) => {
    const e = r.events || {};
    const drop = e.drop ? e.drop.t : r.durationSec;
    if (!e.yellowing || !e.fc || !drop) return;
    fr.drying.push(e.yellowing.t / drop);
    fr.maillard.push((e.fc.t - e.yellowing.t) / drop);
    fr.development.push((drop - e.fc.t) / drop);
  });

  // averaged flavor wheel
  // Flavour lives on the bean now — weight each bean by how often it's roasted,
  // falling back to any per-roast flavours logged before the move.
  const agg: Record<string, number> = {};
  const flavorSources = R.map((r) => {
    const bean = st.beans.find((b) => b.id === r.beanId || b.name === r.beanName);
    return bean?.flavors && Object.keys(bean.flavors).length ? bean.flavors : r.flavors;
  }).filter(Boolean) as Record<string, number>[];
  FAMILIES.forEach((f) => {
    const vs = flavorSources.filter((fl) => fl[f.name]).map((fl) => fl[f.name]);
    const a = avg(vs);
    if (a != null) agg[f.name] = a;
  });
  const aggChips = FAMILIES.filter((f) => agg[f.name])
    .sort((x, y) => agg[y.name] - agg[x.name])
    .slice(0, 4);

  // insights
  const top = R.filter((r) => (r.rating || 0) >= 4);
  const rest = R.filter((r) => r.rating && r.rating < 4);
  const devPct = (arr: typeof R) =>
    avg(
      arr
        .map((r) => {
          const e = r.events || {};
          const drop = e.drop ? e.drop.t : r.durationSec;
          return e.fc && drop ? ((drop - e.fc.t) / drop) * 100 : null;
        })
        .filter((x): x is number => x != null),
    );
  const insights: { k: string; v: string }[] = [];
  if (top.length && rest.length) {
    const a1 = devPct(top);
    const a2 = devPct(rest);
    if (a1 != null && a2 != null)
      insights.push({
        k: "Development window",
        v: "Your 4★+ roasts develop " + Math.round(a1) + "% of the roast, vs " + Math.round(a2) + "% on the rest.",
      });
  }
  if (top.length) {
    const t = avg(top.map((r) => r.durationSec || 0).filter(Boolean));
    if (t) insights.push({ k: "Sweet-spot length", v: "Best-rated roasts run about " + fmt(t) + " end to end." });
  }
  const tight = Object.values(byBean)
    .filter((b) => b.loss.length)
    .sort((x, y) => avg(x.loss)! - avg(y.loss)!)[0];
  if (tight)
    insights.push({
      k: "Lowest loss",
      v: tight.name + " gives up the least weight — " + avg(tight.loss)!.toFixed(1) + "% average.",
    });

  const wheelHasData = Object.keys(agg).length > 0;

  return (
    <div>
      <ScreenHeader title="Your journal, read back" onBack={() => set({ screen: "home" })} />

      {/* totals */}
      <div style={{ display: "flex", gap: 8 }}>
        {[
          { l: "Roasts", v: String(R.length) },
          { l: "Green roasted", v: (R.reduce((x, r) => x + (r.greenWeight || 0), 0) / 1000).toFixed(2) + " kg" },
          { l: "Beans", v: String(Object.keys(byBean).length) },
        ].map((t) => (
          <div key={t.l} style={{ flex: 1, background: C.card, border: `1px solid ${C.hair}`, borderRadius: 14, padding: 12 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.1em", color: C.muted, fontWeight: 600 }}>
              {t.l}
            </div>
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, marginTop: 4, whiteSpace: "nowrap" }}>{t.v}</div>
          </div>
        ))}
      </div>

      {/* roasts per month */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.sectionLabel}>Roasts per month</div>
        <div style={{ display: "flex", alignItems: "flex-end", gap: 8, height: 120, marginTop: 14 }}>
          {mo.map((b) => (
            <div
              key={b.label + b.y}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "flex-end",
                height: "100%",
                gap: 5,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 11, fontWeight: 700, color: C.ink }}>{b.n ? b.n : ""}</span>
              <div
                style={{
                  width: "100%",
                  height: (12 + (b.n / moMax) * 88).toFixed(1) + "%",
                  borderRadius: "5px 5px 2px 2px",
                  background: C.olive,
                  opacity: b.n ? 1 : 0.25,
                }}
              />
              <span style={{ fontFamily: MONO, fontSize: 9, color: C.muted, letterSpacing: "0.06em" }}>{b.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* average phase balance */}
      {fr.drying.length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 4 }}>Average phase balance</div>
          <div style={{ fontSize: 12, color: C.muted, marginBottom: 10 }}>Across every roast with milestones logged.</div>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 30 }}>
            {(["drying", "maillard", "development"] as const).map((k) => (
              <div
                key={k}
                style={{
                  width: ((avg(fr[k]) || 0) * 100).toFixed(1) + "%",
                  background: PHASE[k],
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: "#3A2F1A",
                  fontSize: 11,
                  fontWeight: 700,
                  fontFamily: MONO,
                }}
              >
                {Math.round((avg(fr[k]) || 0) * 100) + "%"}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", gap: 14, marginTop: 10, flexWrap: "wrap" }}>
            {(["drying", "maillard", "development"] as const).map((k) => (
              <span key={k} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12, color: C.ink }}>
                <span style={{ width: 9, height: 9, borderRadius: 2, background: PHASE[k] }} />
                {k.charAt(0).toUpperCase() + k.slice(1)}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* roast level spread */}
      {Object.keys(lv).length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 12 }}>Roast level spread</div>
          <div style={{ display: "flex", borderRadius: 8, overflow: "hidden", height: 34 }}>
            {LEVELS.filter((L) => lv[L.name]).map((L) => (
              <div
                key={L.name}
                style={{
                  width: ((lv[L.name] / lvTotal) * 100).toFixed(1) + "%",
                  background: L.c,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  color: L.light ? C.ink : C.cream,
                  fontFamily: MONO,
                  fontSize: 11,
                  fontWeight: 700,
                }}
              >
                {lv[L.name]}
              </div>
            ))}
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "8px 14px", marginTop: 12 }}>
            {LEVELS.filter((L) => lv[L.name]).map((L) => (
              <span key={L.name} style={{ display: "flex", alignItems: "center", gap: 7, fontSize: 12 }}>
                <span style={{ width: 11, height: 11, borderRadius: "50%", background: L.c }} />
                {L.name}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {/* rating distribution */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={{ ...S.sectionLabel, marginBottom: 12 }}>How they scored</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {[5, 4, 3, 2, 1].map((n) => (
            <div key={n} style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <span style={{ width: 66, fontSize: 12, color: C.rust, letterSpacing: 1, flexShrink: 0 }}>
                {"★".repeat(n)}
              </span>
              <div style={{ flex: 1, height: 12, background: C.field, borderRadius: 6, overflow: "hidden" }}>
                <div
                  style={{
                    width: ((rc[n - 1] / rcMax) * 100).toFixed(1) + "%",
                    height: "100%",
                    background: C.rust,
                    opacity: rc[n - 1] ? 1 : 0.2,
                    borderRadius: 6,
                  }}
                />
              </div>
              <span style={{ fontFamily: MONO, fontSize: 12, color: C.muted, width: 18, textAlign: "right" }}>
                {rc[n - 1]}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* averaged palate */}
      {wheelHasData ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 4 }}>Your palate, averaged</div>
          <div style={{ fontSize: 12, color: C.muted }}>Mean intensity per family across all tasted roasts.</div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginTop: 10 }}>
            <StaticWheel flavors={agg} />
            <div style={{ display: "flex", flexDirection: "column", gap: 6, minWidth: 0 }}>
              {aggChips.map((f) => (
                <div
                  key={f.name}
                  style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 }}
                >
                  <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
                    <span style={{ width: 9, height: 9, borderRadius: "50%", background: f.c, flexShrink: 0 }} />
                    {f.name}
                  </span>
                  <span style={{ fontFamily: MONO, fontSize: 12, color: f.c }}>{agg[f.name].toFixed(1)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}

      {/* bean by bean */}
      {Object.keys(byBean).length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 10 }}>Bean by bean</div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 34px 50px 44px",
              paddingBottom: 6,
              borderBottom: `1px solid ${C.hair}`,
              fontSize: 11,
              color: C.muted,
            }}
          >
            <span>Bean</span>
            <span style={{ textAlign: "right" }}>n</span>
            <span style={{ textAlign: "right" }}>loss</span>
            <span style={{ textAlign: "right" }}>avg★</span>
          </div>
          {Object.values(byBean)
            .sort((x, y) => y.n - x.n)
            .map((b) => (
              <div
                key={b.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 34px 50px 44px",
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(183,175,159,0.4)",
                  alignItems: "baseline",
                }}
              >
                <span style={{ fontSize: 13, fontWeight: 600, paddingRight: 6 }}>{b.name}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: C.muted }}>×{b.n}</span>
                <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right" }}>
                  {avg(b.loss) != null ? avg(b.loss)!.toFixed(1) + "%" : "—"}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 12, textAlign: "right", color: C.rust }}>
                  {avg(b.rating) != null ? avg(b.rating)!.toFixed(1) + "★" : "—"}
                </span>
              </div>
            ))}
        </div>
      ) : null}

      {/* insights */}
      {insights.length > 0 ? (
        <div style={{ ...S.card, marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, marginBottom: 10 }}>What the log tells you</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {insights.map((i) => (
              <div key={i.k} style={{ paddingLeft: 12, borderLeft: `2px solid ${C.rust}` }}>
                <div
                  style={{
                    fontFamily: MONO,
                    fontSize: 10,
                    letterSpacing: "0.12em",
                    textTransform: "uppercase",
                    color: C.rust,
                    fontWeight: 700,
                  }}
                >
                  {i.k}
                </div>
                <div style={{ fontSize: 14, lineHeight: 1.45, marginTop: 3 }}>{i.v}</div>
              </div>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}
