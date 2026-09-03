import { useCallback, useEffect, useRef, useState } from "react";
import { S } from "./ui";
import { C, MONO } from "../lib/constants";
import { normalizeBackupCode, verifyPasskey } from "../lib/lock";
import { useStore } from "../store";

/** The door in front of the journal. Shown whenever `locked` is true. */
export function LockScreen() {
  const { st, unlock, checkPasscode, disableLock, flash } = useStore();
  const cfg = st.settings.lockCfg;
  const profile = st.settings.profile;

  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoveryInput, setRecoveryInput] = useState("");
  const triedAutoPrompt = useRef(false);

  const tryPasskey = useCallback(async () => {
    if (!cfg.credentialId || busy) return;
    setBusy(true);
    setError("");
    const ok = await verifyPasskey(cfg.credentialId);
    setBusy(false);
    if (ok) unlock();
    else setError("Didn't match — try again, or use your backup code.");
  }, [cfg.credentialId, busy, unlock]);

  // Offer Face ID immediately on open. Safari requires a user gesture for
  // WebAuthn, so if the automatic attempt is refused the button is still there.
  useEffect(() => {
    if (cfg.mode === "passkey" && !triedAutoPrompt.current) {
      triedAutoPrompt.current = true;
      void tryPasskey();
    }
  }, [cfg.mode, tryPasskey]);

  const submitPasscode = async () => {
    if (busy) return;
    setBusy(true);
    const ok = await checkPasscode(code);
    setBusy(false);
    if (ok) {
      setCode("");
      setError("");
      unlock();
    } else {
      setCode("");
      setError("Wrong passcode.");
    }
  };

  const submitRecovery = () => {
    const given = normalizeBackupCode(recoveryInput);
    const want = normalizeBackupCode(cfg.backupCode || "");
    if (want && given === want) {
      // Recovery clears the lock so the journal is never permanently sealed.
      disableLock();
      flash("Lock removed — set a new one in your profile");
    } else {
      setError("That backup code doesn't match.");
    }
  };

  const greeting = profile.displayName ? `Welcome back, ${profile.displayName.split(" ")[0]}` : "Coffee Jots";

  return (
    <div
      className="appShell"
      style={{ alignItems: "center", justifyContent: "center", position: "fixed", inset: 0, zIndex: 200 }}
    >
      <div className="appCol" style={{ maxWidth: 380, textAlign: "center" }}>
        {profile.avatar ? (
          <img
            src={profile.avatar}
            alt=""
            style={{
              width: 88,
              height: 88,
              borderRadius: "50%",
              objectFit: "cover",
              border: `2px solid ${C.rust}`,
              margin: "0 auto 18px",
              display: "block",
            }}
          />
        ) : (
          <div
            style={{
              width: 104,
              height: 104,
              borderRadius: "50%",
              border: `2px solid ${C.rust}`,
              color: C.rust,
              background: "rgba(169,97,58,0.08)",
              transform: "rotate(-7deg)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 20px",
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
              }}
            >
              <div style={{ fontSize: 7, letterSpacing: "0.2em", fontWeight: 700, opacity: 0.85 }}>JOURNAL</div>
              <div style={{ fontFamily: MONO, fontSize: 12, fontWeight: 700, margin: "2px 0" }}>LOCKED</div>
            </div>
          </div>
        )}

        <h1 style={{ margin: 0, fontSize: 26, fontWeight: 700, letterSpacing: "-0.03em" }}>{greeting}</h1>
        <p style={{ fontSize: 14, color: C.muted, margin: "8px 0 22px", lineHeight: 1.5 }}>
          {profile.roastery ? profile.roastery + " · " : ""}
          {cfg.mode === "passkey" ? "Unlock to open your journal." : "Enter your passcode to open your journal."}
        </p>

        {recovering ? (
          <>
            <label style={{ ...S.fieldLabel, textAlign: "left" }}>Backup code</label>
            <input
              value={recoveryInput}
              onChange={(e) => setRecoveryInput(e.target.value)}
              placeholder="JOTS-XXXX-XXXX"
              autoCapitalize="characters"
              style={{ ...S.input, fontFamily: MONO, textAlign: "center", letterSpacing: "0.08em" }}
            />
            <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
              This is the code from your first-run setup. Using it removes the lock — your roasts stay put.
            </div>
            <button onClick={submitRecovery} className="pressY" style={{ ...S.primaryBtn, marginTop: 14 }}>
              Unlock with backup code
            </button>
            <button
              onClick={() => {
                setRecovering(false);
                setError("");
              }}
              style={{
                border: "none",
                background: "none",
                color: C.muted,
                fontFamily: MONO,
                fontSize: 11,
                textDecoration: "underline",
                cursor: "pointer",
                padding: 10,
                marginTop: 6,
              }}
            >
              back
            </button>
          </>
        ) : cfg.mode === "passkey" ? (
          <button onClick={() => void tryPasskey()} disabled={busy} className="pressY" style={S.primaryBtn}>
            {busy ? "Waiting for Face ID…" : "Unlock"}
          </button>
        ) : (
          <>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitPasscode();
              }}
              inputMode="numeric"
              type="password"
              autoFocus
              placeholder="••••"
              style={{
                ...S.input,
                fontFamily: MONO,
                fontSize: 30,
                textAlign: "center",
                letterSpacing: "0.4em",
                padding: "14px 13px",
              }}
            />
            <button
              onClick={() => void submitPasscode()}
              disabled={busy || code.length < 4}
              className="pressY"
              style={{ ...S.primaryBtn, marginTop: 12, opacity: code.length >= 4 ? 1 : 0.4 }}
            >
              Unlock
            </button>
          </>
        )}

        {error ? (
          <div style={{ fontSize: 12, color: C.rust, marginTop: 12, fontFamily: MONO }} role="alert">
            {error}
          </div>
        ) : null}

        {!recovering && cfg.backupCode ? (
          <button
            onClick={() => {
              setRecovering(true);
              setError("");
            }}
            style={{
              border: "none",
              background: "none",
              color: C.muted,
              fontFamily: MONO,
              fontSize: 11,
              textDecoration: "underline",
              cursor: "pointer",
              padding: 10,
              marginTop: 16,
            }}
          >
            {cfg.mode === "passkey" ? "Face ID not working?" : "Forgot your passcode?"}
          </button>
        ) : null}
      </div>
    </div>
  );
}
