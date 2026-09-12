import { useEffect, useState } from "react";
import { fmt, fmtSigned, heatChangeDir, heatChangeLabel } from "../lib/calc";
import { C, MONO, MS, OPTIONAL_MS, SHADES } from "../lib/constants";
import type { EventMap, Ghost, MilestoneKey } from "../types";

/**
 * The milestone log, pulled up over the live roast as a sheet.
 *
 * Mid-roast the rail only has room for a time per milestone; this is where the
 * rest of the record lives — what the dial and meter read at each tap, and, when
 * you're following a batch, what that batch did at the same point. It slides
 * away again because it's a reference, not a control: nothing here is tappable
 * while beans are in the machine.
 */
export function MilestoneSheet({
  ev,
  ghost,
  unit,
  heatMax,
  roastT,
  totalT,
  started,
  nextKey,
  onClose,
}: {
  ev: EventMap;
  ghost: Ghost | null;
  unit: string;
  heatMax: number;
  roastT: number;
  totalT: number;
  started: boolean;
  nextKey?: MilestoneKey;
  onClose: () => void;
}) {
  // Leaving needs its own state: the sheet has to finish sliding down before it
  // unmounts, and an exit animation can't run on an element that's already gone.
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setClosing(true);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!closing) return;
    const t = setTimeout(onClose, 240);
    return () => clearTimeout(t);
  }, [closing, onClose]);

  const settings = (e: { dial?: number; watts: number }) =>
    [heatMax > 0 && e.dial != null ? "d" + e.dial : null, e.watts + unit].filter(Boolean).join(" ");

  // An optional milestone that neither you nor the batch you're following has
  // touched is noise — drop it rather than print a row of dashes.
  const rows = MS.filter((m) => ev[m.key] || ghost?.events[m.key] || !OPTIONAL_MS.includes(m.key));

  const cols = ghost ? "1fr 68px 68px 46px" : "1fr 58px 38px 58px";
  const head = ghost ? ["Event", "You", "B" + ghost.batch, "Δ"] : ["Event", "Time", "Dial", unit];

  return (
    <div
      style={{ position: "fixed", inset: 0, zIndex: 80, display: "flex", alignItems: "flex-end" }}
      role="dialog"
      aria-modal="true"
      aria-label="Milestone log"
    >
      <div
        onClick={() => setClosing(true)}
        style={{
          position: "absolute",
          inset: 0,
          background: "rgba(36,29,22,0.44)",
          animation: `${closing ? "cjFadeOut" : "cjFadeIn"} 240ms ease both`,
        }}
      />
      <div
        style={{
          position: "relative",
          width: "100%",
          maxWidth: 430,
          margin: "0 auto",
          maxHeight: "80dvh",
          display: "flex",
          flexDirection: "column",
          background: C.card,
          borderTopLeftRadius: 22,
          borderTopRightRadius: 22,
          border: `1px solid ${C.hair}`,
          borderBottom: "none",
          boxShadow: "0 -14px 40px rgba(36,29,22,0.22)",
          animation: `${closing ? "cjSheetDown" : "cjSheetUp"} 300ms cubic-bezier(0.22, 0.61, 0.36, 1) both`,
        }}
      >
        <button
          onClick={() => setClosing(true)}
          aria-label="Close milestone log"
          style={{
            border: "none",
            background: "none",
            padding: "10px 0 6px",
            cursor: "pointer",
            display: "flex",
            justifyContent: "center",
          }}
        >
          <span style={{ width: 42, height: 5, borderRadius: 3, background: C.hair, display: "block" }} />
        </button>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
            padding: "0 16px 10px",
            borderBottom: `1px solid ${C.hair}`,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 17, fontWeight: 700, letterSpacing: "-0.02em" }}>Milestone log</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.muted, marginTop: 2 }}>
              {started ? "ROAST " + fmt(roastT) : "TOTAL " + fmt(totalT)}
              {started && totalT > roastT ? " · TOTAL " + fmt(totalT) : ""}
              {ghost ? " · following B" + ghost.batch : ""}
            </div>
          </div>
          <button
            onClick={() => setClosing(true)}
            className="pressS"
            style={{
              flexShrink: 0,
              width: 38,
              height: 38,
              borderRadius: 12,
              border: `1px solid ${C.hair}`,
              background: C.field,
              color: C.ink,
              fontSize: 15,
              cursor: "pointer",
            }}
          >
            ✕
          </button>
        </div>

        <div className="noScrollbar" style={{ overflowY: "auto", padding: "0 16px calc(18px + env(safe-area-inset-bottom))" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: cols,
              columnGap: 8,
              position: "sticky",
              top: 0,
              background: C.card,
              padding: "10px 0 6px",
              borderBottom: `1px solid ${C.hair}`,
              fontSize: 11,
              color: C.muted,
            }}
          >
            {head.map((h, i) => (
              <span key={h} style={i ? { textAlign: "right" } : undefined}>
                {h}
              </span>
            ))}
          </div>

          {rows.map((m) => {
            const e = ev[m.key];
            const g = ghost?.events[m.key];
            const isNext = m.key === nextKey && !e;
            // Which way the heat went, yours and the batch you're chasing. The
            // row already carries the reading it landed on; this is the part
            // you can't get from a number on its own.
            const myDir = m.key === "extend" && e ? heatChangeDir(ev) : null;
            const gDir = m.key === "extend" && g && ghost ? heatChangeDir(ghost.events) : null;
            // Charge is 0 by definition and preheat length is a habit, not a
            // target — a delta on either says nothing about how the roast ran.
            const paced = m.key !== "preheat" && m.key !== "charge";
            const d = e && g && paced ? e.t - g.t : null;
            return (
              <div
                key={m.key}
                style={{
                  display: "grid",
                  gridTemplateColumns: cols,
                  columnGap: 8,
                  padding: "8px 0",
                  borderBottom: "1px solid rgba(183,175,159,0.4)",
                  alignItems: "baseline",
                  opacity: e || isNext ? 1 : 0.5,
                }}
              >
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                    {e?.shade != null ? (
                      <span
                        style={{
                          width: 9,
                          height: 9,
                          borderRadius: "50%",
                          background: SHADES[e.shade].c,
                          flexShrink: 0,
                          boxShadow: "inset 0 0 0 1px rgba(36,29,22,0.25)",
                        }}
                      />
                    ) : null}
                    <span style={{ fontSize: 13.5, fontWeight: 600 }}>{m.label}</span>
                  </span>
                  {myDir != null ? (
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, color: C.muted, marginTop: 1 }}>
                      {heatChangeLabel(myDir)}
                    </span>
                  ) : null}
                </span>

                <span style={{ textAlign: "right" }}>
                  <span
                    style={{
                      display: "block",
                      fontFamily: MONO,
                      fontSize: 13,
                      fontWeight: 700,
                      color: e ? C.ink : isNext ? C.rust : C.muted,
                    }}
                  >
                    {e ? fmtSigned(e.t) : isNext ? "NOW" : "—"}
                  </span>
                  {/* Without a batch to compare against, dial and meter get
                      columns of their own — no need to say it twice. */}
                  {e && ghost ? (
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, color: C.muted, marginTop: 1 }}>
                      {settings(e)}
                    </span>
                  ) : null}
                </span>

                {ghost ? (
                  <span style={{ textAlign: "right" }}>
                    <span style={{ display: "block", fontFamily: MONO, fontSize: 13, color: g ? C.ink : C.muted }}>
                      {g ? fmtSigned(g.t) : "—"}
                    </span>
                    {g ? (
                      <span style={{ display: "block", fontFamily: MONO, fontSize: 9.5, color: C.muted, marginTop: 1 }}>
                        {(gDir != null ? (gDir < 0 ? "↓" : gDir > 0 ? "↑" : "·") + " " : "") + settings(g)}
                      </span>
                    ) : null}
                  </span>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: 13, textAlign: "right" }}>
                    {e?.dial != null ? String(e.dial) : "—"}
                  </span>
                )}

                {ghost ? (
                  <span
                    style={{
                      fontFamily: MONO,
                      fontSize: 11,
                      textAlign: "right",
                      fontWeight: 700,
                      color: d == null ? C.muted : d > 10 ? C.rust : C.olive,
                    }}
                  >
                    {d == null ? "" : (d >= 0 ? "+" : "−") + fmt(Math.abs(d))}
                  </span>
                ) : (
                  <span style={{ fontFamily: MONO, fontSize: 13, textAlign: "right" }}>
                    {e ? e.watts + unit : "—"}
                  </span>
                )}
              </div>
            );
          })}

          {ghost ? (
            <div style={{ fontSize: 11.5, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              Δ is you against B{ghost.batch} — rust means more than ten seconds later than that batch.
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
