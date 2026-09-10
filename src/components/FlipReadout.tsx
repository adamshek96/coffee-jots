import { MONO } from "../lib/constants";

/**
 * A split-flap readout: dark ink on amber cards, with the seam across the
 * middle. Replaces the glowing blue-on-navy panel, which read as a modern
 * appliance rather than an instrument — and dark-on-amber holds up far better
 * in a bright kitchen than backlit digits do.
 *
 * Still digital, not a dial: the numbers stay exact.
 */

export const FLIP = {
  bezel: "#2E251B",
  cardTop: "#EBD3A8",
  cardBot: "#D3B183",
  seam: "rgba(43,35,26,0.30)",
  ink: "#2B231A",
  label: "#A8927A",
};

function Card({ ch, size }: { ch: string; size: number }) {
  return (
    <span
      style={{
        position: "relative",
        display: "inline-block",
        background: `linear-gradient(180deg, ${FLIP.cardTop} 0%, ${FLIP.cardTop} 49.4%, ${FLIP.cardBot} 50.6%, ${FLIP.cardBot} 100%)`,
        color: FLIP.ink,
        fontFamily: MONO,
        fontWeight: 700,
        fontSize: size,
        lineHeight: 1.06,
        borderRadius: Math.round(size * 0.16),
        // tight: the bezel has to hold 4 digits plus a colon at 375px wide
        padding: `${Math.round(size * 0.1)}px ${Math.round(size * 0.09)}px`,
        boxShadow:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -1px 0 rgba(0,0,0,0.22), 0 1px 2px rgba(0,0,0,0.28)",
        textAlign: "center",
        minWidth: size * 0.62,
      }}
    >
      {ch}
      {/* the flap seam */}
      <span
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          top: "50%",
          height: 1,
          background: FLIP.seam,
        }}
      />
    </span>
  );
}

/** Renders a value as flip cards; ":" and "." pass through as separators. */
export function FlipReadout({ value, size = 34 }: { value: string; size?: number }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "stretch", justifyContent: "center", maxWidth: "100%", gap: Math.max(2, Math.round(size * 0.07)) }}>
      {[...value].map((ch, i) =>
        ch === ":" || ch === "." ? (
          <span
            key={i}
            style={{
              fontFamily: MONO,
              fontWeight: 700,
              fontSize: size,
              lineHeight: 1.3,
              color: FLIP.cardTop,
              alignSelf: "center",
            }}
          >
            {ch}
          </span>
        ) : (
          <Card key={i} ch={ch} size={size} />
        ),
      )}
    </span>
  );
}
