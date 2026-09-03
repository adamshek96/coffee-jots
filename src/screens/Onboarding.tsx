import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { S } from "../components/ui";
import { C, MONO } from "../lib/constants";
import { passkeyAvailable } from "../lib/lock";
import { scanner } from "../lib/scan";
import type { BagScan, MachineScan } from "../lib/scan";
import { saveBean } from "../db";
import { useStore } from "../store";

const LAST = 4;

const scanFrame: CSSProperties = {
  position: "relative",
  borderRadius: 18,
  overflow: "hidden",
  background: C.readoutBg,
  boxShadow: "inset 0 2px 14px rgba(0,0,0,0.7)",
};

const corner = (pos: CSSProperties, radius: string): CSSProperties => ({
  position: "absolute",
  width: 24,
  height: 24,
  borderColor: C.readout,
  borderStyle: "solid",
  borderWidth: 0,
  borderRadius: radius,
  ...pos,
});

function ScanLine() {
  return (
    <div
      style={{
        position: "absolute",
        left: "6%",
        right: "6%",
        height: 2,
        background: C.readout,
        boxShadow: `0 0 14px ${C.readout}`,
        animation: "cjScan 1s ease-in-out infinite alternate",
      }}
    />
  );
}

export function Onboarding() {
  const store = useStore();
  const { st, set, finishOnboarding } = store;
  const step = st.obStep;
  const [machine, setMachine] = useState<MachineScan | null>(null);
  const [bag, setBag] = useState<BagScan | null>(null);
  const alive = useRef(true);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const go = (n: number) => set({ obStep: Math.max(0, Math.min(LAST, n)) });
  const next = () => go(step + 1);

  // ---- lock setup (step 1) ----
  // Generated in an effect (never during render) and held locally from the
  // generator's own return value, so what's displayed is exactly what's stored
  // — the user writes this code down, so the two must never diverge.
  const [backupCode, setBackupCode] = useState("…");
  useEffect(() => {
    setBackupCode(store.ensureBackupCode());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const [obCode, setObCode] = useState("");
  const [lockBusy, setLockBusy] = useState(false);
  const [lockNote, setLockNote] = useState("");
  const [canPasskey, setCanPasskey] = useState(false);

  useEffect(() => {
    void passkeyAvailable().then(setCanPasskey);
  }, []);

  /** Turn the chosen lock on for real, then continue. */
  const applyLock = async () => {
    setLockNote("");
    if (st.obLock === "faceid") {
      if (!canPasskey) {
        setLockNote("No Face ID here — pick a passcode or No lock.");
        return;
      }
      setLockBusy(true);
      const ok = await store.enablePasskeyLock();
      setLockBusy(false);
      if (!ok) {
        setLockNote("Face ID setup was cancelled.");
        return;
      }
    } else if (st.obLock === "passcode") {
      if (!/^\d{4,8}$/.test(obCode)) {
        setLockNote("Enter a 4–8 digit passcode first.");
        return;
      }
      setLockBusy(true);
      await store.enablePasscodeLock(obCode);
      setLockBusy(false);
    } else {
      store.disableLock();
    }
    next();
  };

  const scanMachine = () => {
    set({ obScan: { ...st.obScan, device: "busy" } });
    void scanner.scanMachine().then((m) => {
      if (!alive.current) return;
      setMachine(m);
      set({ obScan: { ...store.st.obScan, device: "done" } });
    });
  };
  const scanBag = () => {
    set({ obScan: { ...st.obScan, bag: "busy" } });
    void scanner.scanBag().then((b) => {
      if (!alive.current) return;
      setBag(b);
      set({ obScan: { ...store.st.obScan, bag: "done" } });
    });
  };

  // save the scanned bean as a profile when the user confirms it
  const saveScannedBean = () => {
    if (bag && !st.beans.some((b) => b.name === bag.bean.name)) {
      const bean = { id: "b" + Date.now(), ...bag.bean };
      set({ beans: [bean, ...st.beans] });
      void saveBean(bean);
    }
    next();
  };

  const dS = st.obScan.device;
  const bS = st.obScan.bag;

  return (
    <div style={{ minHeight: "78vh", display: "flex", flexDirection: "column" }}>
      {/* progress header */}
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
        {step > 0 ? (
          <button
            onClick={() => go(step - 1)}
            style={{
              width: 34,
              height: 34,
              borderRadius: 10,
              border: `1px solid ${C.hair}`,
              background: C.card,
              color: C.ink,
              fontSize: 15,
              cursor: "pointer",
              flexShrink: 0,
            }}
          >
            ←
          </button>
        ) : null}
        <div style={{ display: "flex", gap: 5, alignItems: "center", flex: 1 }}>
          {[0, 1, 2, 3, 4].map((i) => (
            <span
              key={i}
              style={{
                height: 6,
                width: i === step ? 20 : 6,
                borderRadius: 3,
                background: i <= step ? C.olive : C.hair,
                opacity: i <= step ? 1 : 0.5,
              }}
            />
          ))}
        </div>
        <button
          onClick={() => finishOnboarding()}
          style={{
            border: "none",
            background: "none",
            color: C.muted,
            fontFamily: MONO,
            fontSize: 11,
            cursor: "pointer",
            padding: 4,
            flexShrink: 0,
          }}
        >
          skip
        </button>
      </div>

      {/* step 0 — welcome */}
      {step === 0 ? (
        <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "cjRise .35s ease both" }}>
          <div style={{ display: "flex", justifyContent: "center", marginBottom: 26 }}>
            <div
              style={{
                width: 132,
                height: 132,
                borderRadius: "50%",
                border: `2px solid ${C.rust}`,
                color: C.rust,
                background: "rgba(169,97,58,0.08)",
                transform: "rotate(-7deg)",
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
                  border: `1px solid ${C.rust}`,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "center",
                  textAlign: "center",
                }}
              >
                <div style={{ fontSize: 8, letterSpacing: "0.22em", fontWeight: 700, opacity: 0.85 }}>NO ACCOUNT</div>
                <div style={{ fontFamily: MONO, fontSize: 15, fontWeight: 700, lineHeight: 1.1, margin: "3px 0" }}>
                  COFFEE
                  <br />
                  JOTS
                </div>
                <div style={{ fontSize: 8, letterSpacing: "0.18em", fontWeight: 700, opacity: 0.85 }}>REQUIRED</div>
              </div>
            </div>
          </div>
          <h1 style={{ margin: 0, fontSize: 34, fontWeight: 700, letterSpacing: "-0.035em", lineHeight: 1.1, textWrap: "pretty" }}>
            Your roasting notebook, digital.
          </h1>
          <p style={{ fontSize: 15, lineHeight: 1.55, color: C.muted, margin: "12px 0 0", textWrap: "pretty" }}>
            Time, watts, color and sound — the way you already roast. No probe, no cloud, no feed. Three questions and
            you're logging.
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 26 }}>
            <button onClick={next} className="pressY" style={S.primaryBtn}>
              Set up my roaster
            </button>
            <button onClick={() => finishOnboarding()} style={{ ...S.secondaryBtn, width: "100%" }}>
              I have a backup code
            </button>
          </div>
        </div>
      ) : null}

      {/* step 1 — no sign-in, lock choice, backup code */}
      {step === 1 ? (
        <>
          <div style={{ flex: 1, animation: "cjRise .35s ease both" }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              There's no sign-in. On purpose.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: C.muted, margin: "10px 0 0" }}>
              Your journal lives on this phone. Nothing to remember, nothing to leak. Lock it if you like — that's the
              only door.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 18 }}>
              {[
                {
                  k: "faceid",
                  label: "Face ID",
                  sub: canPasskey ? "unlock with a glance" : "not available on this device",
                },
                { k: "passcode", label: "Passcode", sub: "type it to open" },
                { k: "none", label: "No lock", sub: "open straight to the log" },
              ].map((o) => {
                const on = st.obLock === o.k;
                return (
                  <button
                    key={o.k}
                    onClick={() => set({ obLock: o.k })}
                    className="press"
                    style={{
                      width: "100%",
                      textAlign: "left",
                      border: `1.5px solid ${on ? C.olive : C.hair}`,
                      background: on ? C.olive : C.field,
                      color: on ? C.cream : C.ink,
                      borderRadius: 14,
                      padding: "14px 16px",
                      cursor: "pointer",
                      fontFamily: "inherit",
                    }}
                  >
                    <span style={{ display: "block", fontSize: 15, fontWeight: 600 }}>{o.label}</span>
                    <span style={{ display: "block", fontSize: 12, marginTop: 2, color: on ? "rgba(244,241,233,0.75)" : C.muted }}>
                      {o.sub}
                    </span>
                  </button>
                );
              })}
            </div>
            {st.obLock === "passcode" ? (
              <div style={{ marginTop: 12 }}>
                <label style={S.fieldLabel}>Choose a passcode (4–8 digits)</label>
                <input
                  value={obCode}
                  onChange={(e) => setObCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
                  inputMode="numeric"
                  type="password"
                  placeholder="••••"
                  style={{ ...S.input, fontFamily: MONO, fontSize: 22, letterSpacing: "0.3em", textAlign: "center" }}
                />
              </div>
            ) : null}
            <div style={{ ...S.card, padding: "14px 16px", marginTop: 14 }}>
              <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.rust, fontWeight: 700 }}>
                BACKUP CODE
              </div>
              <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, marginTop: 6, letterSpacing: "0.1em" }}>
                {backupCode}
              </div>
              <div style={{ fontSize: 12, color: C.muted, marginTop: 6, lineHeight: 1.5 }}>
                Write this in the front of your paper logbook. It's how you get back in if Face ID stops working or you
                forget the passcode — and the only copy.
              </div>
            </div>
            {lockNote ? (
              <div style={{ fontSize: 12, color: C.rust, fontFamily: MONO, marginTop: 10, textAlign: "center" }}>
                {lockNote}
              </div>
            ) : null}
          </div>
          <button onClick={() => void applyLock()} disabled={lockBusy} className="pressY" style={{ ...S.primaryBtn, marginTop: 14 }}>
            {lockBusy ? "Setting up…" : "Got it — next"}
          </button>
        </>
      ) : null}

      {/* step 2 — scan the machine */}
      {step === 2 ? (
        <>
          <div style={{ flex: 1, animation: "cjRise .35s ease both" }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15 }}>
              Show me your machine.
            </h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: C.muted, margin: "10px 0 16px" }}>
              Hold the camera up to it. I'll read the dials and set the panel up to match — on device, no upload.
            </p>
            <div style={{ ...scanFrame, height: 216 }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 62%, #3A3F45, #191B1F 72%)" }} />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "58%",
                  transform: "translate(-50%,-50%)",
                  width: 118,
                  height: 118,
                  borderRadius: "50%",
                  background: "linear-gradient(180deg,#5A6068,#33383E)",
                  boxShadow: "0 8px 20px rgba(0,0,0,0.5)",
                }}
              />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "58%",
                  transform: "translate(-50%,-50%)",
                  width: 52,
                  height: 52,
                  borderRadius: "50%",
                  background: "#22262B",
                  border: "2px solid #43494F",
                }}
              />
              {dS === "busy" ? <ScanLine /> : null}
              <div style={{ ...corner({ left: 14, top: 14 }, "5px 0 0 0"), borderLeftWidth: 2, borderTopWidth: 2 }} />
              <div style={{ ...corner({ right: 14, top: 14 }, "0 5px 0 0"), borderRightWidth: 2, borderTopWidth: 2 }} />
              <div style={{ ...corner({ left: 14, bottom: 14 }, "0 0 0 5px"), borderLeftWidth: 2, borderBottomWidth: 2 }} />
              <div style={{ ...corner({ right: 14, bottom: 14 }, "0 0 5px 0"), borderRightWidth: 2, borderBottomWidth: 2 }} />
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 16,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: C.readout,
                  textTransform: "uppercase",
                }}
              >
                {dS === "busy" ? "reading the nameplate…" : "point at the machine"}
              </div>
            </div>
            {dS === "done" && machine ? (
              <div style={{ ...S.card, border: `1.5px solid ${C.olive}`, padding: "14px 16px", marginTop: 12, animation: "cjRise .3s ease both" }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.olive, fontWeight: 700 }}>
                  MACHINE RECOGNISED
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
                  {machine.fields.map((f) => (
                    <div
                      key={f.k}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "baseline",
                        gap: 10,
                        padding: "5px 0",
                        borderBottom: "1px solid rgba(183,175,159,0.4)",
                      }}
                    >
                      <span style={{ fontSize: 12, color: C.muted }}>{f.k}</span>
                      <span style={{ textAlign: "right" }}>
                        <span style={{ display: "block", fontFamily: MONO, fontSize: 12, fontWeight: 700 }}>{f.v}</span>
                        <span style={{ display: "block", fontFamily: MONO, fontSize: 9, color: C.faint }}>{f.note}</span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {dS === "done" ? (
              <button onClick={next} className="pressY" style={{ ...S.primaryBtn, flex: 1 }}>
                Looks right
              </button>
            ) : !dS ? (
              <button onClick={scanMachine} className="pressY" style={{ ...S.primaryBtn, flex: 1 }}>
                Scan my roaster
              </button>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            <button onClick={next} style={{ ...S.secondaryBtn, padding: "17px 16px", flexShrink: 0 }}>
              By hand
            </button>
          </div>
        </>
      ) : null}

      {/* step 3 — snap the bag */}
      {step === 3 ? (
        <>
          <div style={{ flex: 1, animation: "cjRise .35s ease both" }}>
            <h2 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em", lineHeight: 1.15 }}>Now the bag.</h2>
            <p style={{ fontSize: 14, lineHeight: 1.55, color: C.muted, margin: "10px 0 16px" }}>
              Snap the label on your green coffee. I'll pull out the bean, the origin and the process — you correct
              anything I get wrong.
            </p>
            <div style={{ ...scanFrame, height: 180 }}>
              <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 50% 55%, #46403A, #191B1F 74%)" }} />
              <div
                style={{
                  position: "absolute",
                  left: "50%",
                  top: "52%",
                  transform: "translate(-50%,-50%) rotate(-3deg)",
                  width: 128,
                  height: 104,
                  borderRadius: 6,
                  background: "linear-gradient(180deg,#D8CDB6,#B9AC92)",
                  boxShadow: "0 8px 18px rgba(0,0,0,0.45)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: 6,
                  padding: 12,
                }}
              >
                <div style={{ height: 7, width: "76%", background: C.muted, opacity: 0.55, borderRadius: 2 }} />
                <div style={{ height: 5, width: "52%", background: C.muted, opacity: 0.35, borderRadius: 2 }} />
                <div style={{ height: 5, width: "64%", background: C.muted, opacity: 0.35, borderRadius: 2 }} />
              </div>
              {bS === "busy" ? <ScanLine /> : null}
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  right: 0,
                  bottom: 14,
                  textAlign: "center",
                  fontFamily: MONO,
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  color: C.readout,
                  textTransform: "uppercase",
                }}
              >
                bag label
              </div>
            </div>
            {bS === "done" && bag ? (
              <div style={{ ...S.card, border: `1.5px solid ${C.olive}`, padding: "14px 16px", marginTop: 12, animation: "cjRise .3s ease both" }}>
                <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.olive, fontWeight: 700 }}>
                  READ FROM THE LABEL — TAP TO EDIT
                </div>
                <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 1 }}>
                  {bag.fields.map((f) => {
                    const cc = f.confidence === "high" ? C.olive : C.rust;
                    return (
                      <div
                        key={f.k}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          gap: 10,
                          padding: "7px 0",
                          borderBottom: "1px solid rgba(183,175,159,0.4)",
                        }}
                      >
                        <span style={{ fontSize: 12, color: C.muted, flexShrink: 0 }}>{f.k}</span>
                        <span style={{ display: "flex", alignItems: "center", gap: 7, minWidth: 0 }}>
                          <span style={{ fontSize: 13, fontWeight: 600, textAlign: "right" }}>{f.v}</span>
                          <span
                            style={{
                              fontFamily: MONO,
                              fontSize: 8,
                              letterSpacing: "0.1em",
                              color: cc,
                              border: `1px solid ${cc}`,
                              borderRadius: 999,
                              padding: "2px 6px",
                              flexShrink: 0,
                            }}
                          >
                            {f.confidence === "high" ? "SURE" : "CHECK"}
                          </span>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {bS === "done" ? (
              <button onClick={saveScannedBean} className="pressY" style={{ ...S.primaryBtn, flex: 1 }}>
                Save this bean
              </button>
            ) : !bS ? (
              <button onClick={scanBag} className="pressY" style={{ ...S.primaryBtn, flex: 1 }}>
                Snap the label
              </button>
            ) : (
              <div style={{ flex: 1 }} />
            )}
            <button onClick={next} style={{ ...S.secondaryBtn, padding: "17px 16px", flexShrink: 0 }}>
              Type it
            </button>
          </div>
        </>
      ) : null}

      {/* step 4 — ready */}
      {step === 4 ? (
        <>
          <div style={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center", animation: "cjRise .35s ease both" }}>
            <div style={{ display: "flex", justifyContent: "center" }}>
              <div
                style={{
                  width: 112,
                  height: 112,
                  borderRadius: "50%",
                  border: `2px solid ${C.olive}`,
                  color: C.olive,
                  background: "rgba(87,86,24,0.08)",
                  transform: "rotate(6deg)",
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
                    border: `1px solid ${C.olive}`,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    textAlign: "center",
                  }}
                >
                  <div style={{ fontSize: 8, letterSpacing: "0.2em", fontWeight: 700, opacity: 0.85 }}>JOURNAL</div>
                  <div style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, margin: "2px 0" }}>OPEN</div>
                  <div style={{ fontFamily: MONO, fontSize: 9, fontWeight: 700 }}>EST. {new Date().getFullYear()}</div>
                </div>
              </div>
            </div>
            <h2 style={{ margin: "22px 0 0", fontSize: 28, fontWeight: 700, letterSpacing: "-0.03em", textAlign: "center" }}>
              Ready when you are.
            </h2>
            <div style={{ ...S.card, padding: "14px 16px", marginTop: 18 }}>
              {[
                { k: "Roaster", v: (machine?.device.name || store.dev().name) + " · watts over time" },
                { k: "Tracks", v: "watts · dial · time · color" },
                {
                  k: "First bean",
                  v: bag ? bag.bean.name + " · " + bag.bean.origin : st.beans[0] ? st.beans[0].name : "add one at first roast",
                },
                {
                  k: "Lock",
                  v:
                    st.settings.lockCfg.mode === "passkey"
                      ? "Face ID · on"
                      : st.settings.lockCfg.mode === "passcode"
                        ? "Passcode · on"
                        : "none",
                },
              ].map((row) => (
                <div
                  key={row.k}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                    gap: 10,
                    padding: "6px 0",
                    borderBottom: "1px solid rgba(183,175,159,0.4)",
                  }}
                >
                  <span style={{ fontSize: 13, color: C.muted }}>{row.k}</span>
                  <span style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, textAlign: "right" }}>{row.v}</span>
                </div>
              ))}
            </div>
          </div>
          <button
            onClick={() => finishOnboarding("You're set up — happy roasting")}
            className="pressY"
            style={{ ...S.primaryBtn, marginTop: 14 }}
          >
            Open my journal
          </button>
        </>
      ) : null}
    </div>
  );
}
