import type { CSSProperties, ReactNode } from "react";
import { C, GROT, MONO } from "../lib/constants";

// ---- shared style objects, lifted straight from the prototype ----

export const S: Record<string, CSSProperties> = {
  card: {
    background: C.card,
    border: `1px solid ${C.hair}`,
    borderRadius: 16,
    padding: 16,
  },
  sectionLabel: {
    fontSize: 11,
    textTransform: "uppercase",
    letterSpacing: "0.14em",
    color: C.muted,
    fontWeight: 600,
  },
  input: {
    width: "100%",
    fontFamily: "inherit",
    fontSize: 15,
    background: C.field,
    border: `1px solid ${C.hair}`,
    borderRadius: 11,
    padding: "12px 13px",
    color: C.ink,
  },
  fieldLabel: { fontSize: 13, fontWeight: 600, color: C.muted, display: "block", marginBottom: 6 },
  primaryBtn: {
    width: "100%",
    border: "none",
    borderRadius: 14,
    padding: 17,
    fontSize: 16,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    color: C.cream,
    background: C.olive,
  },
  secondaryBtn: {
    border: `1px solid ${C.hair}`,
    background: "transparent",
    borderRadius: 14,
    padding: 16,
    fontSize: 15,
    fontWeight: 600,
    fontFamily: "inherit",
    cursor: "pointer",
    color: C.ink,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    border: `1px solid ${C.hair}`,
    background: C.card,
    color: C.ink,
    fontSize: 17,
    cursor: "pointer",
    flexShrink: 0,
  },
  graphPaper: {
    backgroundColor: C.paperLight,
    backgroundImage:
      "repeating-linear-gradient(0deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 16px)," +
      "repeating-linear-gradient(90deg, rgba(183,175,159,0.4) 0px, rgba(183,175,159,0.4) 0.5px, transparent 0.5px, transparent 16px)",
  },
  mono9: { fontFamily: MONO, fontSize: 9, color: C.faint },
};

export function ScreenHeader({
  title,
  onBack,
  glyph = "←",
  right,
}: {
  title: string;
  onBack: () => void;
  glyph?: string;
  right?: ReactNode;
}) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
      <button onClick={onBack} style={S.backBtn}>
        {glyph}
      </button>
      <h2 style={{ margin: 0, fontSize: 22, fontWeight: 700, letterSpacing: "-0.02em", flex: 1 }}>{title}</h2>
      {right}
    </div>
  );
}

export function Chip({
  label,
  on,
  onClick,
  rust,
  mono,
  style,
}: {
  label: ReactNode;
  on: boolean;
  onClick: () => void;
  rust?: boolean;
  mono?: boolean;
  style?: CSSProperties;
}) {
  const c = rust ? C.rust : C.olive;
  return (
    <button
      onClick={onClick}
      className="pressS"
      style={{
        padding: "8px 13px",
        borderRadius: 999,
        border: `1px solid ${on ? c : C.hair}`,
        background: on ? c : C.field,
        color: on ? C.cream : C.ink,
        fontSize: 13,
        cursor: "pointer",
        fontFamily: mono ? MONO : "inherit",
        ...style,
      }}
    >
      {label}
    </button>
  );
}

export function Toast({ msg }: { msg: string }) {
  if (!msg) return null;
  return (
    <div
      style={{
        position: "fixed",
        left: "50%",
        bottom: "calc(34px + env(safe-area-inset-bottom))",
        transform: "translateX(-50%)",
        background: C.ink,
        color: C.cream,
        fontFamily: MONO,
        fontSize: 12,
        letterSpacing: "0.06em",
        padding: "11px 18px",
        borderRadius: 999,
        zIndex: 99,
        whiteSpace: "nowrap",
      }}
    >
      {msg}
    </div>
  );
}

export const grot = GROT;
