import { useEffect, useState } from "react";
import { Chip, S, ScreenHeader } from "../components/ui";
import { fileToAvatar } from "../lib/avatar";
import { C, MONO } from "../lib/constants";
import { passkeyAvailable } from "../lib/lock";
import { useStore } from "../store";

export function Profile() {
  const store = useStore();
  const {
    st,
    set,
    flash,
    saveProfile,
    enablePasskeyLock,
    enablePasscodeLock,
    disableLock,
    setAutoLockMinutes,
    ensureBackupCode,
    lockNow,
  } = store;

  const profile = st.settings.profile;
  const cfg = st.settings.lockCfg;

  const [name, setName] = useState(profile.displayName);
  const [roastery, setRoastery] = useState(profile.roastery);
  const [canPasskey, setCanPasskey] = useState(false);
  const [newCode, setNewCode] = useState("");
  const [confirmCode, setConfirmCode] = useState("");
  const [settingPasscode, setSettingPasscode] = useState(false);
  const [showBackup, setShowBackup] = useState(false);
  const [err, setErr] = useState("");

  useEffect(() => {
    void passkeyAvailable().then(setCanPasskey);
  }, []);

  const roastCount = st.roasts.length;
  const since = profile.since || st.roasts[st.roasts.length - 1]?.createdAt || null;

  const onPhoto = async (file: File) => {
    try {
      const avatar = await fileToAvatar(file);
      saveProfile({ avatar });
      flash("Photo updated");
    } catch {
      flash("Couldn't read that image");
    }
  };

  const turnOnPasskey = async () => {
    const ok = await enablePasskeyLock();
    if (ok) {
      setShowBackup(true);
      flash("Face ID lock on");
    } else {
      flash("Face ID setup was cancelled");
    }
  };

  const savePasscode = async () => {
    setErr("");
    if (!/^\d{4,8}$/.test(newCode)) {
      setErr("Use 4–8 digits.");
      return;
    }
    if (newCode !== confirmCode) {
      setErr("The two codes don't match.");
      return;
    }
    const ok = await enablePasscodeLock(newCode);
    if (ok) {
      setNewCode("");
      setConfirmCode("");
      setSettingPasscode(false);
      setShowBackup(true);
      flash("Passcode lock on");
    }
  };

  const lockLabel = cfg.mode === "passkey" ? "Face ID / Touch ID" : cfg.mode === "passcode" ? "Passcode" : "Off";

  return (
    <div>
      <ScreenHeader title="Your profile" onBack={() => set({ screen: "home" })} />

      {/* identity */}
      <div style={{ ...S.card, textAlign: "center", animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)" }}>
        <label style={{ cursor: "pointer", display: "inline-block" }}>
          {profile.avatar ? (
            <img
              src={profile.avatar}
              alt="Your photo"
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                objectFit: "cover",
                border: `2px solid ${C.rust}`,
                display: "block",
              }}
            />
          ) : (
            <div
              style={{
                width: 96,
                height: 96,
                borderRadius: "50%",
                border: `2px dashed ${C.hair}`,
                color: C.muted,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: MONO,
                fontSize: 10,
                letterSpacing: "0.1em",
                textAlign: "center",
                padding: 8,
              }}
            >
              ADD
              <br />
              PHOTO
            </div>
          )}
          <input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void onPhoto(f);
              e.target.value = "";
            }}
            style={{ display: "none" }}
          />
        </label>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 8, fontFamily: MONO }}>
          tap to change · stays on this device
        </div>
        {profile.avatar ? (
          <button
            onClick={() => saveProfile({ avatar: null })}
            style={{
              border: "none",
              background: "none",
              color: C.rust,
              fontSize: 11,
              textDecoration: "underline",
              cursor: "pointer",
              fontFamily: "inherit",
              padding: 6,
            }}
          >
            remove photo
          </button>
        ) : null}

        <div style={{ textAlign: "left", marginTop: 14 }}>
          <label style={S.fieldLabel}>Your name</label>
          <input
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              saveProfile({ displayName: e.target.value.trim() });
            }}
            placeholder="e.g. Adam"
            style={S.input}
          />
          <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Home roastery</label>
          <input
            value={roastery}
            onChange={(e) => {
              setRoastery(e.target.value);
              saveProfile({ roastery: e.target.value.trim() });
            }}
            placeholder="e.g. Kitchen Counter Roasting Co."
            style={S.input}
          />
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8 }}>
            Shown on your lock screen and on the roast cards you share.
          </div>
        </div>
      </div>

      {/* journal summary */}
      <div style={{ ...S.card, marginTop: 12, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: "80ms" }}>
        <div style={{ ...S.sectionLabel, marginBottom: 8 }}>This journal</div>
        {[
          { k: "Roasts logged", v: String(roastCount) },
          { k: "Beans", v: String(st.beans.length) },
          { k: "Roasters", v: String(st.devices.length) },
          {
            k: "Keeping notes since",
            v: since ? new Date(since).toLocaleDateString(undefined, { month: "long", year: "numeric" }) : "—",
          },
        ].map((r) => (
          <div
            key={r.k}
            style={{
              display: "flex",
              justifyContent: "space-between",
              padding: "6px 0",
              borderBottom: "1px solid rgba(183,175,159,0.35)",
            }}
          >
            <span style={{ color: C.muted, fontSize: 13 }}>{r.k}</span>
            <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 13 }}>{r.v}</span>
          </div>
        ))}
      </div>

      {/* lock */}
      <div style={{ ...S.card, marginTop: 12, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: "160ms" }}>
        <div style={{ ...S.sectionLabel, marginBottom: 4 }}>Lock this journal</div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 12, lineHeight: 1.5 }}>
          There's still no account — this is a lock on your own device, not a login.
        </div>

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <span style={{ fontSize: 13 }}>Currently</span>
          <span
            style={{
              fontFamily: MONO,
              fontSize: 12,
              fontWeight: 700,
              padding: "4px 11px",
              borderRadius: 999,
              background: cfg.mode === "none" ? C.field : C.olive,
              color: cfg.mode === "none" ? C.muted : C.cream,
              border: `1px solid ${cfg.mode === "none" ? C.hair : C.olive}`,
            }}
          >
            {lockLabel}
          </span>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          <Chip
            label={canPasskey ? "Use Face ID" : "Face ID unavailable"}
            on={cfg.mode === "passkey"}
            onClick={() => {
              if (!canPasskey) {
                flash("This device/browser has no Face ID or Touch ID");
                return;
              }
              void turnOnPasskey();
            }}
            style={canPasskey ? undefined : { opacity: 0.45 }}
          />
          <Chip
            label="Use a passcode"
            on={cfg.mode === "passcode"}
            onClick={() => {
              setSettingPasscode(true);
              setErr("");
            }}
          />
          <Chip
            label="No lock"
            on={cfg.mode === "none"}
            onClick={() => {
              if (cfg.mode === "none") return;
              disableLock();
              flash("Lock removed");
            }}
          />
        </div>

        {settingPasscode ? (
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${C.hair}` }}>
            <label style={S.fieldLabel}>New passcode (4–8 digits)</label>
            <input
              value={newCode}
              onChange={(e) => setNewCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              placeholder="••••"
              style={{ ...S.input, fontFamily: MONO, letterSpacing: "0.3em" }}
            />
            <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Confirm</label>
            <input
              value={confirmCode}
              onChange={(e) => setConfirmCode(e.target.value.replace(/[^0-9]/g, "").slice(0, 8))}
              inputMode="numeric"
              type="password"
              placeholder="••••"
              style={{ ...S.input, fontFamily: MONO, letterSpacing: "0.3em" }}
            />
            {err ? <div style={{ fontSize: 12, color: C.rust, marginTop: 8, fontFamily: MONO }}>{err}</div> : null}
            <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
              <button onClick={() => void savePasscode()} className="pressY" style={{ ...S.primaryBtn, flex: 1, padding: 14, fontSize: 15 }}>
                Save passcode
              </button>
              <button
                onClick={() => {
                  setSettingPasscode(false);
                  setNewCode("");
                  setConfirmCode("");
                  setErr("");
                }}
                style={{ ...S.secondaryBtn, padding: "14px 16px" }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : null}

        {cfg.mode !== "none" ? (
          <>
            <div style={{ ...S.sectionLabel, margin: "16px 0 8px" }}>Lock again after</div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
              {[
                [0, "Only on launch"],
                [1, "1 min"],
                [15, "15 min"],
                [60, "1 hour"],
              ].map(([m, label]) => (
                <Chip
                  key={m as number}
                  label={label as string}
                  on={cfg.autoLockMinutes === m}
                  onClick={() => setAutoLockMinutes(m as number)}
                  mono
                />
              ))}
            </div>
            <div style={{ fontSize: 12, color: C.muted, marginTop: 10, lineHeight: 1.5 }}>
              Never locks while a roast is in progress — you shouldn't have to unlock with beans in the machine.
            </div>
            <button
              onClick={() => {
                lockNow();
              }}
              className="pressY"
              style={{ ...S.secondaryBtn, width: "100%", marginTop: 12, padding: 14 }}
            >
              Lock now
            </button>
          </>
        ) : null}
      </div>

      {/* backup code */}
      {cfg.mode !== "none" ? (
        <div style={{ ...S.card, marginTop: 12, border: `1.5px solid ${C.rust}`, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: "240ms" }}>
          <div style={{ fontFamily: MONO, fontSize: 10, letterSpacing: "0.14em", color: C.rust, fontWeight: 700 }}>
            BACKUP CODE
          </div>
          {showBackup ? (
            <div style={{ fontFamily: MONO, fontSize: 19, fontWeight: 700, marginTop: 6, letterSpacing: "0.1em" }}>
              {ensureBackupCode()}
            </div>
          ) : (
            <button
              onClick={() => setShowBackup(true)}
              style={{
                border: `1px solid ${C.hair}`,
                background: C.field,
                borderRadius: 11,
                padding: "10px 13px",
                marginTop: 8,
                fontFamily: "inherit",
                fontSize: 13,
                fontWeight: 600,
                cursor: "pointer",
                color: C.ink,
              }}
            >
              Show my backup code
            </button>
          )}
          <div style={{ fontSize: 12, color: C.muted, marginTop: 8, lineHeight: 1.5 }}>
            Write it in the front of your paper logbook. It's the only way back in if Face ID stops working or you
            forget the passcode — and using it removes the lock rather than losing your roasts.
          </div>
        </div>
      ) : null}

      {/* honest note about what the lock is */}
      <div style={{ ...S.card, marginTop: 12, background: "transparent", border: `1px dashed ${C.hair}`, animation: "cjSlideUp 400ms cubic-bezier(0.22, 0.61, 0.36, 1)", animationDelay: "320ms" }}>
        <div style={{ ...S.sectionLabel, marginBottom: 6 }}>What this lock does</div>
        <div style={{ fontSize: 12.5, color: C.muted, lineHeight: 1.55 }}>
          It stops someone who picks up your phone from opening the journal. It does <strong>not</strong> encrypt your
          roasts — they're stored in this browser's database, so anyone with real access to the device could still get
          at them. For a private notebook of roast times that's the right trade; just don't keep secrets in the notes
          field.
        </div>
      </div>
    </div>
  );
}
