/**
 * Haptics, written as rhythm.
 *
 * Two engines, because the platforms are nowhere near equal:
 *
 *  - `navigator.vibrate` (Chrome and Firefox on Android) takes a real pattern,
 *    with a duration per buzz.
 *  - WebKit has no vibrate API at all — and on iPhone that means every browser,
 *    Safari and Chrome alike, since iOS puts them all on WebKit. The only lever
 *    is a side effect: Safari 17.4+ plays a system haptic whenever an
 *    `<input type="checkbox" switch>` toggles, so we keep one off-screen and
 *    click it.
 *
 * That second engine has exactly one tap at one fixed strength. So the
 * vocabulary below is spelled in counts and gaps rather than intensities —
 * the one dimension both engines can speak. Android also varies duration
 * because it can, but no meaning rests on being able to feel that.
 *
 * The scarcity is the reason this file is a closed vocabulary rather than a
 * `buzz(ms)` anyone can call: with a single tap to spend on iPhone, every
 * extra place that spends it makes the milestone tap mean less.
 */

/** Cumulative offsets in ms (`at`) and an Android vibrate pattern (`buzz`). */
const PATTERNS = {
  /** An observation noted. Android-only: during first crack you tap "rolling
      crackle" over and over, and on iPhone those would be indistinguishable
      from milestone confirmations at the moment you most need to trust one. */
  tick: { at: [], buzz: [12] },
  /** A milestone logged. The workhorse, and deliberately unvarying — sameness
      is what lets it become muscle memory. */
  mark: { at: [0], buzz: [28] },
  /** Beans in. Everything downstream is measured from this instant, so it
      lands heavier than a plain confirmation. */
  charge: { at: [0, 70], buzz: [22, 60, 34] },
  /** First crack: two tight taps, shaped like the sound. */
  crack: { at: [0, 45], buzz: [16, 38, 16] },
  /** Drop. Three, slowing — the heaviest thing here, because it can't be
      taken back. */
  drop: { at: [0, 60, 150], buzz: [42, 55, 30, 70, 20] },
  /** The batch you're chasing reached this marker. Spaced wide so it reads as
      someone else's roast rather than a confirmation of your own. */
  ghost: { at: [0, 190], buzz: [18, 190, 18] },
  /** A new country in the passport, timed to the stamp landing. */
  stamp: { at: [0, 30, 60], buzz: [55] },
  /** Cooling finished while you were off grinding. */
  done: { at: [0, 70, 180], buzz: [18, 70, 28, 105, 44] },
} as const;

export type Haptic = keyof typeof PATTERNS;

let enabled = true;
let node: HTMLLabelElement | null = null;
let timers: ReturnType<typeof setTimeout>[] = [];

/** Does this browser have the switch control whose toggle WebKit taps on? */
const hasSwitch = (): boolean =>
  typeof document !== "undefined" && "switch" in document.createElement("input");

const hasVibrate = (): boolean =>
  typeof navigator !== "undefined" && typeof navigator.vibrate === "function";

/**
 * The off-screen switch. It has to stay in the layout tree — `display: none`
 * removes it and the toggle stops producing anything — so it hides by being a
 * transparent, untouchable pixel instead.
 */
function switchNode(): HTMLLabelElement | null {
  if (node || typeof document === "undefined") return node;
  const id = "cj-haptic-switch";
  const input = document.createElement("input");
  input.type = "checkbox";
  input.setAttribute("switch", "");
  input.id = id;
  input.tabIndex = -1;
  const label = document.createElement("label");
  label.htmlFor = id;
  const hide = "position:fixed;top:0;left:0;width:1px;height:1px;opacity:0;pointer-events:none;";
  input.style.cssText = hide;
  label.style.cssText = hide;
  input.setAttribute("aria-hidden", "true");
  label.setAttribute("aria-hidden", "true");
  document.body.append(input, label);
  node = label;
  return node;
}

const tapOnce = (): void => void switchNode()?.click();

/** Play one of the named patterns. Silent where the platform can't. */
export function haptic(name: Haptic): void {
  if (!enabled) return;
  for (const t of timers) clearTimeout(t);
  timers = [];
  const p = PATTERNS[name];

  if (hasVibrate()) {
    try {
      navigator.vibrate([...p.buzz]);
    } catch {
      /* refused — nothing to fall back to */
    }
    return;
  }

  if (!hasSwitch() || p.at.length === 0) return;
  // The first tap goes out synchronously: WebKit is far more willing to
  // produce one inside the gesture that asked for it than off a timer.
  tapOnce();
  for (let i = 1; i < p.at.length; i++) timers.push(setTimeout(tapOnce, p.at[i]));
}

export function setHapticsEnabled(on: boolean): void {
  enabled = on;
  // Build the node while we're likely still inside a user gesture.
  if (on) switchNode();
}

/** Whether this browser can produce anything at all. */
export const hapticsAvailable = (): boolean => hasVibrate() || hasSwitch();
