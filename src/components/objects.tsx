import { useId } from "react";
import { C, LEVELS } from "../lib/constants";
import { shiftHex } from "../lib/color";

/**
 * Small clay-rendered objects. Pure SVG — no WebGL, no model files, nothing
 * downloaded, so they cost the offline bundle essentially nothing.
 *
 * All of them light from the upper left and sit on a soft contact shadow, so
 * they read as one set rather than a pile of unrelated illustrations.
 */

/** A bean's colour, taken from the roast level it's usually taken to. */
export function levelColor(levelName?: string): string {
  const L = LEVELS.find((x) => x.name === levelName);
  return L ? L.c : "#8E5730";
}

/**
 * A bag of green coffee. Used wherever a bean profile needs a face —
 * the profile list, the editor, empty states.
 */
export function BeanBag({
  size = 96,
  color = "#8E5730",
  label,
}: {
  size?: number;
  color?: string;
  label?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const kraft = "#C9A574";
  const kraftLit = shiftHex(kraft, 34);
  const kraftDark = shiftHex(kraft, -46);

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible", flexShrink: 0, display: "block" }}
      role="img"
      aria-label={label ? `Bag of ${label}` : "Bag of coffee"}
    >
      <defs>
        <linearGradient id={`bag${uid}`} x1="0" y1="0" x2="1" y2="0.6">
          <stop offset="0%" stopColor={kraftLit} />
          <stop offset="48%" stopColor={kraft} />
          <stop offset="100%" stopColor={kraftDark} />
        </linearGradient>
        <linearGradient id={`fold${uid}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={shiftHex(kraft, -18)} />
          <stop offset="100%" stopColor={shiftHex(kraft, -56)} />
        </linearGradient>
        <linearGradient id={`lbl${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor={shiftHex(color, 30)} />
          <stop offset="100%" stopColor={shiftHex(color, -22)} />
        </linearGradient>
        <filter id={`bagShadow${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      {/* contact shadow */}
      <ellipse cx="52" cy="90" rx="30" ry="6" fill="#4A3423" opacity="0.3" filter={`url(#bagShadow${uid})`} />

      {/* body */}
      <path
        d="M26 30 h48 a5 5 0 0 1 5 5 v45 a8 8 0 0 1 -8 8 H29 a8 8 0 0 1 -8 -8 V35 a5 5 0 0 1 5 -5 z"
        fill={`url(#bag${uid})`}
      />
      {/* side gusset crease */}
      <path d="M66 30 v58" stroke={kraftDark} strokeOpacity="0.42" strokeWidth="1.6" fill="none" />
      {/* folded top */}
      <path d="M23 22 h54 a4 4 0 0 1 4 4 v7 a3 3 0 0 1 -3 3 H22 a3 3 0 0 1 -3 -3 v-7 a4 4 0 0 1 4 -4 z"
            fill={`url(#fold${uid})`} />
      {/* crimp ticks along the fold */}
      {[28, 36, 44, 52, 60, 68].map((x) => (
        <path key={x} d={`M${x} 24 v8`} stroke={kraftDark} strokeOpacity="0.5" strokeWidth="1.4" />
      ))}
      {/* label panel, coloured by the bean */}
      <rect x="31" y="45" width="34" height="26" rx="4" fill={`url(#lbl${uid})`} />
      <rect x="35" y="51" width="26" height="2.6" rx="1.3" fill="#FFFFFF" opacity="0.72" />
      <rect x="35" y="57" width="18" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.5" />
      <rect x="35" y="62" width="22" height="2.2" rx="1.1" fill="#FFFFFF" opacity="0.5" />
      {/* highlight down the left edge */}
      <path d="M27 34 v50" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.6" strokeLinecap="round" />
    </svg>
  );
}

/** A single roasted bean, coloured by roast level. Good for inline accents. */
export function SingleBean({ size = 40, color = "#7A4626" }: { size?: number; color?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible", flexShrink: 0, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={`bn${uid}`} cx="34%" cy="28%" r="76%">
          <stop offset="0%" stopColor={shiftHex(color, 52)} />
          <stop offset="55%" stopColor={color} />
          <stop offset="100%" stopColor={shiftHex(color, -40)} />
        </radialGradient>
        <filter id={`bnS${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>
      <ellipse cx="52" cy="82" rx="26" ry="5" fill="#4A3423" opacity="0.3" filter={`url(#bnS${uid})`} />
      <g transform="rotate(-18 50 50)">
        <ellipse cx="50" cy="50" rx="32" ry="24" fill={`url(#bn${uid})`} />
        {/* the crease */}
        <path
          d="M22 50 q14 -11 28 0 q14 11 28 0"
          fill="none"
          stroke={shiftHex(color, -52)}
          strokeWidth="4"
          strokeLinecap="round"
          opacity="0.85"
        />
        <path
          d="M24 47 q14 -11 28 0 q13 10 26 1"
          fill="none"
          stroke="#FFFFFF"
          strokeOpacity="0.22"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </g>
    </svg>
  );
}

/** A mug on a saucer — the empty-state mascot. */
export function Mug({ size = 96 }: { size?: number }) {
  const uid = useId().replace(/:/g, "");
  const cream = "#E8DCC8";
  const brew = C.clayBrew;
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      style={{ overflow: "visible", flexShrink: 0, display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`mug${uid}`} x1="0" y1="0" x2="1" y2="0.3">
          <stop offset="0%" stopColor={shiftHex(cream, 14)} />
          <stop offset="55%" stopColor={cream} />
          <stop offset="100%" stopColor={shiftHex(cream, -44)} />
        </linearGradient>
        <linearGradient id={`sauc${uid}`} x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0%" stopColor="#9CC3DE" />
          <stop offset="100%" stopColor="#5C8CAE" />
        </linearGradient>
        <filter id={`mugS${uid}`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="2.4" />
        </filter>
      </defs>

      <ellipse cx="52" cy="86" rx="34" ry="7" fill="#4A3423" opacity="0.28" filter={`url(#mugS${uid})`} />
      {/* saucer */}
      <ellipse cx="50" cy="80" rx="36" ry="11" fill={`url(#sauc${uid})`} />
      <ellipse cx="50" cy="78" rx="26" ry="7" fill="#4E7C9C" opacity="0.45" />
      {/* handle */}
      <path d="M74 48 a13 13 0 0 1 0 20" fill="none" stroke={shiftHex(cream, -20)} strokeWidth="7" strokeLinecap="round" />
      {/* body */}
      <path d="M26 34 h48 v30 a14 14 0 0 1 -14 14 H40 a14 14 0 0 1 -14 -14 z" fill={`url(#mug${uid})`} />
      {/* brew surface */}
      <ellipse cx="50" cy="35" rx="24" ry="7.5" fill={brew} />
      <ellipse cx="50" cy="35" rx="24" ry="7.5" fill="none" stroke={shiftHex(cream, -30)} strokeWidth="2.4" />
      <ellipse cx="44" cy="33" rx="7" ry="2.4" fill="#FFFFFF" opacity="0.2" />
      {/* left highlight */}
      <path d="M31 40 v26" stroke="#FFFFFF" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
