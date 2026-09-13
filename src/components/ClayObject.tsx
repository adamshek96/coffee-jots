import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { createStage } from "../lib/clay3d";

/**
 * A clay object you can turn over in your hand.
 *
 * The scene only draws when something has changed — a drag, a tap, the intro.
 * A roast runs with the screen locked awake for fifteen minutes, so an idle
 * render loop spinning at 60fps in the corner of that screen would be a real
 * cost for no gain. Idle here is genuinely idle: zero frames.
 */
export function ClayObject({
  build,
  tune,
  v = 0,
  animate,
  reach = 1.5,
  lift = 0,
  height = 220,
  spin = -0.55,
  tilt = 0.12,
  shadow,
  inline = false,
  label,
  onPartTap,
}: {
  /** Builds the object. Called once on mount. */
  build: () => THREE.Group;
  /** Re-shapes the built object when `v` changes — a scale reading, say. */
  tune?: (root: THREE.Group, v: number) => void;
  v?: number;
  /**
   * Called every frame when the object has something genuinely moving in it,
   * like steam. Supplying this opts out of render-on-demand, so only pass it
   * where continuous motion is the point — never on the live roast screen,
   * which runs for fifteen minutes with the display forced awake.
   */
  animate?: (root: THREE.Group, tMs: number) => void;
  reach?: number;
  lift?: number;
  height?: number;
  /** Resting rotation, radians. The default is a three-quarter view. */
  spin?: number;
  tilt?: number;
  shadow?: [number, number] | 0;
  /**
   * Sitting inline in a scrolling form. Vertical drags are given back to the
   * page so a finger starting on the object still scrolls past it; turning it
   * left and right still works. Without this an object in the middle of a form
   * is a trap on a phone.
   */
  inline?: boolean;
  label: string;
  onPartTap?: (part: string) => void;
}) {
  const host = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  /** Held so a value change can reshape the object without rebuilding it. */
  const live = useRef<{ root: THREE.Group; draw: () => void } | null>(null);
  const tuneRef = useRef(tune);
  tuneRef.current = tune;
  const animRef = useRef(animate);
  animRef.current = animate;
  // Kept in refs: the render loop reads these every frame and must not restart.
  const cb = useRef(onPartTap);
  cb.current = onPartTap;

  useEffect(() => {
    const el = canvas.current;
    const box = host.current;
    if (!el || !box) return;

    let stage: ReturnType<typeof createStage>;
    try {
      stage = createStage(el, { reach, lift, shadow });
    } catch {
      // No WebGL — the surrounding UI still works, this just doesn't draw.
      setFailed(true);
      return;
    }

    const obj = build();
    stage.pivot.add(obj);
    live.current = { root: obj, draw: stage.render };
    tuneRef.current?.(obj, v);

    const calm = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const rest = { y: spin, x: tilt };
    stage.pivot.rotation.set(rest.x, calm ? rest.y : rest.y - 0.85, 0);
    const scale0 = calm ? 1 : 0.86;
    stage.pivot.scale.setScalar(scale0);

    let raf = 0;
    let vel = 0;
    let intro = calm ? 1 : 0;
    let dragging = false;

    const frame = () => {
      raf = 0;
      // Motion that never settles keeps the loop alive; everything else lets it
      // stop. Reduced-motion users get the object, just held still.
      let more = !calm && !!animRef.current;
      if (more) animRef.current!(obj, performance.now());

      if (intro < 1) {
        intro = Math.min(1, intro + 0.055);
        // ease-out back, so it settles rather than stopping dead
        const e = 1 - Math.pow(1 - intro, 3);
        stage.pivot.rotation.y = rest.y - 0.85 * (1 - e);
        stage.pivot.scale.setScalar(scale0 + (1 - scale0) * e);
        more = true;
      }

      if (!dragging && Math.abs(vel) > 0.0004) {
        stage.pivot.rotation.y += vel;
        vel *= 0.94;
        more = true;
      }

      stage.render();
      if (more) raf = requestAnimationFrame(frame);
    };
    const kick = () => {
      if (!raf) raf = requestAnimationFrame(frame);
    };
    kick();

    const ro = new ResizeObserver(() => {
      stage.resize(box.clientWidth, box.clientHeight);
    });
    ro.observe(box);
    stage.resize(box.clientWidth, box.clientHeight);

    // ---- pointer: drag to turn, tap to ask what a part is ----
    let px = 0;
    let py = 0;
    let moved = 0;

    const down = (e: PointerEvent) => {
      dragging = true;
      moved = 0;
      vel = 0;
      px = e.clientX;
      py = e.clientY;
      el.setPointerCapture(e.pointerId);
    };

    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const dx = e.clientX - px;
      const dy = e.clientY - py;
      px = e.clientX;
      py = e.clientY;
      moved += Math.abs(dx) + Math.abs(dy);
      vel = dx * 0.006;
      stage.pivot.rotation.y += vel;
      // Let it lean, but never far enough to look at its own underside. Inline
      // objects don't lean at all — that gesture belongs to the page.
      if (!inline)
        stage.pivot.rotation.x = Math.max(-0.42, Math.min(0.58, stage.pivot.rotation.x + dy * 0.005));
      stage.render();
    };

    const up = (e: PointerEvent) => {
      if (!dragging) return;
      dragging = false;
      el.releasePointerCapture(e.pointerId);
      // A tap, not a drag: ask the scene what's under the finger.
      if (moved < 6 && cb.current) {
        const r = el.getBoundingClientRect();
        const pt = new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        );
        const ray = new THREE.Raycaster();
        ray.setFromCamera(pt, stage.camera);
        const hit = ray.intersectObject(stage.pivot, true)[0];
        const part = hit?.object.userData?.part;
        if (part) cb.current(part as string);
      } else kick();
    };

    const key = (e: KeyboardEvent) => {
      if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
      e.preventDefault();
      stage.pivot.rotation.y += e.key === "ArrowLeft" ? -0.22 : 0.22;
      stage.render();
    };

    el.addEventListener("pointerdown", down);
    el.addEventListener("pointermove", move);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("keydown", key);

    // Stop drawing entirely when the roast screen is backgrounded.
    const vis = () => {
      if (document.visibilityState === "visible") stage.render();
    };
    document.addEventListener("visibilitychange", vis);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      ro.disconnect();
      el.removeEventListener("pointerdown", down);
      el.removeEventListener("pointermove", move);
      el.removeEventListener("pointerup", up);
      el.removeEventListener("pointercancel", up);
      el.removeEventListener("keydown", key);
      document.removeEventListener("visibilitychange", vis);
      live.current = null;
      stage.dispose();
    };
    // Built once: rebuilding the scene on every prop tick would drop the
    // rotation the user had set.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!live.current || !tuneRef.current) return;
    tuneRef.current(live.current.root, v);
    live.current.draw();
  }, [v]);

  if (failed) return null;

  return (
    <div ref={host} style={{ width: "100%", height, touchAction: inline ? "pan-y" : "none" }}>
      <canvas
        ref={canvas}
        tabIndex={0}
        role="img"
        aria-label={label}
        style={{ width: "100%", height: "100%", display: "block", outline: "none", cursor: "grab" }}
      />
    </div>
  );
}
