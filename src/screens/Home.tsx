import { useEffect, useState } from "react";
import { JotsMark } from "../components/JotsMark";
import { Stamp } from "../components/Stamp";
import { S } from "../components/ui";
import { fmt, lossPct, originStamps, stampify } from "../lib/calc";
import { C, GROT, LEVELS, MONO } from "../lib/constants";
import { storageEstimate } from "../db";
import { useStore } from "../store";

const WEEK = 7 * 24 * 3600 * 1000;

export function Home() {
  const store = useStore();
  const { st, set, exportJournal, importJournal, savedAt } = store;
  const [dbSize, setDbSize] = useState("—");

  useEffect(() => {
    void storageEstimate().then(setDbSize);
  }, [st.roasts.length, savedAt]);

  const roasts = st.roasts;
  const a = st.active;
  const stamps = originStamps(roasts);
  const total = roasts.length;
  const avgDur = total ? Math.round(roasts.reduce((x, r) => x + (r.durationSec || 0), 0) / total) : 0;
  const totalBeans = roasts.reduce((x, r) => x + (r.greenWeight || 0), 0);
  const losses = roasts.map(lossPct).filter((x): x is number => x != null);
  const avgLoss = losses.length ? losses.reduce((x, y) => x + y, 0) / losses.length : null;
  const evens = roasts.filter((r) => r.evenness).map((r) => r.evenness!);
  const avgEven = evens.length ? evens.reduce((x, y) => x + y, 0) / evens.length : null;
  const bc: Record<string, number> = {};
  roasts.forEach((r) => {
    if (r.beanName) bc[r.beanName] = (bc[r.beanName] || 0) + 1;
  });
  const popular = Object.entries(bc).sort((x, y) => y[1] - x[1])[0];

  const statCards: { l: string; v: string; s: string; ff: string; fs: number }[] = [
    { l: "Roasts", v: String(total), s: "all time", ff: MONO, fs: 22 },
    { l: "Avg time", v: avgDur ? fmt(avgDur) : "—", s: "per roast", ff: MONO, fs: 22 },
    {
      l: "Green beans",
      v: totalBeans >= 1000 ? (totalBeans / 1000).toFixed(2) + " kg" : Math.round(totalBeans) + " g",
      s: "all roasts",
      ff: MONO,
      fs: 22,
    },
    {
      l: "Popular bean",
      v: popular ? popular[0] : "—",
      s: popular ? "×" + popular[1] + " roasted" : "most roasted",
      ff: GROT,
      fs: 15,
    },
    { l: "Avg loss", v: avgLoss != null ? avgLoss.toFixed(1) + "%" : "—", s: "green → roasted", ff: MONO, fs: 22 },
    { l: "Avg evenness", v: avgEven != null ? avgEven.toFixed(1) : "—", s: "out of 5", ff: MONO, fs: 22 },
    { l: "Countries", v: String(stamps.length), s: "in passport", ff: MONO, fs: 22 },
  ];
  const rated = roasts.filter((r) => r.rating).map((r) => r.rating!);
  if (rated.length)
    statCards.splice(6, 0, {
      l: "Avg rating",
      v: (rated.reduce((x, y) => x + y, 0) / rated.length).toFixed(1) + "★",
      s: "roast performance",
      ff: MONO,
      fs: 22,
    });

  const teaserStamps = stamps.length
    // Overlap only slightly — the inked rings collide into mush past about -8.
    ? stamps.slice(0, 3).map((s, i) => stampify(s, i, 50, false, 0, i ? -8 : 0))
    : [stampify({ origin: "Ethiopia" }, 0, 54, true, 0, 0)];

  const q = st.q.trim().toLowerCase();
  const filtered = roasts.filter(
    (r) => !q || (r.beanName + " " + (r.origin || "") + " " + (r.roastLevel || "")).toLowerCase().includes(q),
  );

  // weekly backup nudge: roasted in the last week, but no export for 7+ days
  const lastRoast = roasts[0]?.finishedAt || roasts[0]?.createdAt || 0;
  const needsBackup =
    total > 0 &&
    Date.now() - lastRoast < WEEK &&
    (st.settings.lastExportAt == null || Date.now() - st.settings.lastExportAt > WEEK);

  const goDevices = () => set({ screen: "devices" });

  return (
    <div>
      <div style={{ marginBottom: 18, display: "flex", alignItems: "flex-start", gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <JotsMark size={34} tile drop />
          {/* The product is always Jots at the top; a roastery name is a
              subtitle, never a replacement for the name. */}
          <h1 style={{ margin: 0, fontSize: 32, fontWeight: 700, letterSpacing: "-0.03em", minWidth: 0 }}>Jots</h1>
        </div>
        <button
          onClick={goDevices}
          className="press"
          style={{
            marginTop: 5,
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "none",
            border: "none",
            padding: 0,
            cursor: "pointer",
            fontFamily: MONO,
            fontSize: 11,
            color: C.muted,
          }}
        >
          <span>{st.settings.profile.roastery || "personal roasting journal"} ·</span>
          <span
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              border: `1px solid ${C.hair}`,
              borderRadius: 999,
              padding: "2px 8px",
              color: C.ink,
              background: C.card,
            }}
          >
            {store.dev().name}
            <span style={{ fontSize: 9, opacity: 0.6 }}>▾</span>
          </span>
        </button>
        </div>
        <button
          onClick={() => set({ screen: "profile" })}
          className="press"
          aria-label="Your profile"
          style={{
            flexShrink: 0,
            width: 44,
            height: 44,
            borderRadius: "50%",
            border: `1px solid ${C.hair}`,
            background: C.card,
            padding: 0,
            cursor: "pointer",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {st.settings.profile.avatar ? (
            <img
              src={st.settings.profile.avatar}
              alt=""
              style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
            />
          ) : (
            <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: C.muted }}>
              {(st.settings.profile.displayName.trim()[0] || "·").toUpperCase()}
            </span>
          )}
        </button>
      </div>

      {a ? (
        <button
          onClick={() => set({ screen: "live" })}
          className="press"
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            background: C.olive,
            color: C.cream,
            border: "none",
            borderRadius: 16,
            padding: "15px 16px",
            marginBottom: 12,
            cursor: "pointer",
            textAlign: "left",
            fontFamily: "inherit",
          }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: "#E7C15C",
                animation: "cjBlink 1.2s infinite",
                flexShrink: 0,
              }}
            />
            <span>
              <span style={{ display: "block", fontWeight: 700, fontSize: 15 }}>Roast in progress</span>
              <span style={{ display: "block", fontSize: 12, opacity: 0.8, marginTop: 1 }}>
                {a.beanName +
                  " · " +
                  (a.status === "cooling" ? "cooling" : a.status === "idle" ? "ready to charge" : "roasting")}
              </span>
            </span>
          </span>
          <span style={{ fontSize: 18 }}>→</span>
        </button>
      ) : null}

      <button
        onClick={() =>
          set({
            screen: "setup",
            setupMode: st.beans.length ? "pick" : "new",
            setupBeanId: null,
            setupName: "",
            setupOrigin: "",
            setupProcess: "",
            setupDesc: "",
            setupGreen: "",
            setupBatch: null,
          })
        }
        className="pressY"
        style={{ ...S.primaryBtn, letterSpacing: "0.01em" }}
      >
        + &nbsp;Start new roast
      </button>

      {st.pendingImport ? (
        <div style={{ ...S.card, border: `1.5px solid ${C.rust}`, padding: "14px 16px", marginTop: 12 }}>
          <div style={{ ...S.sectionLabel, color: C.rust }}>Restore backup?</div>
          <div style={{ fontSize: 13, color: C.ink, marginTop: 6, lineHeight: 1.5 }}>
            This replaces the {roasts.length} roast{roasts.length === 1 ? "" : "s"} on this device with the{" "}
            {st.pendingImport.roasts.length} in the file. Your current journal can't be recovered afterwards unless
            you've exported it.
          </div>
          <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
            <button
              onClick={store.confirmImport}
              className="pressY"
              style={{
                flex: 1,
                border: `1px solid ${C.rust}`,
                background: C.rust,
                color: C.cream,
                borderRadius: 11,
                padding: 12,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Replace journal
            </button>
            <button
              onClick={store.cancelImport}
              className="pressY"
              style={{
                flex: 1,
                border: `1px solid ${C.hair}`,
                background: "transparent",
                color: C.ink,
                borderRadius: 11,
                padding: 12,
                fontFamily: "inherit",
                fontSize: 14,
                fontWeight: 600,
                cursor: "pointer",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      ) : null}

      {needsBackup ? (
        <div
          style={{
            ...S.card,
            border: `1.5px solid ${C.rust}`,
            padding: "12px 14px",
            marginTop: 12,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 10,
          }}
        >
          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600 }}>Back up this week's roasts?</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>
              You've roasted recently and haven't exported in a while.
            </div>
          </div>
          <button
            onClick={exportJournal}
            className="pressY"
            style={{
              flexShrink: 0,
              border: `1px solid ${C.rust}`,
              background: C.rust,
              color: C.cream,
              borderRadius: 11,
              padding: "10px 13px",
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export now
          </button>
        </div>
      ) : null}

      {/* analytics strip */}
      <button
        onClick={() => set({ screen: "analytics" })}
        className="press"
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "none",
          border: "none",
          padding: 0,
          margin: "22px 0 8px",
          cursor: "pointer",
        }}
      >
        <span style={{ ...S.sectionLabel, fontFamily: "inherit" }}>Analytics</span>
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: 5,
            fontFamily: MONO,
            fontSize: 11,
            color: C.olive,
            border: `1px solid ${C.hair}`,
            borderRadius: 999,
            padding: "3px 9px",
            background: C.card,
          }}
        >
          see all →
        </span>
      </button>
      <div
        className="noScrollbar"
        style={{
          display: "flex",
          gap: 10,
          overflowX: "auto",
          paddingBottom: 4,
          margin: "0 -16px",
          paddingLeft: 16,
          paddingRight: 16,
        }}
      >
        {statCards.map((c, i) => (
          <div
            key={c.l}
            onClick={() => set({ screen: "analytics" })}
            className="press cjIn"
            style={{
              animationDelay: `${Math.min(i, 6) * 45}ms`,
              flex: "0 0 auto",
              minWidth: 116,
              background: C.card,
              border: `1px solid ${C.hair}`,
              borderRadius: 14,
              padding: "12px 14px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                fontSize: 10,
                textTransform: "uppercase",
                letterSpacing: "0.1em",
                color: C.muted,
                fontWeight: 600,
                marginBottom: 6,
                whiteSpace: "nowrap",
              }}
            >
              {c.l}
            </div>
            <div style={{ fontSize: c.fs, fontWeight: 700, letterSpacing: "-0.02em", fontFamily: c.ff, whiteSpace: "nowrap" }}>
              {c.v}
            </div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2, whiteSpace: "nowrap" }}>{c.s}</div>
          </div>
        ))}
      </div>

      {/* passport teaser */}
      <div
        onClick={() => set({ screen: "passport" })}
        className="press"
        style={{
          ...S.card,
          padding: "14px 16px",
          marginTop: 14,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 10,
          cursor: "pointer",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div style={{ display: "flex" }}>
            {teaserStamps.map((s, i) => (
              <div key={i} style={{ marginLeft: s.ml }}>
                <Stamp s={s} />
              </div>
            ))}
          </div>
          <div>
            <div style={S.sectionLabel}>Passport</div>
            <div style={{ fontWeight: 700, fontSize: 16, marginTop: 1 }}>
              {stamps.length + (stamps.length === 1 ? " country" : " countries")}
            </div>
            <div style={{ fontSize: 12, color: C.muted }}>a stamp per bean origin</div>
          </div>
        </div>
        <span style={{ fontSize: 17, color: C.muted }}>→</span>
      </div>

      {/* journal data */}
      <div style={{ ...S.card, padding: "14px 16px", marginTop: 12 }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
          <div style={{ minWidth: 0 }}>
            <div style={S.sectionLabel}>Journal data</div>
            <div style={{ fontFamily: MONO, fontSize: 11, color: C.ink, marginTop: 3 }}>
              {roasts.length} roasts · {st.beans.length} beans · {st.devices.length} devices
            </div>
            <div style={{ fontFamily: MONO, fontSize: 10, color: C.faint, marginTop: 2 }}>
              {dbSize} on this device ·{" "}
              {savedAt
                ? "saved " + new Date(savedAt).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
                : "saved on this device"}
            </div>
          </div>
          <span style={{ width: 9, height: 9, borderRadius: "50%", background: C.olive, flexShrink: 0 }} />
        </div>
        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            onClick={exportJournal}
            className="pressY"
            style={{
              flex: 1,
              border: `1px solid ${C.olive}`,
              background: C.olive,
              color: C.cream,
              borderRadius: 11,
              padding: 11,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Export backup
          </button>
          <label
            style={{
              flex: 1,
              border: `1px solid ${C.hair}`,
              borderRadius: 11,
              padding: 11,
              fontFamily: "inherit",
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              color: C.ink,
              textAlign: "center",
            }}
          >
            Restore
            <input
              type="file"
              accept="application/json"
              onChange={(e) => {
                const f = e.target.files && e.target.files[0];
                if (f) importJournal(f);
                e.target.value = "";
              }}
              style={{ display: "none" }}
            />
          </label>
        </div>
      </div>
      <div style={{ textAlign: "center", marginTop: 10 }}>
        <button
          onClick={() => set({ screen: "onboard", obStep: 0, obScan: {} })}
          style={{
            border: "none",
            background: "none",
            color: C.muted,
            fontFamily: MONO,
            fontSize: 11,
            textDecoration: "underline",
            cursor: "pointer",
            padding: 6,
          }}
        >
          replay first-run setup
        </button>
      </div>

      {/* roast log */}
      <div style={{ ...S.sectionLabel, margin: "22px 0 10px" }}>Roast log</div>
      <input
        value={st.q}
        onChange={(e) => set({ q: e.target.value })}
        placeholder="Search your roasts…"
        style={{ ...S.input, marginBottom: 12 }}
      />
      {filtered.length === 0 ? (
        <div style={{ ...S.card, fontSize: 13, color: C.muted }}>
          {roasts.length === 0
            ? "No roasts yet. Tap Start new roast to log your first one."
            : `No roasts match “${st.q}”.`}
        </div>
      ) : null}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {filtered.map((r, i) => {
          const loss = lossPct(r);
          const LV = LEVELS.find((x) => x.name === r.roastLevel);
          return (
            <div
              key={r.id}
              onClick={() => set({ detailId: r.id, compareId: null, screen: "detail" })}
              className="press cjIn"
              style={{
                // capped so a long journal doesn't leave the last rows waiting
                animationDelay: `${Math.min(i, 7) * 40}ms`,
                ...S.card,
                padding: "14px 16px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                cursor: "pointer",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 11, minWidth: 0 }}>
                <span
                  style={{
                    fontFamily: MONO,
                    fontSize: 12,
                    fontWeight: 700,
                    color: C.muted,
                    border: `1px solid ${C.hair}`,
                    borderRadius: 8,
                    padding: "5px 6px",
                    flexShrink: 0,
                  }}
                >
                  B{r.batch || 1}
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: "block", fontWeight: 600, fontSize: 15 }}>{r.beanName}</span>
                  <span style={{ display: "block", fontSize: 12, color: C.muted, fontFamily: MONO, marginTop: 2 }}>
                    {new Date(r.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" }) +
                      (r.durationSec ? " · " + fmt(r.durationSec) : "") +
                      (loss != null ? " · −" + loss.toFixed(1) + "%" : "")}
                  </span>
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 4, flexShrink: 0 }}>
                {r.roastLevel ? (
                  <span
                    style={{
                      fontSize: 11,
                      padding: "4px 10px",
                      borderRadius: 999,
                      background: LV?.c || "#E2E7D4",
                      color: LV?.light ? C.ink : C.cream,
                      fontWeight: 600,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {r.roastLevel}
                  </span>
                ) : null}
                <span style={{ fontSize: 10, color: C.rust, letterSpacing: 1 }}>
                  {r.rating ? "★".repeat(r.rating) : ""}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
