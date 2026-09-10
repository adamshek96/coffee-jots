import { useEffect, useReducer, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { DangerAction, S } from "../components/ui";
import { fmt, fmtSigned, ramp } from "../lib/calc";
import { C, MONO, MS, PHASE, SHADES, SOUNDS } from "../lib/constants";
import { keepAwake } from "../lib/wakeLock";
import { useStore } from "../store";
import type { MilestoneKey } from "../types";

const screw = (deg: number): CSSProperties => ({
  position: "absolute",
  width: 9,
  height: 9,
  borderRadius: "50%",
  background: `linear-gradient(${deg}deg, transparent 42%, #6F6757 42%, #6F6757 58%, transparent 58%), radial-gradient(circle at 35% 35%, #E4DDCD, #948B77)`,
});

const machineBtn: CSSProperties = {
  borderRadius: 11,
  border: "1px solid #A79E8C",
  background: "linear-gradient(180deg,#E4DDCD,#D5CDBB)",
  fontFamily: MONO,
  fontWeight: 700,
  cursor: "pointer",
  color: "#3A342B",
  boxShadow: "0 2px 0 rgba(122,113,95,0.55)",
};

export function LiveRoast() {
  const store = useStore();
  const { st, set, tap, patchA, addObservation, undoObservation, discardActive } = store;
  const a = st.active!;
  const [, tick] = useReducer((n: number) => n + 1, 0);
  const [typingWatts, setTypingWatts] = useState(false);
  const [wattDraft, setWattDraft] = useState("");

  /**
   * Which milestone just landed, so only that tile plays the confirmation.
   * Animating every recorded tile would make them all pop together whenever
   * this screen remounts mid-roast.
   */
  const [justLogged, setJustLogged] = useState<MilestoneKey | null>(null);
  const loggedTimer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(loggedTimer.current), []);

  const handleTap = (k: MilestoneKey) => {
    tap(k);
    setJustLogged(k);
    clearTimeout(loggedTimer.current);
    loggedTimer.current = setTimeout(() => setJustLogged(null), 400);
  };

  const running = a.status === "preheating" || a.status === "roasting" || a.status === "cooling";

  useEffect(() => {
    const iv = setInterval(() => {
      if (running) tick();
    }, 250);
    return () => clearInterval(iv);
  }, [running]);

  useEffect(() => keepAwake(), []);

  const now = Date.now();
  const ev = a.events;
  const D = a.device;
  const dropped = a.status === "done";
  const endAt = a.droppedAt || now;

  // Roast time is charge-relative (what FC and development % mean).
  const roastT = a.startedAt ? (endAt - a.startedAt) / 1000 : 0;
  // The clock on screen runs continuously from the moment the machine went on.
  const anchor = a.preheatAt || a.startedAt;
  const totalT = anchor ? (endAt - anchor) / 1000 : 0;

  const cooling = a.status === "cooling";
  const coolLeft = cooling && a.coolStartedAt ? Math.max(0, a.coolDuration - (now - a.coolStartedAt) / 1000) : 0;

  let phase: string | null = null;
  if (a.startedAt && !dropped) {
    phase = ev.extend ? "extended" : ev.fc ? "development" : ev.yellowing ? "maillard" : "drying";
  }

  const G = st.ghostOn && a.ghost ? a.ghost : null;
  const delta = (s: number) => (s >= 0 ? "+" : "−") + fmt(Math.abs(s));
  let paceText = "";
  let paceColor = "#5C5346";
  if (G && !dropped) {
    const nk = MS.find((m) => m.key !== "preheat" && !ev[m.key] && G.events[m.key]);
    if (!a.startedAt) paceText = "Pacing against batch " + G.batch + (G.rating ? " · " + "★".repeat(G.rating) : "");
    else if (nk) {
      const target = G.events[nk.key]!.t;
      const d = roastT - target;
      paceText =
        nk.label.toUpperCase() +
        " target " +
        fmt(target) +
        " · " +
        (Math.abs(d) < 10 ? "on pace" : d > 0 ? delta(d) + " late" : delta(d) + " early");
      paceColor = Math.abs(d) < 10 ? C.oliveDeep : d > 0 ? C.rust : C.olive;
    } else paceText = "Past batch " + G.batch + "'s last marker";
  }

  const isLocked = (k: MilestoneKey): boolean => {
    if (dropped) return true;
    if (k === "preheat") return !!a.startedAt;
    if (k === "charge") return false;
    if (k === "extend") return !ev.fcEnds;
    return !a.startedAt;
  };
  const nextKey = MS.find((m) => !ev[m.key] && !isLocked(m.key))?.key;
  const nx = MS.find((m) => m.key === nextKey);

  const RAMP = ramp(D.heatMax || 1);
  const SP = D.steps || [10, 5];
  const obs = a.observations || [];
  const lastObs = obs[obs.length - 1];

  const commitWatts = () => {
    const v = parseInt(wattDraft.replace(/[^0-9]/g, ""), 10);
    if (!isNaN(v)) patchA({ watts: Math.max(0, v) });
    setTypingWatts(false);
  };

  const readout = C.readout;
  const glow = readout + "80";
  const clockLabel = dropped ? "Done" : cooling ? "Cooling" : a.status === "preheating" ? "Preheat" : a.startedAt ? "Total" : "Ready";

  return (
    <div>
      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
        <button onClick={() => set({ screen: "home" })} style={{ ...S.backBtn, fontSize: 16 }}>
          ✕
        </button>
        <div style={{ minWidth: 0 }}>
          <div style={{ display: "flex", alignItems: "baseline", gap: 7, minWidth: 0 }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.1em",
                color: C.cream,
                background: C.olive,
                borderRadius: 4,
                padding: "2px 5px",
                flexShrink: 0,
              }}
            >
              BATCH {a.batch || 1}
            </span>
            <span
              style={{
                fontSize: 17,
                fontWeight: 700,
                letterSpacing: "-0.02em",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {a.beanName}
            </span>
          </div>
          <div style={{ fontSize: 11, color: C.muted, fontFamily: MONO, marginTop: 1 }}>
            {(a.deviceName || "Popper") +
              " · " +
              a.greenWeight +
              " g green" +
              (a.process ? " · " + a.process.toLowerCase() : "")}
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
        {/* machine panel */}
        <div
          style={{
            flex: 1,
            minWidth: 0,
            position: "relative",
            background: "linear-gradient(180deg, #CFC7B8, #BFB6A5)",
            border: "1px solid #A79E8C",
            borderRadius: 20,
            padding: 14,
            boxShadow: "inset 0 1px 0 rgba(255,255,255,0.45), 0 10px 24px rgba(36,29,22,0.12)",
          }}
        >
          <div style={{ ...screw(45), top: 8, left: 8 }} />
          <div style={{ ...screw(-40), top: 8, right: 8 }} />
          <div style={{ ...screw(80), bottom: 8, left: 8 }} />
          <div style={{ ...screw(10), bottom: 8, right: 8 }} />

          <div
            style={{
              background: C.readoutBg,
              borderRadius: 13,
              boxShadow: "inset 0 2px 10px rgba(0,0,0,0.65)",
              padding: "12px 10px 10px",
              display: "flex",
              alignItems: "stretch",
            }}
          >
            <div style={{ flex: 1.4, textAlign: "center", borderRight: "1px solid #2A2E33", paddingRight: 8 }}>
              <div
                style={{
                  fontFamily: MONO,
                  fontWeight: 700,
                  fontSize: 36,
                  lineHeight: 1,
                  letterSpacing: "0.03em",
                  color: readout,
                  textShadow: `0 0 12px ${glow}`,
                }}
              >
                {fmt(totalT)}
              </div>
              <div
                style={{
                  fontSize: 9,
                  letterSpacing: "0.24em",
                  color: "#5F6B74",
                  textTransform: "uppercase",
                  marginTop: 6,
                  animation: a.status === "preheating" || cooling ? "cjBlink 1.4s infinite" : "none",
                }}
              >
                {clockLabel}
              </div>
            </div>
            {/* watts — tap the number to type an exact reading */}
            <div style={{ flex: 1, textAlign: "center", paddingLeft: 8 }}>
              {typingWatts ? (
                <input
                  autoFocus
                  value={wattDraft}
                  onChange={(e) => setWattDraft(e.target.value.replace(/[^0-9]/g, "").slice(0, 5))}
                  onBlur={commitWatts}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") commitWatts();
                    if (e.key === "Escape") setTypingWatts(false);
                  }}
                  inputMode="numeric"
                  style={{
                    width: "100%",
                    background: "rgba(143,180,214,0.12)",
                    border: `1px solid ${readout}`,
                    borderRadius: 8,
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 32,
                    lineHeight: 1,
                    textAlign: "center",
                    color: readout,
                    padding: "2px 0",
                    outline: "none",
                  }}
                />
              ) : (
                <button
                  onClick={() => {
                    setWattDraft(String(a.watts));
                    setTypingWatts(true);
                  }}
                  style={{
                    background: "none",
                    border: "none",
                    padding: 0,
                    cursor: "pointer",
                    fontFamily: MONO,
                    fontWeight: 700,
                    fontSize: 36,
                    lineHeight: 1,
                    color: readout,
                    textShadow: `0 0 12px ${glow}`,
                    width: "100%",
                  }}
                >
                  {a.watts}
                </button>
              )}
              <div
                style={{ fontSize: 9, letterSpacing: "0.24em", color: "#5F6B74", textTransform: "uppercase", marginTop: 6 }}
              >
                {typingWatts ? "enter to set" : D.label + " " + D.unit + " ·  tap"}
              </div>
            </div>
          </div>

          {/* roast time (charge-relative) — what FC and development % refer to */}
          {a.startedAt ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                margin: "8px 2px 0",
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.06em",
                color: "#5C5346",
              }}
            >
              <span>ROAST {fmt(roastT)}</span>
              {a.preheatSec ? <span>PREHEAT {fmt(a.preheatSec)}</span> : null}
            </div>
          ) : null}

          {paceText ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 8,
                margin: "8px 2px 0",
                padding: "7px 9px",
                borderRadius: 9,
                background: "rgba(239,235,226,0.55)",
                border: `1px solid ${C.hair}`,
              }}
            >
              <span style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.06em", color: paceColor, fontWeight: 700 }}>
                {paceText}
              </span>
              <button
                onClick={() => set({ ghostOn: !st.ghostOn })}
                style={{
                  flexShrink: 0,
                  fontFamily: MONO,
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  border: "1px solid #A79E8C",
                  borderRadius: 999,
                  padding: "3px 7px",
                  background: G ? C.olive : "transparent",
                  color: G ? C.cream : C.muted,
                  cursor: "pointer",
                }}
              >
                {a.ghost ? "GHOST B" + a.ghost.batch : ""}
              </button>
            </div>
          ) : null}

          <div style={{ display: "flex", alignItems: "center", gap: 5, margin: "12px 2px 0" }}>
            {(["drying", "maillard", "development", "extended"] as const).map((p) => (
              <div
                key={p}
                style={{ flex: 1, height: 5, borderRadius: 3, background: PHASE[p], opacity: phase === p ? 1 : 0.22 }}
              />
            ))}
            <div
              style={{
                fontFamily: MONO,
                fontSize: 9,
                letterSpacing: "0.12em",
                color: "#5C5346",
                marginLeft: 5,
                whiteSpace: "nowrap",
              }}
            >
              {dropped ? "DONE" : cooling ? "COOLING" : a.status === "preheating" ? "PREHEAT" : phase ? phase.toUpperCase() : "STANDBY"}
            </div>
          </div>

          {!dropped ? (
            <>
              {D.heatMax > 0 ? (
                <>
                  <div
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", margin: "16px 2px 7px" }}
                  >
                    <span
                      style={{
                        fontSize: 10,
                        textTransform: "uppercase",
                        letterSpacing: "0.16em",
                        color: "#5C5346",
                        fontWeight: 700,
                      }}
                    >
                      Heat dial
                    </span>
                    <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, color: "#3A342B" }}>
                      {a.dial} / {D.heatMax}
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button
                      onClick={() => patchA({ dial: Math.max(1, a.dial - 1) })}
                      className="pressS"
                      style={{ ...machineBtn, width: 44, height: 44, fontSize: 18, flexShrink: 0 }}
                    >
                      −
                    </button>
                    <div style={{ flex: 1, display: "flex", gap: 4 }}>
                      {RAMP.map((c, i) => (
                        <div
                          key={i}
                          style={{
                            flex: 1,
                            height: 22,
                            borderRadius: 5,
                            border: "1px solid #A79E8C",
                            background: i < a.dial ? c : "#DED7C8",
                          }}
                        />
                      ))}
                    </div>
                    <button
                      onClick={() => patchA({ dial: Math.min(D.heatMax, a.dial + 1) })}
                      className="pressS"
                      style={{ ...machineBtn, width: 44, height: 44, fontSize: 18, flexShrink: 0 }}
                    >
                      +
                    </button>
                  </div>
                </>
              ) : null}

              {D.fanOpts ? (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#5C5346",
                      fontWeight: 700,
                      margin: "16px 2px 7px",
                    }}
                  >
                    Fan
                  </div>
                  <div style={{ display: "flex", gap: 7 }}>
                    {D.fanOpts.map((f) => (
                      <button
                        key={f}
                        onClick={() => patchA({ fan: f })}
                        className="pressS"
                        style={{
                          ...machineBtn,
                          flex: 1,
                          height: 44,
                          fontSize: 12,
                          letterSpacing: "0.1em",
                          boxShadow: "0 2px 0 rgba(122,113,95,0.45)",
                          ...(a.fan === f ? { background: C.olive, color: C.cream, border: "1px solid #41400F" } : {}),
                        }}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </>
              ) : null}

              <div
                style={{
                  fontSize: 10,
                  textTransform: "uppercase",
                  letterSpacing: "0.16em",
                  color: "#5C5346",
                  fontWeight: 700,
                  margin: "16px 2px 7px",
                }}
              >
                {D.axis === "watts" ? "Watt meter" : "Bean probe · " + D.unit}
              </div>
              <div style={{ display: "flex", gap: 7 }}>
                {[-SP[0], -SP[1], SP[1], SP[0]].map((d) => (
                  <button
                    key={d}
                    onClick={() => patchA({ watts: Math.max(0, a.watts + d) })}
                    className="pressS"
                    style={{ ...machineBtn, flex: 1, height: 44, fontSize: 13 }}
                  >
                    {(d > 0 ? "+" : "−") + Math.abs(d)}
                  </button>
                ))}
              </div>

              {/* cooling countdown appears only once Cooling has been tapped */}
              {cooling ? (
                <>
                  <div
                    style={{
                      fontSize: 10,
                      textTransform: "uppercase",
                      letterSpacing: "0.16em",
                      color: "#5C5346",
                      fontWeight: 700,
                      margin: "16px 2px 7px",
                    }}
                  >
                    Cooling timer · {fmt(coolLeft)} left
                  </div>
                  <div style={{ display: "flex", gap: 7, alignItems: "center" }}>
                    <button
                      onClick={() => patchA({ coolDuration: Math.max(30, a.coolDuration - 30) })}
                      className="pressS"
                      style={{ ...machineBtn, flex: 1, height: 44, fontSize: 13 }}
                    >
                      −30s
                    </button>
                    <div style={{ flex: 1.2, textAlign: "center", fontFamily: MONO, fontWeight: 700, fontSize: 20, color: "#3A342B" }}>
                      {fmt(a.coolDuration)}
                    </div>
                    <button
                      onClick={() => patchA({ coolDuration: a.coolDuration + 30 })}
                      className="pressS"
                      style={{ ...machineBtn, flex: 1, height: 44, fontSize: 13 }}
                    >
                      +30s
                    </button>
                  </div>
                </>
              ) : null}
            </>
          ) : null}
        </div>

        {/* milestone rail */}
        <div style={{ width: 112, flexShrink: 0, display: "flex", flexDirection: "column", gap: 7 }}>
          {MS.map((m) => {
            const e = ev[m.key];
            const locked = isLocked(m.key);
            const isNext = m.key === nextKey;
            const gt = G && G.events[m.key] ? G.events[m.key]!.t : null;
            let sub = "";
            if (e && gt != null && m.key !== "charge" && m.key !== "preheat") sub = delta(e.t - gt);
            else if (!e && gt != null && m.key !== "charge" && m.key !== "preheat") sub = "@" + fmt(gt);
            return (
              <button
                key={m.key}
                onClick={() => handleTap(m.key)}
                disabled={locked || !!e}
                className="pressS"
                style={{
                  flex: 1,
                  width: "100%",
                  minHeight: 48,
                  textAlign: "left",
                  borderRadius: 12,
                  border: `1.5px solid ${e ? "#B7C08C" : isNext ? C.rust : C.hair}`,
                  background: e ? "#E3E7D0" : C.field,
                  padding: "7px 9px",
                  cursor: locked || e ? "default" : "pointer",
                  fontFamily: "inherit",
                  opacity: locked ? 0.4 : 1,
                  animation: isNext
                    ? "cjPulse 1.8s infinite"
                    : justLogged === m.key
                      ? "cjLogged 240ms cubic-bezier(0.34, 1.4, 0.5, 1)"
                      : "none",
                  display: "block",
                }}
              >
                <span
                  style={{
                    display: "block",
                    fontSize: 9,
                    textTransform: "uppercase",
                    letterSpacing: "0.11em",
                    color: C.muted,
                    fontWeight: 700,
                  }}
                >
                  {m.label}
                </span>
                <span style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 4, marginTop: 2 }}>
                  <span
                    style={{
                      fontFamily: MONO,
                      fontWeight: 700,
                      fontSize: 14,
                      color: e ? C.oliveDeep : isNext ? C.rust : C.muted,
                    }}
                  >
                    {e ? fmtSigned(e.t) : isNext ? "TAP" : "—"}
                  </span>
                  {sub ? (
                    <span
                      style={{
                        fontFamily: MONO,
                        fontSize: 9,
                        color: e && gt != null ? (e.t - gt > 10 ? C.rust : C.olive) : C.muted,
                      }}
                    >
                      {sub}
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* always-on observations — log colour and sound whenever you see/hear it */}
      {a.startedAt && !dropped ? (
        <div style={{ ...S.card, border: `1.5px solid ${C.rust}`, padding: 14, marginTop: 12 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", gap: 8 }}>
            <span
              style={{
                fontFamily: MONO,
                fontSize: 11,
                letterSpacing: "0.08em",
                color: C.rust,
                fontWeight: 700,
                textTransform: "uppercase",
              }}
            >
              What you see &amp; hear
            </span>
            <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted }}>
              {obs.length ? obs.length + " logged" : "tap any time"}
            </span>
          </div>

          <div style={{ display: "flex", gap: 7, marginTop: 9 }}>
            {SHADES.map((s, i) => {
              const on = lastObs?.shade === i;
              return (
                <button
                  key={s.name}
                  onClick={() => addObservation({ shade: i })}
                  className="pressS"
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 5,
                    border: "none",
                    background: "none",
                    cursor: "pointer",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      width: "100%",
                      height: 34,
                      borderRadius: 9,
                      background: s.c,
                      boxShadow: `inset 0 0 0 ${on ? 3 : 1}px ${on ? C.ink : "rgba(36,29,22,0.2)"}`,
                    }}
                  />
                  <span style={{ fontFamily: MONO, fontSize: 8, letterSpacing: "0.06em", color: C.muted, textTransform: "uppercase" }}>
                    {s.name}
                  </span>
                </button>
              );
            })}
          </div>

          <div style={{ display: "flex", flexWrap: "wrap", gap: 7, marginTop: 10 }}>
            {SOUNDS.map((snd) => {
              const on = lastObs?.sound === snd;
              return (
                <button
                  key={snd}
                  onClick={() => addObservation({ sound: snd })}
                  className="pressS"
                  style={{
                    padding: "8px 13px",
                    borderRadius: 999,
                    border: `1px solid ${on ? C.olive : C.hair}`,
                    background: on ? C.olive : C.field,
                    color: on ? C.cream : C.ink,
                    fontSize: 13,
                    cursor: "pointer",
                    fontFamily: "inherit",
                  }}
                >
                  {snd}
                </button>
              );
            })}
          </div>

          {obs.length ? (
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, marginTop: 10 }}>
              <span style={{ fontFamily: MONO, fontSize: 10, color: C.muted, minWidth: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {obs
                  .slice(-3)
                  .map(
                    (o) =>
                      fmtSigned(o.t) +
                      " " +
                      [o.shade != null ? SHADES[o.shade].name : null, o.sound].filter(Boolean).join("/"),
                  )
                  .join("  ·  ")}
              </span>
              <button
                onClick={undoObservation}
                style={{
                  flexShrink: 0,
                  border: "none",
                  background: "none",
                  color: C.muted,
                  fontSize: 11,
                  textDecoration: "underline",
                  cursor: "pointer",
                  fontFamily: "inherit",
                  padding: 2,
                }}
              >
                undo
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {dropped ? (
        <button
          onClick={() =>
            set({ screen: "post", postWeight: "", postLevel: "", postEven: 0, postNotes: "", postRating: 0 })
          }
          className="pressY"
          style={{ ...S.primaryBtn, background: C.rust, marginTop: 14 }}
        >
          Record the roast →
        </button>
      ) : (
        <div style={{ fontSize: 12, color: C.muted, marginTop: 12, textAlign: "center" }}>
          {!a.startedAt && a.status !== "preheating"
            ? "Set your heat and fan, then tap PREHEAT when you switch the machine on — or go straight to CHARGE."
            : a.status === "preheating"
              ? "Warming up. Tap CHARGE when the beans go in."
              : nx
                ? "Next — " + nx.label + ": " + nx.hint
                : ""}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <DangerAction
          label="Discard this roast"
          message="Discard this roast? Nothing will be saved to the journal."
          confirmLabel="Discard"
          onConfirm={discardActive}
        />
      </div>
    </div>
  );
}
