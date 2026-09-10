import { useId } from "react";

/**
 * The Jots mark: a clay "j" whose tittle floats free above the stem.
 *
 * A jot is the smallest mark you can make — the word comes from iota — and the
 * dot on the j already is one, so the dot carries its own weight and shadow.
 *
 * `tile` draws the olive ground behind it (the app-icon lockup); without it the
 * mark sits on whatever is behind, taking its colour from `color`.
 */
export function JotsMark({
  size = 40,
  tile = false,
  color = "#F4F1E9",
  ground = "#575618",
  drop = false,
}: {
  size?: number;
  tile?: boolean;
  color?: string;
  ground?: string;
  /** Let the tittle fall onto the stem and bounce once, on mount. */
  drop?: boolean;
}) {
  const uid = useId().replace(/:/g, "");

  return (
    <svg
      viewBox="0 0 128 128"
      width={size}
      height={size}
      style={{ display: "block", flexShrink: 0 }}
      role="img"
      aria-label="Jots"
    >
      <defs>
        <linearGradient id={`clay${uid}`} x1="0" y1="0" x2="0.55" y2="1">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.4" />
          <stop offset="45%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <radialGradient id={`ball${uid}`} cx="34%" cy="28%" r="76%">
          <stop offset="0%" stopColor="#fff" stopOpacity="0.55" />
          <stop offset="55%" stopColor="#fff" stopOpacity="0" />
          <stop offset="100%" stopColor="#000" stopOpacity="0.28" />
        </radialGradient>
      </defs>

      {tile ? <rect width="128" height="128" rx="28" fill={ground} /> : null}

      <g strokeLinecap="round" fill="none">
        <path
          d="M78 52 V78 C78 96 60 103 47 92"
          stroke="#000"
          strokeOpacity="0.2"
          strokeWidth="22"
          transform="translate(0,4)"
        />
        <path d="M78 52 V78 C78 96 60 103 47 92" stroke={color} strokeWidth="22" />
        <path d="M78 52 V78 C78 96 60 103 47 92" stroke={`url(#clay${uid})`} strokeWidth="22" />
      </g>
      <g
        className={drop ? "cjDrop" : undefined}
        style={drop ? { transformOrigin: "78px 27px", transformBox: "fill-box" } : undefined}
      >
        <circle cx="78" cy="27" r="13" fill="#000" opacity="0.2" transform="translate(0,4)" />
        <circle cx="78" cy="27" r="13" fill={color} />
        <circle cx="78" cy="27" r="13" fill={`url(#ball${uid})`} />
      </g>
    </svg>
  );
}
