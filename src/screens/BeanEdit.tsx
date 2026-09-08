import { EditableWheel } from "../components/FlavorWheel";
import { Chip, DangerAction, S, ScreenHeader } from "../components/ui";
import { C, PROCESSES } from "../lib/constants";
import { useStore } from "../store";
import type { Bean } from "../types";

export function BeanEdit() {
  const { st, set, saveBeanDraft, deleteBeanDraft } = useStore();
  const dr = st.beanDraft;
  if (!dr) return null;

  const patch = (p: Partial<Bean>) => set({ beanDraft: { ...dr, ...p } });
  const flavors = dr.flavors || {};
  const canSave = dr.name.trim().length > 0;
  const roastCount = dr.id ? st.roasts.filter((r) => r.beanId === dr.id || r.beanName === dr.name).length : 0;


  return (
    <div>
      <ScreenHeader
        title={dr.id ? "Edit bean" : "New bean"}
        onBack={() => set({ beanDraft: null, screen: "beans" })}
      />

      <div style={S.card}>
        <label style={S.fieldLabel}>Name</label>
        <input
          value={dr.name}
          onChange={(e) => patch({ name: e.target.value })}
          placeholder="e.g. Huila Pink Bourbon"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Origin</label>
        <input
          value={dr.origin || ""}
          onChange={(e) => patch({ origin: e.target.value })}
          placeholder="Country — earns a passport stamp"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Region / farm</label>
        <input
          value={dr.region || ""}
          onChange={(e) => patch({ region: e.target.value })}
          placeholder="e.g. Huila, Finca El Mirador"
          style={S.input}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Description</label>
        <textarea
          value={dr.desc || ""}
          onChange={(e) => patch({ desc: e.target.value })}
          rows={3}
          placeholder="How it behaves, what it tastes like…"
          style={{ ...S.input, resize: "vertical" }}
        />
        <label style={{ ...S.fieldLabel, margin: "12px 0 6px" }}>Process</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {PROCESSES.map((p) => (
            <Chip
              key={p}
              label={p}
              on={dr.process === p}
              onClick={() => patch({ process: dr.process === p ? "" : p })}
            />
          ))}
        </div>
      </div>

      {/* flavor wheel — a property of the bean, not of one roast */}
      <div style={{ ...S.card, marginTop: 12 }}>
        <div style={S.sectionLabel}>Flavor wheel</div>
        <div style={{ fontSize: 12, color: C.muted, marginTop: 4 }}>
          Tap a family to set intensity — 0 to 5, cycles round.
        </div>
        <EditableWheel flavors={flavors} onChange={(next) => patch({ flavors: next })} />
      </div>

      <button
        onClick={saveBeanDraft}
        disabled={!canSave}
        className="pressY"
        style={{ ...S.primaryBtn, marginTop: 14, opacity: canSave ? 1 : 0.4 }}
      >
        Save bean
      </button>

      {dr.id ? (
        <DangerAction
          label="Delete this bean profile"
          message={
            roastCount
              ? `Delete the "${dr.name}" profile? Its ${roastCount} logged roast${roastCount === 1 ? "" : "s"} stay in your journal.`
              : `Delete the "${dr.name}" profile?`
          }
          confirmLabel="Delete profile"
          onConfirm={deleteBeanDraft}
        />
      ) : null}
    </div>
  );
}
