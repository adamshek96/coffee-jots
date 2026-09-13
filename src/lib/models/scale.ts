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

const MAX_G = 160;

interface ScaleBits {
  pan: THREE.Group;
  beans: THREE.Mesh[];
  face: HTMLCanvasElement;
  faceTex: THREE.CanvasTexture;
  unit: string;
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

export function buildScale(beanColor = "#8E9B6B", unit = "g"): THREE.Group {
  const root = new THREE.Group();

  // ---- body ----
  const base = new THREE.Mesh(roundedBox(0.92, 0.15, 0.72, 0.05), clayMaterial(CLAY.kraft));
  base.position.y = 0.075;
  root.add(base);

  for (const dx of [-0.36, 0.36]) {
    for (const dz of [-0.27, 0.27]) {
      const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.04, 0.02, 16), clayMaterial(CLAY.machineDark));
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

  const bezel = new THREE.Mesh(roundedBox(0.38, 0.12, 0.02, 0.02), clayMaterial(CLAY.machineDark));
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
  const plate = new THREE.Mesh(roundedBox(0.8, 0.045, 0.62, 0.03), clayMaterial("#D3CCBC"));
  pan.add(plate);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.33, 0.022, 10, 40), clayMaterial("#A79E8C"));
  rim.rotation.x = Math.PI / 2;
  rim.scale.set(1.16, 1, 0.92);
  rim.position.y = 0.012;
  pan.add(rim);

  // A heap that grows with the reading. All of them are built up front and
  // simply hidden — allocating meshes on every keystroke would stutter.
  const beans: THREE.Mesh[] = [];
  const geo = new THREE.SphereGeometry(0.045, 14, 10);
  const mat = clayMaterial(beanColor, { rough: 0.9 });
  const seed = [
    [-0.2, 0.06, -0.12], [-0.09, 0.05, 0.08], [0.04, 0.06, -0.05], [0.16, 0.05, 0.11],
    [0.24, 0.06, -0.14], [-0.26, 0.05, 0.09], [-0.02, 0.05, -0.19], [0.11, 0.06, 0.02],
    [-0.15, 0.11, -0.02], [0.02, 0.12, 0.09], [0.15, 0.11, -0.08], [-0.06, 0.1, 0.18],
    [-0.05, 0.17, 0.03], [0.08, 0.16, -0.13], [0.2, 0.1, 0.16], [-0.22, 0.1, 0.2],
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

  const bits: ScaleBits = { pan, beans, face, faceTex, unit };
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

  // The pan gives a little under the weight, but only a little — a scale that
  // visibly sagged would read as broken rather than loaded.
  bits.pan.position.y = 0.2 - load * 0.022;

  const shown = Math.round(load * bits.beans.length);
  bits.beans.forEach((b, i) => (b.visible = i < shown));

  paintFace(bits, g);
}
