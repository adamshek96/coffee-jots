import * as THREE from "three";

/**
 * The clay look, in three dimensions.
 *
 * `objects.tsx` renders the small clay pieces as SVG lit from the upper left
 * over a soft contact shadow. Anything built here has to belong to that same
 * set, so the rig below is that drawing translated into a scene: one key light
 * up and to the left, warm bounce from the paper underneath, no specular
 * highlight anywhere. Glossy would read as a product render; these are objects
 * made of matte clay sitting on a page.
 *
 * Nothing here loads. Geometry is built in code and materials are flat colours,
 * so an installed journal keeps working with no network at all.
 */

/** Warm charcoal of the machine bodies — the same tone the live screen uses. */
export const CLAY = {
  machine: "#4E4639",
  machineDark: "#3A332A",
  panel: "#EFEBE2",
  panelEdge: "#C9C2B2",
  knob: "#241D16",
  knobRim: "#8A8073",
  smoke: "#C8AC77",
  kraft: "#C9A574",
  bean: "#7A4626",
  brew: "#7A4C31",
  steel: "#B7AF9F",
  rust: "#A9613A",
  olive: "#575618",
  oliveDeep: "#43420F",
  cream: "#F4F1E9",
  hair: "#B7AF9F",
};

/** Matte through and through — clay takes no shine. */
export function clayMaterial(color: string, opts: { rough?: number; opacity?: number } = {}) {
  const m = new THREE.MeshStandardMaterial({
    color: new THREE.Color(color),
    roughness: opts.rough ?? 0.96,
    metalness: 0,
  });
  if (opts.opacity != null && opts.opacity < 1) {
    m.transparent = true;
    m.opacity = opts.opacity;
  }
  return m;
}

/**
 * A box with its edges taken off. Hard edges are what make code-built geometry
 * look code-built; clay has no sharp corners, so nothing here is allowed one.
 */
export function roundedBox(w: number, h: number, d: number, r = 0.02, seg = 3): THREE.BufferGeometry {
  const radius = Math.min(r, w / 2, h / 2, d / 2);
  const shape = new THREE.Shape();
  const x = w / 2 - radius;
  const y = h / 2 - radius;
  shape.moveTo(-x, -y - radius);
  shape.lineTo(x, -y - radius);
  shape.quadraticCurveTo(x + radius, -y - radius, x + radius, -y);
  shape.lineTo(x + radius, y);
  shape.quadraticCurveTo(x + radius, y + radius, x, y + radius);
  shape.lineTo(-x, y + radius);
  shape.quadraticCurveTo(-x - radius, y + radius, -x - radius, y);
  shape.lineTo(-x - radius, -y);
  shape.quadraticCurveTo(-x - radius, -y - radius, -x, -y - radius);

  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, d - radius * 2),
    bevelEnabled: true,
    bevelThickness: radius,
    bevelSize: radius,
    bevelSegments: seg,
    curveSegments: seg * 3,
  });
  g.center();
  return g;
}

/** Extrude a drawn side profile into a solid, edges softened the same way. */
export function profileSolid(pts: [number, number][], width: number, bevel = 0.018): THREE.BufferGeometry {
  const shape = new THREE.Shape();
  pts.forEach(([x, y], i) => (i ? shape.lineTo(x, y) : shape.moveTo(x, y)));
  shape.closePath();
  const g = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, width - bevel * 2),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: 3,
    curveSegments: 12,
  });
  g.center();
  return g;
}

/**
 * The contact shadow, drawn rather than cast. A blurred ellipse under the
 * object is exactly what the SVG pieces use, it costs no shadow map, and it
 * keeps the objects readable on a light paper background where a real shadow
 * would go muddy.
 */
function contactShadow(w: number, d: number): THREE.Mesh {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(74,52,35,0.46)");
  g.addColorStop(0.55, "rgba(74,52,35,0.16)");
  g.addColorStop(1, "rgba(74,52,35,0)");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 128, 128);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(w, d),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.renderOrder = -1;
  return mesh;
}

export interface ClayStageOpts {
  /** Radius of the object, used to frame the camera. */
  reach?: number;
  /** Width/depth of the contact shadow; 0 turns it off. */
  shadow?: [number, number] | 0;
  /** Vertical framing nudge — positive lifts the object in frame. */
  lift?: number;
}

export interface ClayStage {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  /** Everything the user can spin. Add object parts here. */
  pivot: THREE.Group;
  render: () => void;
  resize: (w: number, h: number) => void;
  dispose: () => void;
}

/**
 * Build a stage on a canvas. One WebGL context per mounted object: this app
 * shows one screen at a time and at most a couple of objects on it, so the
 * context budget is never in play, and sharing a renderer would cost a blit
 * per frame for nothing.
 */
export function createStage(canvas: HTMLCanvasElement, opts: ClayStageOpts = {}): ClayStage {
  const reach = opts.reach ?? 1;

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.06;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(28, 1, 0.1, 60);
  camera.position.set(0, reach * 0.14, reach * 2.62);
  camera.lookAt(0, 0, 0);

  // Sky is the paper, ground is the warm shadow it bounces back.
  const hemi = new THREE.HemisphereLight(0xfdf8ee, 0x6b5540, 1.05);
  scene.add(hemi);

  // The key, up and to the left, matching every SVG piece in the set.
  const key = new THREE.DirectionalLight(0xfff4e2, 2.1);
  key.position.set(-2.6, 3.4, 2.8);
  scene.add(key);

  // Just enough from the right to keep the dark side from going flat.
  const fill = new THREE.DirectionalLight(0xdfe6f0, 0.5);
  fill.position.set(3.0, 0.6, 1.4);
  scene.add(fill);

  const root = new THREE.Group();
  scene.add(root);

  const pivot = new THREE.Group();
  pivot.position.y = -(opts.lift ?? 0);
  root.add(pivot);

  if (opts.shadow !== 0) {
    const [sw, sd] = opts.shadow ?? [reach * 2.4, reach * 2.4];
    const sh = contactShadow(sw, sd);
    sh.position.y = -(opts.lift ?? 0);
    root.add(sh);
  }

  const render = () => renderer.render(scene, camera);

  const resize = (w: number, h: number) => {
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    render();
  };

  const dispose = () => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.geometry) m.geometry.dispose();
      const mat = m.material as THREE.Material | THREE.Material[] | undefined;
      if (Array.isArray(mat)) mat.forEach((x) => x.dispose());
      else if (mat) mat.dispose();
    });
    renderer.dispose();
  };

  return { scene, camera, renderer, pivot, render, resize, dispose };
}
