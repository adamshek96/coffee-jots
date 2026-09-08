import { C, MONO } from "../lib/constants";
import { wheelGeom } from "../lib/calc";

/** Tappable radar wheel — each family cycles 0→5. Used wherever flavour is set. */
export function EditableWheel({
  flavors,
  onChange,
  cardBg = C.card,
}: {
  flavors: Record<string, number>;
  onChange: (next: Record<string, number>) => void;
  cardBg?: string;
}) {
  const wheel = wheelGeom(flavors);

  const cycle = (name: string) => {
    const nf = { ...flavors };
    const nv = ((nf[name] || 0) + 1) % 6;
    if (nv) nf[name] = nv;
    else delete nf[name];
    onChange(nf);
  };

  return (
    <>
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
              <circle key={i} cx={d.x} cy={d.y} r={3.4} style={{ fill: d.c, stroke: cardBg, strokeWidth: 1.4 }} />
            ))}
        </svg>
        {wheel.labels.map((w) => (
          <button
            key={w.name}
            onClick={() => cycle(w.name)}
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
    </>
  );
}

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
