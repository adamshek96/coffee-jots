import { MONO } from "../lib/constants";
import type { StampSpec } from "../lib/calc";

/** A tilted circular ink stamp — passport entries, teasers, share cards. */
export function Stamp({ s, showDate }: { s: StampSpec; showDate?: boolean }) {
  return (
    <div
      style={{
        width: s.size,
        height: s.size,
        borderRadius: "50%",
        flexShrink: 0,
        border: `2px ${s.bs} ${s.c}`,
        color: s.c,
        background: s.bg,
        opacity: s.op,
        transform: `rotate(${s.rot}deg)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <div
        style={{
          width: "82%",
          height: "82%",
          borderRadius: "50%",
          border: `1px ${s.bs} ${s.c}`,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          textAlign: "center",
          padding: 3,
        }}
      >
        <div style={{ fontSize: Number(s.fsTop), letterSpacing: "0.16em", fontWeight: 700, opacity: 0.85 }}>
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
          <div style={{ fontFamily: MONO, fontSize: Number(s.fsDate), opacity: 0.7 }}>{s.date}</div>
        ) : null}
      </div>
    </div>
  );
}
