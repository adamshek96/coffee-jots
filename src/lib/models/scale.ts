import * as THREE from "three";
import { CLAY, clayMaterial, roundedBox } from "../clay3d";

/**
 * A kitchen scale, for the two moments a roast is a weight.
 *
 * Green in, roasted out — the whole loss figure hangs off two numbers typed
 * into bare fields. This gives them somewhere to land: the pan settles, the
 * readout follows what you typed, and beans pile up on it as the number climbs.
 * It reads the value rather than setting it; the field is still the control.
 */

/**
 * What counts as a full dish. A popper batch is 80–120 g, so scaling the heap
 * against 160 left a normal roast showing only the beans deep in the bottom —
 * invisible over the rim, which read as an empty bowl.
 */
const MAX_G = 120;

interface ScaleBits {
  pan: THREE.Group;
  beans: THREE.Mesh[];
  face: HTMLCanvasElement;
  faceTex: THREE.CanvasTexture;
  unit: string;
  steam: THREE.Mesh[] | null;
  /** How loaded the pan is, 0-1 — steam thins out as the heap does. */
  load: number;
}

/** Redraws the little readout. Kept on the object so tuning can call it. */
function paintFace(bits: ScaleBits, grams: number) {
  const ctx = bits.face.getContext("2d")!;
  ctx.fillStyle = "#191B1F";
  ctx.fillRect(0, 0, 256, 96);
  ctx.fillStyle = "#8FB4D6";
  ctx.font = "bold 58px 'Space Mono', monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(Math.round(grams) + bits.unit, 128, 52);
  bits.faceTex.needsUpdate = true;
}

/**
 * A soft round puff, faded to nothing at the edges.
 *
 * Warm grey, not white. Steam is drawn light when it sits on a dark photo, but
 * these objects sit on cream paper — white vapour on a cream card is invisible,
 * which is exactly how the first attempt came out. Against light ground it has
 * to read a shade darker than the page to be seen at all.
 */
function puffTexture(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, "rgba(118,103,84,0.8)");
  g.addColorStop(0.4, "rgba(118,103,84,0.38)");
  g.addColorStop(1, "rgba(122,108,90,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/**
 * Build a scale. `hot` adds steam, for the roasted weight — beans come off the
 * cooling tray still giving off heat, and that's the difference between this
 * and the one on the way in.
 */
export function buildScale(beanColor = "#8E9B6B", unit = "g", hot = false): THREE.Group {
  const root = new THREE.Group();

  // ---- body ----
  const base = new THREE.Mesh(roundedBox(0.92, 0.15, 0.72, 0.05), clayMaterial(CLAY.olive));
  base.position.y = 0.075;
  root.add(base);

  for (const dx of [-0.36, 0.36]) {
    for (const dz of [-0.27, 0.27]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16), clayMaterial(CLAY.oliveDeep));
      foot.position.set(dx, 0.006, dz);
      root.add(foot);
    }
  }

  // the readout, set into the front lip
  const face = document.createElement("canvas");
  face.width = 256;
  face.height = 96;
  const faceTex = new THREE.CanvasTexture(face);
  faceTex.colorSpace = THREE.SRGBColorSpace;

  const bezel = new THREE.Mesh(roundedBox(0.38, 0.12, 0.02, 0.02), clayMaterial(CLAY.oliveDeep));
  bezel.position.set(0, 0.08, 0.365);
  root.add(bezel);

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.33, 0.095),
    new THREE.MeshStandardMaterial({ map: faceTex, roughness: 0.6, metalness: 0 }),
  );
  screen.position.set(0, 0.08, 0.377);
  root.add(screen);

  // ---- pan: rides on the body and settles as the number climbs ----
  const pan = new THREE.Group();
  const plate = new THREE.Mesh(roundedBox(0.8, 0.045, 0.62, 0.03), clayMaterial(CLAY.cream));
  pan.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 10, 40), clayMaterial(CLAY.hair));
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.16, 1, 0.92);
  rim.position.y = 0.012;
  pan.add(rim);

  /**
   * The bowl. Nobody tips beans straight onto the pan — they go in a dish and
   * you tare it off, so the beans sat loose on the tray was the one part of
   * this that didn't match how weighing actually goes.
   *
   * Turned rather than boxed: a lathed profile gives a real wall thickness and
   * a rim you can see over, which is what makes it read as a vessel with
   * something in it rather than a disc with beans balanced on top.
   */
  const bowlProfile = [
    [0.0, 0.028],
    [0.25, 0.028],
    [0.272, 0.06],
    [0.292, 0.145],
    [0.304, 0.188],
    [0.324, 0.197],
    [0.318, 0.14],
    [0.3, 0.045],
    [0.23, 0.0],
  ].map(([x, y]) => new THREE.Vector2(x, y));
  const bowl = new THREE.Mesh(
    new THREE.LatheGeometry(bowlProfile, 44),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(CLAY.rust),
      roughness: 0.72,
      metalness: 0,
      side: THREE.DoubleSide,
    }),
  );
  bowl.position.y = 0.022;
  pan.add(bowl);

  // A heap that grows with the reading, banked up inside the bowl. All of them
  // are built up front and simply hidden — allocating meshes on every keystroke
  // would stutter.
  const beans: THREE.Mesh[] = [];
  const geo = new THREE.SphereGeometry(0.042, 14, 10);
  const mat = clayMaterial(beanColor, { rough: 0.9 });
  const seed = [
    // Deepest first: a light reading fills the bottom of the dish, a heavy one
    // heaps it to the rim.
    [-0.11, 0.072, 0.03], [0.02, 0.072, -0.1], [0.1, 0.072, 0.07], [-0.04, 0.072, 0.12],
    [0.13, 0.072, -0.06], [-0.14, 0.072, -0.08],
    [-0.17, 0.128, 0.05], [-0.05, 0.128, -0.15], [0.07, 0.128, 0.16], [0.18, 0.128, 0.02],
    [-0.02, 0.128, 0.2], [0.15, 0.128, 0.14], [-0.19, 0.128, -0.1], [0.19, 0.128, 0.09],
    [-0.1, 0.184, 0.02], [0.03, 0.184, -0.12], [0.12, 0.184, 0.06], [-0.03, 0.184, 0.14],
    [0.15, 0.184, -0.05], [-0.16, 0.184, -0.07], [0.0, 0.212, 0.0], [0.08, 0.206, 0.08],
  ];
  seed.forEach(([x, y, z], i) => {
    const b = new THREE.Mesh(geo, mat);
    b.scale.set(1, 0.64, 0.8);
    b.position.set(x, y, z);
    b.rotation.set(0.25, i * 1.7, 0.15);
    pan.add(b);
    beans.push(b);
  });

  pan.position.y = 0.2;
  root.add(pan);

  // ---- steam ----
  let steam: THREE.Mesh[] | null = null;
  if (hot) {
    steam = [];
    const tex = puffTexture();
    for (let i = 0; i < 6; i++) {
      const puff = new THREE.Mesh(
        new THREE.PlaneGeometry(0.44, 0.44),
        new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: 0 }),
      );
      // Spread the cycle so they drift up in a stream rather than in a block.
      puff.userData.phase = i / 6;
      puff.userData.drift = (i % 3) - 1;
      puff.renderOrder = 2;
      root.add(puff);
      steam.push(puff);
    }
  }

  const bits: ScaleBits = { pan, beans, face, faceTex, unit, steam, load: 0 };
  root.userData.bits = bits;
  paintFace(bits, 0);
  return root;
}

/** Point the scale at a reading: pan settles, heap grows, readout follows. */
export function tuneScale(root: THREE.Group, grams: number) {
  const bits = root.userData.bits as ScaleBits | undefined;
  if (!bits) return;
  const g = Math.max(0, Math.min(MAX_G, grams || 0));
  const load = g / MAX_G;
  bits.load = load;

  // The pan gives a little under the weight, but only a little — a scale that
  // visibly sagged would read as broken rather than loaded.
  bits.pan.position.y = 0.2 - load * 0.022;

  const shown = Math.round(load * bits.beans.length);
  bits.beans.forEach((b, i) => (b.visible = i < shown));

  paintFace(bits, g);
}

/**
 * Drift the steam. Each puff rises, swells and fades on its own offset phase,
 * so the stream reads as continuous without any of them being individually
 * followable. Each is turned back against the pivot so it keeps facing you when
 * the scale is turned — steam goes up whichever way the object is pointing.
 */
export function steamScale(root: THREE.Group, tMs: number) {
  const bits = root.userData.bits as ScaleBits | undefined;
  if (!bits?.steam) return;
  const pivot = root.parent;
  const t = tMs / 2600;

  for (const puff of bits.steam) {
    const k = (t + (puff.userData.phase as number)) % 1;
    const drift = puff.userData.drift as number;

    puff.position.set(drift * 0.09 * k + Math.sin(k * 4 + drift) * 0.03, 0.46 + k * 0.4, 0.04);
    puff.scale.setScalar(0.42 + k * 0.7);
    // In quickly, out slowly, and nothing at all on an empty pan.
    const fade = Math.min(1, k * 4.5) * (1 - k);
    (puff.material as THREE.MeshBasicMaterial).opacity = fade * 0.6 * Math.min(1, bits.load * 3);

    // Cancel the parent's rotation so the plane always faces the camera.
    // Negating the parent's Euler angles does NOT invert a rotation — order
    // matters — and the near-edge-on planes it produced were invisible.
    if (pivot) puff.quaternion.copy(pivot.quaternion).invert();
  }
}
