import * as THREE from "three";
import { CLAY, clayMaterial, profileSolid, roundedBox } from "../clay3d";

/**
 * The popper, built in code.
 *
 * Modelled from the machine rather than from a product render: a tapered slab
 * of a body, the chaff chamber overhanging the front of it, and the hopper
 * sitting over the top. It is deliberately not a likeness. The proportions are
 * the real ones so it's recognisably the thing on the counter, but it's made of
 * the same clay as the bean bag and lit the same way, and it carries no maker's
 * wordmark — this is Jots' object, not a picture of someone's product.
 *
 * Every part a roaster actually touches is named, so the UI can ask which one
 * was tapped and answer with what that control does.
 */

export type PopperPart = "hopper" | "chamber" | "dialFan" | "dialHeat" | "dialTimer" | "display" | "body";

/** A dot grid, for the perforated face of the chaff chamber. */
function perforated(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = c.height = 128;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#2A251E";
  ctx.fillRect(0, 0, 128, 128);
  ctx.fillStyle = "#17140F";
  for (let y = 8; y < 122; y += 11) {
    for (let x = 8; x < 122; x += 11) {
      ctx.beginPath();
      ctx.arc(x, y, 3.1, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

/** The little readout, lit the way the live screen's flip clock is. */
function readout(): THREE.Texture {
  const c = document.createElement("canvas");
  c.width = 128;
  c.height = 64;
  const ctx = c.getContext("2d")!;
  ctx.fillStyle = "#191B1F";
  ctx.fillRect(0, 0, 128, 64);
  ctx.fillStyle = "#8FB4D6";
  ctx.font = "bold 40px monospace";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText("0:00", 64, 34);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const mark = (o: THREE.Object3D, part: PopperPart) => {
  o.userData.part = part;
  o.traverse((c) => (c.userData.part = part));
  return o;
};

/** A control knob: dark cylinder on a pale collar, the way the panel reads. */
function knob(r: number): THREE.Group {
  const g = new THREE.Group();

  const collar = new THREE.Mesh(
    new THREE.CylinderGeometry(r * 1.5, r * 1.55, 0.012, 28),
    clayMaterial(CLAY.panelEdge),
  );
  collar.rotation.x = Math.PI / 2;
  g.add(collar);

  const body = new THREE.Mesh(new THREE.CylinderGeometry(r, r * 0.92, r * 1.5, 28), clayMaterial(CLAY.knob));
  body.rotation.x = Math.PI / 2;
  body.position.z = r * 0.75;
  g.add(body);

  // the pointer notch, so you can tell which way it's turned
  const notch = new THREE.Mesh(
    new THREE.BoxGeometry(r * 0.22, r * 0.72, r * 0.2),
    clayMaterial(CLAY.panel, { rough: 0.8 }),
  );
  notch.position.set(0, r * 0.42, r * 1.45);
  g.add(notch);

  return g;
}

export function buildPopper(): THREE.Group {
  const root = new THREE.Group();

  // ---- body: a tapered slab, front face leaning back as it rises ----
  const W = 0.6;
  const profile: [number, number][] = [
    [-0.30, 0.03],
    [-0.26, 0.74],
    [-0.23, 0.83],
    [0.14, 0.86],
    [0.29, 0.70],
    [0.31, 0.05],
  ];
  const body = new THREE.Mesh(profileSolid(profile, W, 0.022), clayMaterial(CLAY.machine));
  body.rotation.y = Math.PI / 2;
  body.position.y = 0.445;
  root.add(mark(body, "body"));

  // a plinth, so it sits on the page rather than floating
  const plinth = new THREE.Mesh(roundedBox(W + 0.03, 0.06, 0.66, 0.022), clayMaterial(CLAY.machineDark));
  plinth.position.y = 0.03;
  root.add(mark(plinth, "body"));

  for (const [dx, dz] of [
    [-0.21, -0.24],
    [0.21, -0.24],
    [-0.21, 0.24],
    [0.21, 0.24],
  ]) {
    const foot = new THREE.Mesh(new THREE.CylinderGeometry(0.026, 0.03, 0.03, 16), clayMaterial(CLAY.machineDark));
    foot.position.set(dx, 0.008, dz);
    root.add(foot);
  }

  // ---- chaff chamber: overhangs the front, perforated face ----
  const chamber = new THREE.Group();
  const shell = new THREE.Mesh(roundedBox(0.62, 0.25, 0.5, 0.035), clayMaterial(CLAY.machineDark));
  chamber.add(shell);

  const grid = new THREE.Mesh(
    new THREE.PlaneGeometry(0.42, 0.15),
    new THREE.MeshStandardMaterial({ map: perforated(), roughness: 0.95, metalness: 0 }),
  );
  grid.position.set(0, 0.0, 0.252);
  chamber.add(grid);

  // the lip you tip the beans out over
  const lip = new THREE.Mesh(roundedBox(0.26, 0.05, 0.1, 0.02), clayMaterial(CLAY.machineDark));
  lip.position.set(0, -0.125, 0.265);
  chamber.add(lip);

  chamber.position.set(0, 0.93, 0.13);
  root.add(mark(chamber, "chamber"));

  // ---- hopper: the smoked dome over the top ----
  const hopper = new THREE.Group();
  const dome = new THREE.Mesh(
    roundedBox(0.52, 0.38, 0.46, 0.15, 5),
    new THREE.MeshStandardMaterial({
      color: new THREE.Color(CLAY.smoke),
      roughness: 0.45,
      metalness: 0,
      transparent: true,
      opacity: 0.5,
    }),
  );
  hopper.add(dome);

  // the stirrer arm, just visible through the smoke
  const arm = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.012, 0.014), clayMaterial(CLAY.steel));
  arm.position.y = -0.17;
  hopper.add(arm);

  // A charge of green, pooled in the bottom. Without it the hopper is an empty
  // tinted box and the translucency has nothing to be translucent about.
  const beanGeo = new THREE.SphereGeometry(0.038, 14, 10);
  const beanMat = clayMaterial("#8E9B6B", { rough: 0.9 });
  for (const [bx, by, bz, r] of [
    [-0.13, -0.13, 0.05, 0.4],
    [-0.04, -0.15, -0.07, 1.1],
    [0.06, -0.13, 0.08, 2.0],
    [0.14, -0.15, -0.04, 0.7],
    [-0.08, -0.09, -0.01, 2.6],
    [0.03, -0.08, 0.06, 1.5],
    [0.11, -0.11, 0.11, 0.2],
  ]) {
    const bean = new THREE.Mesh(beanGeo, beanMat);
    bean.scale.set(1, 0.66, 0.82);
    bean.position.set(bx, by, bz);
    bean.rotation.set(0.3, r, 0.2);
    hopper.add(bean);
  }

  hopper.position.set(0, 1.26, 0.1);
  hopper.rotation.x = -0.06;
  root.add(mark(hopper, "hopper"));

  // ---- control panel, tilted to sit flat on the leaning front face ----
  const panel = new THREE.Group();
  const lean = Math.atan2(0.04, 0.71);

  const plate = new THREE.Mesh(roundedBox(0.44, 0.3, 0.04, 0.07), clayMaterial(CLAY.panel));
  panel.add(plate);

  const fan = knob(0.045);
  fan.position.set(-0.135, 0.05, 0.022);
  panel.add(mark(fan, "dialFan"));

  const heat = knob(0.045);
  heat.position.set(0.135, 0.05, 0.022);
  heat.rotation.z = -0.7;
  panel.add(mark(heat, "dialHeat"));

  const timer = knob(0.04);
  timer.position.set(0, -0.08, 0.022);
  panel.add(mark(timer, "dialTimer"));

  const screen = new THREE.Mesh(
    new THREE.PlaneGeometry(0.11, 0.055),
    new THREE.MeshStandardMaterial({ map: readout(), roughness: 0.7, metalness: 0 }),
  );
  screen.position.set(0, 0.05, 0.023);
  panel.add(mark(screen, "display"));

  for (const [i, c] of [CLAY.olive, "#3B4A6B", CLAY.rust].entries()) {
    const dot = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.009, 0.006, 12), clayMaterial(c, { rough: 0.7 }));
    dot.rotation.x = Math.PI / 2;
    dot.position.set(-0.03 + i * 0.03, 0.115, 0.022);
    panel.add(dot);
  }

  panel.position.set(0, 0.34, 0.30);
  panel.rotation.x = -lean;
  root.add(panel);

  return root;
}

/** What each part of the machine is for, in the app's own words. */
export const POPPER_PARTS: Record<PopperPart, { title: string; body: string }> = {
  hopper: {
    title: "Hopper",
    body: "Where the beans ride. Charge drops them in and the clock starts; you watch the colour turn through the smoke.",
  },
  chamber: {
    title: "Chaff chamber",
    body: "Catches the skins as they blow off through first crack. Empty it between roasts or it starts to smell of the last one.",
  },
  dialFan: { title: "Fan", body: "Airflow. Logged at every milestone, so a roast that stalled can be read back against one that didn't." },
  dialHeat: { title: "Heat dial", body: "The main lever. Every milestone and heat mark records where this was set." },
  dialTimer: { title: "Timer", body: "The machine's own clock. Jots keeps its own from Charge, so this one is just a backstop." },
  display: { title: "Readout", body: "The machine's timer. The one that matters is on your phone, running from the moment the beans went in." },
  body: { title: "Popper", body: "Your roaster. Tap the hopper, the chamber or any dial to see what Jots records from it." },
};
