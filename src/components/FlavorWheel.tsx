import { C, MONO } from "../lib/constants";
import { wheelGeom } from "../lib/calc";

/**
 * Static radar wheel (Roast detail + Analytics).
 * `dotStroke` matches the card background behind the vertex dots.
 */
export function StaticWheel({ flavors, dotStroke = C.card }: { flavors: Record<string, number>; dotStroke?: string }) {
  const w = wheelGeom(flavors);
  return (
    <div style={{ position: "relative", width: 150, height: 150, flexShrink: 0 }}>
      <svg viewBox="0 0 200 200" style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}>
        {w.rings.map((g, i) => (
          <polygon key={i} points={g.pts} style={{ fill: "none", stroke: C.hair, strokeWidth: 1 }} />
        ))}
        {w.spokes.map((s, i) => (
          <line key={i} x1={100} y1={100} x2={s.x} y2={s.y} style={{ stroke: C.hair, strokeWidth: 1 }} />
        ))}
        <polygon
          points={w.poly}
          style={{ fill: "rgba(169,97,58,0.18)", stroke: C.rust, strokeWidth: 2.5, strokeLinejoin: "round" }}
        />
        {w.vertexDots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={d.r} style={{ fill: d.c, stroke: dotStroke, strokeWidth: 1.4 }} />
        ))}
        {w.tips.map((t, i) => (
          <text
            key={i}
            x={t.x}
            y={t.y}
            style={{
              fill: t.c,
              opacity: t.op,
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              textAnchor: "middle",
            }}
          >
            {t.t}
          </text>
        ))}
      </svg>
    </div>
  );
}

/** Chip list next to a static wheel: colored dot, family name, ●●● intensity. */
export function WheelChips({ flavors }: { flavors: Record<string, number> }) {
  const w = wheelGeom(flavors);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 5, minWidth: 0 }}>
      {w.chips.map((f) => (
        <div
          key={f.name}
          style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, fontSize: 13 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ width: 9, height: 9, borderRadius: "50%", background: f.c, flexShrink: 0 }} />
            {f.name}
          </span>
          <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: 1, color: f.c }}>{f.dots}</span>
        </div>
      ))}
    </div>
  );
}
