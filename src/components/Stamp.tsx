import { useId } from "react";
import { MONO } from "../lib/constants";
import type { StampSpec } from "../lib/calc";
import { shiftHex } from "../lib/color";

/**
 * A passport stamp, rendered as a pressed wax seal.
 *
 * Same props and same information as the flat version it replaces — every
 * screen that shows a stamp picks this up without changing how it works.
 * Earned origins are raised wax discs catching a top-left light; origins you
 * haven't roasted are debossed outlines, pressed into the page instead.
 */
export function Stamp({ s, showDate }: { s: StampSpec; showDate?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const locked = s.bs === "dashed";

  const base = s.c;
  const lit = shiftHex(base, 46);
  const mid = shiftHex(base, 6);
  const dark = shiftHex(base, -34);
  const deep = shiftHex(base, -58);

  // Text sits on the wax for earned seals, and on the page for ghosts.
  const inkOnWax = shiftHex(base, 118);
  const textColor = locked ? shiftHex(base, 14) : inkOnWax;

  return (
    <div
      style={{
        width: s.size,
        height: s.size,
        position: "relative",
        flexShrink: 0,
        transform: `rotate(${s.rot}deg)`,
        opacity: locked ? 0.75 : 1,
      }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible" }}
        aria-hidden="true"
      >
        <defs>
          {/* key light from the upper left, as in the reference renders */}
          <radialGradient id={`wax${uid}`} cx="34%" cy="28%" r="78%">
            <stop offset="0%" stopColor={lit} />
            <stop offset="52%" stopColor={mid} />
            <stop offset="100%" stopColor={dark} />
          </radialGradient>
          <linearGradient id={`bevel${uid}`} x1="0" y1="0" x2="0.7" y2="1">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
            <stop offset="45%" stopColor="#FFFFFF" stopOpacity="0.05" />
            <stop offset="100%" stopColor={deep} stopOpacity="0.5" />
          </linearGradient>
          <linearGradient id={`press${uid}`} x1="0" y1="0" x2="0.6" y2="1">
            <stop offset="0%" stopColor={deep} stopOpacity="0.42" />
            <stop offset="55%" stopColor="#FFFFFF" stopOpacity="0" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.5" />
          </linearGradient>
          <filter id="softShadow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="2.6" />
          </filter>
        </defs>

        {locked ? (
          <>
            {/* debossed: a shape pressed into the page, no cast shadow */}
            <circle cx="50" cy="50" r="45" fill={base} fillOpacity="0.07" />
            <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#press${uid})`} strokeWidth="3" />
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke={base}
              strokeOpacity="0.5"
              strokeWidth="1.6"
              strokeDasharray="5 4"
            />
            <circle
              cx="50"
              cy="50"
              r="36"
              fill="none"
              stroke={base}
              strokeOpacity="0.34"
              strokeWidth="1"
              strokeDasharray="4 3.5"
            />
          </>
        ) : (
          <>
            {/* contact shadow — the seal is sitting on the page */}
            <ellipse cx="52" cy="93" rx="35" ry="7" fill={deep} opacity="0.34" filter="url(#softShadow)" />

            {/* wax body */}
            <circle cx="50" cy="50" r="46" fill={`url(#wax${uid})`} />
            {/* rim bevel: lit on top-left, shaded bottom-right */}
            <circle cx="50" cy="50" r="45" fill="none" stroke={`url(#bevel${uid})`} strokeWidth="3.4" />
            {/* recessed inner field the text sits in */}
            <circle cx="50" cy="50" r="37" fill={dark} fillOpacity="0.34" />
            <circle cx="50" cy="50" r="37" fill="none" stroke={`url(#press${uid})`} strokeWidth="2" />
            {/* specular sweep */}
            <path
              d="M18 34 A38 38 0 0 1 52 11"
              fill="none"
              stroke="#FFFFFF"
              strokeOpacity="0.42"
              strokeWidth="5"
              strokeLinecap="round"
            />
          </>
        )}
      </svg>

      {/* the stamp's wording, unchanged */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: "14%",
          color: textColor,
          textShadow: locked ? "none" : `0 ${s.size * 0.012}px 0 ${deep}`,
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
            margin: "2px 0",
          }}
        >
          {s.origin}
        </div>
        <div style={{ fontFamily: MONO, fontSize: Number(s.fsMid), fontWeight: 700 }}>{s.mid}</div>
        {showDate && s.date ? (
          <div style={{ fontFamily: MONO, fontSize: Number(s.fsDate), opacity: 0.75 }}>{s.date}</div>
        ) : null}
      </div>
    </div>
  );
}
