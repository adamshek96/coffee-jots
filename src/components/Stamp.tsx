import { useId } from "react";
import { MONO } from "../lib/constants";
import type { StampSpec } from "../lib/calc";

/**
 * A passport stamp: ink pressed onto the page, not an object sitting on it.
 *
 * The character comes from the impression being imperfect — turbulence roughens
 * the edges and mottles the coverage, so the rings break up the way a rubber
 * stamp does. Seeded from the origin name so each country stamps consistently
 * but no two look identical.
 *
 * Props are unchanged, so Passport, the Home teaser and Share all inherit this.
 */
export function Stamp({ s, showDate }: { s: StampSpec; showDate?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const locked = s.bs === "dashed";

  // Deterministic per-origin variation in how the ink lands.
  const seed = [...s.origin].reduce((a, ch) => a + ch.charCodeAt(0), 0) % 90;

  return (
    <div
      style={{
        width: s.size,
        height: s.size,
        position: "relative",
        flexShrink: 0,
        transform: `rotate(${s.rot}deg)`,
        opacity: locked ? 0.5 : 0.88,
        color: s.c,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
        aria-hidden="true"
      >
        <defs>
          {/* Just enough irregularity to read as pressed, not printed. Kept
              subtle on purpose — heavy displacement shatters the rings. */}
          <filter id={`ink${uid}`} x="-12%" y="-12%" width="124%" height="124%">
            <feTurbulence type="fractalNoise" baseFrequency="0.42" numOctaves="2" seed={seed} result="grain" />
            <feDisplacementMap
              in="SourceGraphic"
              in2="grain"
              scale="1.1"
              xChannelSelector="R"
              yChannelSelector="G"
              result="rough"
            />
            {/* thin the coverage in a few broad patches */}
            <feTurbulence type="fractalNoise" baseFrequency="0.03" numOctaves="3" seed={seed + 11} result="blotch" />
            <feColorMatrix in="blotch" type="luminanceToAlpha" result="blotchA" />
            <feComponentTransfer in="blotchA" result="holes">
              <feFuncA type="discrete" tableValues="1 1 1 1 1 1 0.72 1" />
            </feComponentTransfer>
            <feComposite in="rough" in2="holes" operator="in" />
          </filter>
        </defs>

        {/*
          Earned origins are inked: rough edges, serrated die, patchy coverage.
          Ghosts stay clean — dashes plus displacement just read as scribble, and
          an un-inked outline is the clearer "not stamped yet".
        */}
        {locked ? (
          <g fill="none" stroke="currentColor" strokeDasharray="5 4">
            <circle cx="50" cy="50" r="45" strokeWidth="1.6" />
            <circle cx="50" cy="50" r="34" strokeWidth="1" opacity="0.7" />
          </g>
        ) : (
          <g filter={`url(#ink${uid})`} fill="none" stroke="currentColor">
            <circle cx="50" cy="50" r="47" strokeWidth="1.5" />
            <circle cx="50" cy="50" r="42.5" strokeWidth="3.6" />
            <circle cx="50" cy="50" r="33.5" strokeWidth="1.1" opacity="0.8" />
            {/* serration, the way a stamp die is cut */}
            {Array.from({ length: 24 }, (_, i) => {
              const a = (i / 24) * Math.PI * 2;
              return (
                <line
                  key={i}
                  x1={50 + Math.cos(a) * 45.2}
                  y1={50 + Math.sin(a) * 45.2}
                  x2={50 + Math.cos(a) * 47}
                  y2={50 + Math.sin(a) * 47}
                  strokeWidth="1.4"
                  opacity="0.75"
                />
              );
            })}
          </g>
        )}
      </svg>

      {/* the wording */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: locked ? "20%" : "23%",
          color: "currentColor",
        }}
      >
        <div style={{ fontSize: Number(s.fsTop), letterSpacing: "0.16em", fontWeight: 700, opacity: 0.9 }}>
          {s.top}
        </div>
        <div
          style={{
            fontFamily: MONO,
            fontSize: Number(s.fsName),
            fontWeight: 700,
            lineHeight: 1.05,
            textTransform: "uppercase",
            margin: "1px 0",
          }}
        >
          {s.origin}
        </div>
        <div style={{ fontFamily: MONO, fontSize: Number(s.fsMid), fontWeight: 700 }}>{s.mid}</div>
        {showDate && s.date ? (
          <div style={{ fontFamily: MONO, fontSize: Number(s.fsDate), opacity: 0.8 }}>{s.date}</div>
        ) : null}
      </div>
    </div>
  );
}
