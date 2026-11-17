import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { buildPrint } from "./prints";
import type { Item, Kind } from "./types";

export type StationName = Kind | "diary";

const ISLAND_R = 7;
const v3 = (x: number, y: number, z: number) => new THREE.Vector3(x, y, z);
const mat = (color: string, extra: THREE.MeshStandardMaterialParameters = {}) =>
  new THREE.MeshStandardMaterial({ color, roughness: 0.8, ...extra });

function mesh(geo: THREE.BufferGeometry, m: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
  const o = new THREE.Mesh(geo, m);
  o.position.set(x, y, z);
  o.castShadow = true;
  o.receiveShadow = true;
  parent.add(o);
  return o;
}

// ---------------------------------------------------------------------------
// Pip the bird
// ---------------------------------------------------------------------------
class Bird {
  root = new THREE.Group();
  body = new THREE.Group();
  head = new THREE.Group();
  wingL: THREE.Mesh;
  wingR: THREE.Mesh;
  legL: THREE.Mesh;
  legR: THREE.Mesh;
  carry = new THREE.Group();

  target: THREE.Vector3 | null = null;
  onArrive: (() => void) | null = null;
  mode: "idle" | "walk" | "work" | "write" | "dance" = "idle";
  phase = 0;
  heading = 0;

  constructor() {
    const yellow = mat("#f6b73c", { roughness: 0.6 });
    const belly = mat("#fde7b0", { roughness: 0.7 });
    const orange = mat("#e8743b", { roughness: 0.5 });
    const black = mat("#1c1c1c", { roughness: 0.3 });

    this.root.add(this.body);
    const torso = mesh(new THREE.SphereGeometry(0.42, 24, 18), yellow, this.body, 0, 0.62, 0);
    torso.scale.set(1, 0.95, 1.1);
    mesh(new THREE.SphereGeometry(0.3, 18, 14), belly, this.body, 0, 0.55, 0.2).scale.set(1, 1, 0.7);
    const tail = mesh(new THREE.ConeGeometry(0.15, 0.4, 8), yellow, this.body, 0, 0.75, -0.45);
    tail.rotation.x = -Math.PI / 2.6;

    this.head.position.set(0, 1.08, 0.12);
    this.body.add(this.head);
    mesh(new THREE.SphereGeometry(0.3, 22, 16), yellow, this.head);
    const beak = mesh(new THREE.ConeGeometry(0.08, 0.24, 10), orange, this.head, 0, -0.02, 0.33);
    beak.rotation.x = Math.PI / 2;
    for (const s of [-1, 1]) {
      mesh(new THREE.SphereGeometry(0.075, 12, 10), mat("#fff"), this.head, s * 0.13, 0.07, 0.23);
      mesh(new THREE.SphereGeometry(0.045, 10, 8), black, this.head, s * 0.14, 0.08, 0.29);
      mesh(new THREE.SphereGeometry(0.05, 10, 8), mat("#f59f9f"), this.head, s * 0.2, -0.06, 0.2).scale.set(1, 0.6, 0.4);
    }
    const tuft = mesh(new THREE.ConeGeometry(0.05, 0.18, 6), orange, this.head, 0, 0.32, 0);
    tuft.rotation.z = 0.3;

    this.wingL = mesh(new THREE.SphereGeometry(0.25, 14, 10), yellow, this.body, 0.4, 0.68, -0.02);
    this.wingR = mesh(new THREE.SphereGeometry(0.25, 14, 10), yellow, this.body, -0.4, 0.68, -0.02);
    this.wingL.scale.set(0.35, 0.8, 1.1);
    this.wingR.scale.set(0.35, 0.8, 1.1);
    this.wingL.geometry.translate(0, -0.1, 0);

    this.legL = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), orange, this.root, 0.14, 0.14, 0.02);
    this.legR = mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.28, 6), orange, this.root, -0.14, 0.14, 0.02);
    for (const leg of [this.legL, this.legR]) mesh(new THREE.BoxGeometry(0.14, 0.03, 0.18), orange, leg, 0, -0.14, 0.05);

    this.carry.position.set(0, 1.45, 0);
    this.root.add(this.carry);
    this.root.scale.setScalar(0.85);
  }

  walkTo(p: THREE.Vector3): Promise<void> {
    this.target = p.clone();
    this.mode = "walk";
    return new Promise((r) => (this.onArrive = r));
  }

  faceTowards(p: THREE.Vector3) {
    this.heading = Math.atan2(p.x - this.root.position.x, p.z - this.root.position.z);
  }

  update(dt: number) {
    this.phase += dt;
    const t = this.phase;
    const pos = this.root.position;
    let bob = 0;
    let wing = 0.1 * Math.sin(t * 2);
    let headPitch = 0;

    if (this.mode === "walk" && this.target) {
      const d = this.target.clone().sub(pos);
      d.y = 0;
      const dist = d.length();
      if (dist < 0.05) {
        this.mode = "idle";
        this.target = null;
        const cb = this.onArrive;
        this.onArrive = null;
        cb?.();
      } else {
        const step = Math.min(dist, 1.6 * dt);
        pos.add(d.normalize().multiplyScalar(step));
        this.heading = Math.atan2(d.x, d.z);
        bob = Math.abs(Math.sin(t * 12)) * 0.12; // hop hop
        this.legL.rotation.x = Math.sin(t * 12) * 0.6;
        this.legR.rotation.x = -Math.sin(t * 12) * 0.6;
        wing = 0.25 + 0.2 * Math.sin(t * 24);
      }
    } else {
      this.legL.rotation.x *= 0.8;
      this.legR.rotation.x *= 0.8;
    }
    if (this.mode === "work") {
      headPitch = 0.35 + 0.25 * Math.sin(t * 16); // pecking at the keys
      wing = 0.3 + 0.3 * Math.abs(Math.sin(t * 8));
    } else if (this.mode === "write") {
      headPitch = 0.5 + 0.08 * Math.sin(t * 6);
    } else if (this.mode === "dance") {
      bob = Math.abs(Math.sin(t * 7)) * 0.18;
      this.body.rotation.z = Math.sin(t * 7) * 0.15;
      wing = 0.6 + 0.4 * Math.sin(t * 14);
    } else if (this.mode === "idle") {
      headPitch = 0.08 * Math.sin(t * 1.3);
      this.head.rotation.y = 0.5 * Math.sin(t * 0.7) * Math.sin(t * 0.23);
    }
    if (this.mode !== "dance") this.body.rotation.z *= 0.9;
    if (this.mode !== "idle") this.head.rotation.y *= 0.9;

    this.body.position.y = bob;
    this.head.rotation.x = headPitch;
    this.wingL.rotation.z = -wing;
    this.wingR.rotation.z = wing;
    // Smooth turn
    let dh = this.heading - this.root.rotation.y;
    dh = Math.atan2(Math.sin(dh), Math.cos(dh));
    this.root.rotation.y += dh * Math.min(1, dt * 10);
  }
}

// ---------------------------------------------------------------------------
// The world
// ---------------------------------------------------------------------------
export class World {
  renderer: THREE.WebGLRenderer;
  scene = new THREE.Scene();
  camera: THREE.PerspectiveCamera;
  controls: OrbitControls;
  bird = new Bird();
  sun: THREE.DirectionalLight;
  hemi: THREE.HemisphereLight;
  lamp: THREE.PointLight;
  stations = {} as Record<StationName, THREE.Vector3>;
  prints = new Map<string, THREE.Object3D>();
  blocked: { x: number; z: number; r: number }[] = [];

  // Station animation bits
  screen!: THREE.Mesh;
  screenCanvas = document.createElement("canvas");
  screenTex: THREE.CanvasTexture;
  nozzle!: THREE.Group;
  printBed!: THREE.Group;
  notes: { sprite: THREE.Sprite; life: number; vx: number }[] = [];
  noteTex: THREE.Texture;
  synthPos = v3(0, 0, 0);

  time = 0; // world time in seconds (pauses with speed 0)
  speed = 1;
  private waits: { at: number; resolve: () => void }[] = [];
  private raycaster = new THREE.Raycaster();
  private snapCam = new THREE.PerspectiveCamera(42, 4 / 3, 0.1, 200);
  private photoCanvas = document.createElement("canvas");

  constructor(private canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setPixelRatio(Math.min(2, window.devicePixelRatio));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.camera = new THREE.PerspectiveCamera(45, 1, 0.1, 200);
    this.camera.position.set(9, 9, 13);
    this.controls = new OrbitControls(this.camera, canvas);
    this.controls.target.set(0, 0.5, 0);
    this.controls.enableDamping = true;
    this.controls.maxPolarAngle = Math.PI / 2.15;
    this.controls.minDistance = 5;
    this.controls.maxDistance = 30;
    this.controls.enablePan = false;

    this.hemi = new THREE.HemisphereLight("#cfe8ff", "#6b8f4e", 1.2);
    this.scene.add(this.hemi);
    this.sun = new THREE.DirectionalLight("#fff4dd", 2.2);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = sc.bottom = -10;
    sc.right = sc.top = 10;
    this.scene.add(this.sun);
    this.lamp = new THREE.PointLight("#ffcf7a", 0, 9);
    this.lamp.position.set(0, 2.6, 1.6);
    this.scene.add(this.lamp);

    this.screenCanvas.width = 256;
    this.screenCanvas.height = 160;
    this.screenTex = new THREE.CanvasTexture(this.screenCanvas);
    this.screenTex.colorSpace = THREE.SRGBColorSpace;
    this.noteTex = this.makeNoteTexture();

    this.buildIsland();
    this.buildStations();
    this.scene.add(this.bird.root);
    this.bird.root.position.set(0, 0, 1);
    this.drawScreen("Pip OS", "#2b2d42", "#8ecae6");
    this.setTimeOfDay(new Date());

    this.resize();
    window.addEventListener("resize", () => this.resize());
  }

  // --- building -------------------------------------------------------------
  private buildIsland() {
    const grass = mat("#7bc96f");
    const dirt = mat("#a0714f");
    const rock = mat("#8a8f98", { flatShading: true });
    const top = mesh(new THREE.CylinderGeometry(ISLAND_R, ISLAND_R - 0.3, 0.5, 48), grass, this.scene, 0, -0.25, 0);
    top.receiveShadow = true;
    mesh(new THREE.CylinderGeometry(ISLAND_R - 0.3, 4, 1.6, 48), dirt, this.scene, 0, -1.3, 0);
    mesh(new THREE.ConeGeometry(4, 4.5, 12), rock, this.scene, 0, -4.3, 0).rotation.x = Math.PI;

    // Pond
    const pond = mesh(new THREE.CircleGeometry(1.1, 32), mat("#5fb7e8", { roughness: 0.1, metalness: 0.2 }), this.scene, 4.2, 0.01, 2.4);
    pond.rotation.x = -Math.PI / 2;
    pond.scale.set(1.3, 1, 1);
    this.blocked.push({ x: 4.2, z: 2.4, r: 1.6 });

    // Trees and rocks
    const treeAt = (x: number, z: number, s: number) => {
      const t = new THREE.Group();
      mesh(new THREE.CylinderGeometry(0.12, 0.18, 1.2, 8), mat("#7a5230"), t, 0, 0.6, 0);
      mesh(new THREE.IcosahedronGeometry(0.8, 0), mat("#4f9d55", { flatShading: true }), t, 0, 1.6, 0);
      mesh(new THREE.IcosahedronGeometry(0.55, 0), mat("#5fb065", { flatShading: true }), t, 0.3, 2.2, 0.1);
      t.position.set(x, 0, z);
      t.scale.setScalar(s);
      this.scene.add(t);
      this.blocked.push({ x, z, r: 1.1 * s });
    };
    treeAt(-5, 2.5, 1.2);
    treeAt(-3.6, 4.6, 0.9);
    treeAt(5.2, -2.6, 1);
    for (const [x, z, s] of [[-5.6, -1, 0.4], [2, 5.4, 0.3], [6, 0.3, 0.35]] as const) {
      mesh(new THREE.DodecahedronGeometry(s, 0), rock, this.scene, x, s * 0.5, z);
    }
    // Flowers
    for (let i = 0; i < 40; i++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.5 + Math.random() * 5;
      const f = mesh(new THREE.SphereGeometry(0.05, 6, 4), mat(["#ffffff", "#ffd6e0", "#fff3a3", "#c9b6ff"][i % 4]), this.scene, Math.cos(a) * r, 0.05, Math.sin(a) * r);
      f.castShadow = false;
    }
    // Clouds
    for (let i = 0; i < 6; i++) {
      const c = new THREE.Group();
      for (let j = 0; j < 4; j++) mesh(new THREE.SphereGeometry(0.8 + Math.random() * 0.5, 10, 8), mat("#ffffff", { roughness: 1 }), c, j * 0.9, Math.random() * 0.3, Math.random() * 0.4);
      const a = (i / 6) * Math.PI * 2;
      c.position.set(Math.cos(a) * 18, 3 + Math.random() * 4, Math.sin(a) * 18);
      c.userData.cloud = a;
      c.traverse((o) => (o.castShadow = false));
      this.scene.add(c);
    }
  }

  private buildStations() {
    const wood = mat("#b98552");
    const dark = mat("#2d2f3a", { roughness: 0.5 });

    // Computer desk (websites)
    const comp = new THREE.Group();
    comp.position.set(-3.2, 0, -2.2);
    comp.rotation.y = 0.5;
    mesh(new THREE.BoxGeometry(1.8, 0.1, 1), wood, comp, 0, 0.8, 0);
    for (const [x, z] of [[-0.8, -0.4], [0.8, -0.4], [-0.8, 0.4], [0.8, 0.4]]) mesh(new THREE.BoxGeometry(0.08, 0.8, 0.08), wood, comp, x, 0.4, z);
    mesh(new THREE.BoxGeometry(1.3, 0.85, 0.08), dark, comp, 0, 1.4, -0.3);
    mesh(new THREE.BoxGeometry(0.1, 0.3, 0.1), dark, comp, 0, 0.95, -0.3);
    this.screen = mesh(new THREE.PlaneGeometry(1.18, 0.73), new THREE.MeshBasicMaterial({ map: this.screenTex }), comp, 0, 1.4, -0.255);
    mesh(new THREE.BoxGeometry(0.9, 0.04, 0.3), mat("#ddd"), comp, 0, 0.87, 0.15);
    this.scene.add(comp);
    this.stations.website = comp.localToWorld(v3(0, 0, 1.1));
    this.blocked.push({ x: comp.position.x, z: comp.position.z, r: 1.6 });

    // Synthesizer (music)
    const synth = new THREE.Group();
    synth.position.set(3.2, 0, -2.2);
    synth.rotation.y = -0.5;
    mesh(new THREE.BoxGeometry(1.8, 0.7, 0.7), mat("#3a3f58"), synth, 0, 0.35, 0);
    mesh(new THREE.BoxGeometry(1.9, 0.12, 0.8), mat("#e85d75"), synth, 0, 0.76, 0);
    for (let i = 0; i < 12; i++) mesh(new THREE.BoxGeometry(0.12, 0.05, 0.35), mat("#fafafa"), synth, -0.75 + i * 0.137, 0.84, 0.15);
    for (let i = 0; i < 4; i++) mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.06, 12), mat("#ffd166"), synth, -0.6 + i * 0.4, 0.85, -0.22);
    mesh(new THREE.BoxGeometry(0.5, 0.6, 0.5), mat("#22252f"), synth, 1.3, 0.3, -0.3);
    mesh(new THREE.CircleGeometry(0.17, 20), mat("#555"), synth, 1.3, 0.35, -0.04);
    this.scene.add(synth);
    this.stations.music = synth.localToWorld(v3(0, 0, 1));
    this.synthPos = synth.localToWorld(v3(0, 1.2, 0));
    this.blocked.push({ x: synth.position.x, z: synth.position.z, r: 1.7 });

    // 3D printer
    const printer = new THREE.Group();
    printer.position.set(0, 0, -4);
    const frame = mat("#d9dde3", { metalness: 0.4, roughness: 0.4 });
    mesh(new THREE.BoxGeometry(1.6, 0.25, 1.4), mat("#30343f"), printer, 0, 0.125, 0);
    for (const [x, z] of [[-0.75, -0.6], [0.75, -0.6], [-0.75, 0.6], [0.75, 0.6]]) mesh(new THREE.BoxGeometry(0.07, 1.8, 0.07), frame, printer, x, 1.05, z);
    mesh(new THREE.BoxGeometry(1.6, 0.08, 1.4), frame, printer, 0, 1.95, 0);
    mesh(new THREE.BoxGeometry(1.2, 0.04, 1.0), mat("#1e1e1e"), printer, 0, 0.3, 0);
    this.printBed = new THREE.Group();
    this.printBed.position.set(0, 0.32, 0);
    printer.add(this.printBed);
    this.nozzle = new THREE.Group();
    mesh(new THREE.BoxGeometry(1.5, 0.06, 0.06), frame, this.nozzle, 0, 0, 0);
    mesh(new THREE.BoxGeometry(0.18, 0.18, 0.18), mat("#ff8c42"), this.nozzle, 0, -0.08, 0);
    mesh(new THREE.ConeGeometry(0.04, 0.1, 8), mat("#ccc"), this.nozzle, 0, -0.22, 0).rotation.x = Math.PI;
    this.nozzle.position.set(0, 1.5, 0);
    printer.add(this.nozzle);
    this.scene.add(printer);
    this.stations.print = printer.localToWorld(v3(0, 0, 1.25));
    this.blocked.push({ x: 0, z: -4, r: 1.6 });

    // Diary stump with lamp
    const diary = new THREE.Group();
    diary.position.set(0, 0, 2.2);
    mesh(new THREE.CylinderGeometry(0.45, 0.55, 0.6, 14), mat("#8b5a2b"), diary, 0, 0.3, 0);
    mesh(new THREE.CylinderGeometry(0.44, 0.44, 0.02, 14), mat("#d9b382"), diary, 0, 0.61, 0);
    const book = new THREE.Group();
    book.position.set(0, 0.64, 0);
    mesh(new THREE.BoxGeometry(0.28, 0.03, 0.36), mat("#fffaf0"), book, -0.15, 0, 0).rotation.z = 0.08;
    mesh(new THREE.BoxGeometry(0.28, 0.03, 0.36), mat("#fffaf0"), book, 0.15, 0, 0).rotation.z = -0.08;
    mesh(new THREE.BoxGeometry(0.62, 0.02, 0.4), mat("#b5485d"), book, 0, -0.02, 0);
    diary.add(book);
    mesh(new THREE.CylinderGeometry(0.03, 0.03, 2.2, 6), mat("#333"), diary, 0.6, 1.1, -0.3);
    mesh(new THREE.SphereGeometry(0.14, 12, 10), mat("#ffe7a3", { emissive: "#ffcf7a", emissiveIntensity: 0.3 }), diary, 0.6, 2.25, -0.3).userData.lampBulb = true;
    this.scene.add(diary);
    this.stations.diary = v3(0, 0, 1.4);
    this.blocked.push({ x: 0, z: 2.2, r: 1.2 });
  }

  private makeNoteTexture() {
    const c = document.createElement("canvas");
    c.width = c.height = 64;
    const g = c.getContext("2d")!;
    g.font = "52px serif";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillStyle = "#ffffff";
    g.fillText("♪", 32, 34);
    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    return t;
  }

  // --- station effects ------------------------------------------------------
  drawScreen(title: string, bg = "#fff8e7", fg = "#2d3047") {
    const g = this.screenCanvas.getContext("2d")!;
    g.fillStyle = bg;
    g.fillRect(0, 0, 256, 160);
    g.fillStyle = fg;
    g.fillRect(0, 0, 256, 18);
    g.fillStyle = bg;
    for (let i = 0; i < 3; i++) g.fillRect(8 + i * 12, 6, 6, 6);
    g.fillStyle = fg;
    g.font = "bold 22px sans-serif";
    g.textAlign = "center";
    const words = title.split(" ");
    let line = "";
    let y = 62;
    for (const w of words) {
      if (g.measureText(line + w).width > 230) {
        g.fillText(line, 128, y);
        line = "";
        y += 26;
      }
      line += w + " ";
    }
    g.fillText(line, 128, y);
    g.globalAlpha = 0.35;
    for (let i = 0; i < 3; i++) g.fillRect(40, y + 22 + i * 12, 176 - i * 30, 6);
    g.globalAlpha = 1;
    this.screenTex.needsUpdate = true;
  }

  spawnNote() {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.noteTex, color: new THREE.Color().setHSL(Math.random(), 0.7, 0.6), transparent: true }));
    s.position.copy(this.synthPos).add(v3((Math.random() - 0.5) * 1.2, 0, (Math.random() - 0.5) * 0.4));
    s.scale.setScalar(0.45);
    this.scene.add(s);
    this.notes.push({ sprite: s, life: 0, vx: (Math.random() - 0.5) * 0.4 });
  }

  /** Grow a print layer-by-layer on the bed; returns the object (still on the bed). */
  startPrint(item: Item): THREE.Object3D {
    this.printBed.clear();
    const obj = buildPrint(item.print!);
    obj.userData.itemId = item.id;
    obj.userData.finalScale = obj.scale.x;
    obj.scale.y = 0.001;
    this.printBed.add(obj);
    return obj;
  }

  setPrintProgress(obj: THREE.Object3D, p: number) {
    obj.scale.y = Math.max(0.001, obj.userData.finalScale * p);
    const t = this.time * 3;
    this.nozzle.position.set(Math.sin(t * 2.3) * 0.35, 0.45 + p * 0.9, 0);
    this.nozzle.children[1].position.z = Math.cos(t * 1.7) * 0.35;
    this.nozzle.children[2].position.z = Math.cos(t * 1.7) * 0.35;
  }

  parkNozzle() {
    this.nozzle.position.set(0, 1.5, 0);
  }

  /** Pip picks the finished print up off the bed. */
  pickUp(obj: THREE.Object3D) {
    obj.scale.setScalar(obj.userData.finalScale * 0.8);
    obj.position.set(0, 0, 0);
    this.bird.carry.add(obj);
  }

  /** Place a printed object on the island (from Pip's head or straight from a save). */
  placePrint(item: Item, obj?: THREE.Object3D) {
    const o = obj ?? buildPrint(item.print!);
    o.removeFromParent();
    o.userData.itemId = item.id;
    if (o.userData.finalScale) o.scale.setScalar(o.userData.finalScale);
    const [x, z] = item.pos!;
    o.position.set(x, 0, z);
    o.rotation.y = (x * 13 + z * 7) % (Math.PI * 2);
    this.scene.add(o);
    this.prints.set(item.id, o);
  }

  removeAllPrints() {
    this.prints.forEach((o) => o.removeFromParent());
    this.prints.clear();
    this.printBed.clear();
    this.bird.carry.clear();
  }

  /** Find an empty spot on the island for a new print. */
  freeSpot(taken: [number, number][]): [number, number] {
    for (let tries = 0; tries < 200; tries++) {
      const a = Math.random() * Math.PI * 2;
      const r = 1.8 + Math.random() * (ISLAND_R - 2.6);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      const ok =
        this.blocked.every((b) => Math.hypot(b.x - x, b.z - z) > b.r + 0.4) &&
        taken.every(([tx, tz]) => Math.hypot(tx - x, tz - z) > 0.9 - Math.min(0.4, tries / 400));
      if (ok) return [x, z];
    }
    const a = Math.random() * Math.PI * 2;
    return [Math.cos(a) * 5.5, Math.sin(a) * 5.5];
  }

  randomWanderPoint(): THREE.Vector3 {
    const [x, z] = this.freeSpot([]);
    return v3(x * 0.8, 0, z * 0.8);
  }

  focusOn(id: string) {
    const o = this.prints.get(id);
    if (!o) return;
    this.controls.target.set(o.position.x, 0.5, o.position.z);
    const glow = o.userData.glow ?? 0;
    o.userData.glow = glow + 2.5;
  }

  pickAt(clientX: number, clientY: number): string | null {
    const r = this.canvas.getBoundingClientRect();
    const p = new THREE.Vector2(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    this.raycaster.setFromCamera(p, this.camera);
    const hits = this.raycaster.intersectObjects([...this.prints.values()], true);
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.itemId) o = o.parent;
      if (o) return o.userData.itemId as string;
    }
    return null;
  }

  // --- photos ---------------------------------------------------------------
  /**
   * Take a scrapbook photo: render the scene once from a different camera and copy the
   * pixels in the same tick (so the WebGL canvas doesn't need preserveDrawingBuffer).
   */
  snapshot(from: THREE.Vector3, focus: THREE.Vector3): string {
    const gl = this.renderer.domElement;
    const w = gl.width;
    const h = gl.height;
    this.snapCam.aspect = w / Math.max(1, h);
    this.snapCam.position.copy(from);
    this.snapCam.lookAt(focus);
    this.snapCam.updateProjectionMatrix();
    this.renderer.render(this.scene, this.snapCam);

    const W = 320;
    const H = 240;
    this.photoCanvas.width = W;
    this.photoCanvas.height = H;
    const g = this.photoCanvas.getContext("2d")!;
    // centre-crop to 4:3
    const srcAspect = w / h;
    let sw = w;
    let sh = h;
    if (srcAspect > W / H) sw = h * (W / H);
    else sh = w / (W / H);
    g.drawImage(gl, (w - sw) / 2, (h - sh) / 2, sw, sh, 0, 0, W, H);
    // a touch of warm "film" tint
    g.fillStyle = "rgba(255, 200, 140, 0.08)";
    g.fillRect(0, 0, W, H);
    this.renderer.render(this.scene, this.camera);
    return this.photoCanvas.toDataURL("image/jpeg", 0.72);
  }

  /**
   * Where the camera goes for an item's photo, what it looks at, and (for prints)
   * where Pip should stand to pose beside the thing.
   */
  photoPlan(item: Item): { from: THREE.Vector3; focus: THREE.Vector3; stand?: THREE.Vector3 } {
    if (item.kind === "print" && item.pos) {
      const [x, z] = item.pos;
      const spot = v3(x, 0, z);
      const toward = spot.clone().setY(0);
      if (toward.lengthSq() < 0.01) toward.set(0, 0, 1);
      toward.normalize();
      const side = v3(toward.z, 0, -toward.x);
      const from = spot.clone().sub(toward.clone().multiplyScalar(2.1)).add(side.multiplyScalar(1.3)).add(v3(0, 1.25, 0));
      const look = spot.clone().sub(from).setY(0).normalize();
      const perp = v3(look.z, 0, -look.x);
      const stand = spot.clone().add(perp.clone().multiplyScalar(0.75));
      return { from, focus: spot.clone().add(perp.multiplyScalar(0.38)).add(v3(0, 0.45, 0)), stand };
    }
    const station = item.kind === "website" ? { at: v3(-3.2, 0, -2.2), rot: 0.5 } : { at: v3(3.2, 0, -2.2), rot: -0.5 };
    const front = v3(Math.sin(station.rot), 0, Math.cos(station.rot));
    const side = v3(front.z, 0, -front.x);
    const from = station.at.clone().add(front.multiplyScalar(3.4)).add(side.multiplyScalar(item.kind === "website" ? -1.1 : 1.1)).add(v3(0, 1.9, 0));
    return { from, focus: station.at.clone().add(v3(0, 0.9, 0.3)) };
  }

  /** Take an item's scrapbook photo right now. */
  photoOf(item: Item): string {
    const plan = this.photoPlan(item);
    return this.snapshot(plan.from, plan.focus);
  }

  // --- time -----------------------------------------------------------------
  /** Wait in world time (respects speed and pause). */
  wait(seconds: number): Promise<void> {
    return new Promise((resolve) => this.waits.push({ at: this.time + seconds, resolve }));
  }

  setTimeOfDay(d: Date) {
    const h = d.getHours() + d.getMinutes() / 60;
    const sunAngle = ((h - 6) / 12) * Math.PI; // 6am rise, 6pm set
    const day = Math.max(0, Math.sin(sunAngle));
    this.sun.position.set(Math.cos(sunAngle) * 12, Math.max(2, Math.sin(sunAngle) * 14), 6);
    this.sun.intensity = 0.25 + day * 2.1;
    this.hemi.intensity = 0.35 + day * 0.9;
    const sky = new THREE.Color("#1b2140").lerp(new THREE.Color(h > 16 && h < 20 ? "#f7b989" : "#9fd8ff"), Math.min(1, day * 1.6 + 0.05));
    this.scene.background = sky;
    this.scene.fog = new THREE.Fog(sky, 25, 60);
    this.lamp.intensity = day < 0.25 ? 6 : 0;
  }

  // --- loop -------------------------------------------------------------------
  project(p: THREE.Vector3): { x: number; y: number; visible: boolean } {
    const v = p.clone().project(this.camera);
    const r = this.canvas.getBoundingClientRect();
    return { x: ((v.x + 1) / 2) * r.width, y: ((1 - v.y) / 2) * r.height, visible: v.z < 1 };
  }

  birdHeadScreen() {
    return this.project(this.bird.root.position.clone().add(v3(0, 2, 0)));
  }

  resize() {
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / Math.max(1, h);
    this.camera.updateProjectionMatrix();
  }

  update(realDt: number) {
    const dt = Math.min(0.1, realDt) * this.speed;
    this.time += dt;
    this.bird.update(dt);

    // resolve due waits
    if (this.waits.length) {
      const due = this.waits.filter((w) => w.at <= this.time);
      this.waits = this.waits.filter((w) => w.at > this.time);
      due.forEach((w) => w.resolve());
    }

    // notes float upward
    this.notes = this.notes.filter((n) => {
      n.life += dt;
      n.sprite.position.y += dt * 0.8;
      n.sprite.position.x += n.vx * dt;
      n.sprite.material.opacity = Math.max(0, 1 - n.life / 2.5);
      if (n.life > 2.5) {
        n.sprite.removeFromParent();
        n.sprite.material.dispose();
        return false;
      }
      return true;
    });

    // prints: gentle highlight pulse when focused
    this.prints.forEach((o) => {
      const g = o.userData.glow as number | undefined;
      if (g && g > 0) {
        o.userData.glow = Math.max(0, g - realDt);
        const s = 1 + 0.12 * Math.sin(g * 10) * Math.min(1, g);
        o.scale.setScalar(o.userData.baseScale ?? (o.userData.baseScale = o.scale.x));
        o.scale.multiplyScalar(s);
      }
    });

    this.scene.children.forEach((c) => {
      if (c.userData.cloud !== undefined) {
        c.userData.cloud += dt * 0.01;
        const a = c.userData.cloud as number;
        c.position.x = Math.cos(a) * 18;
        c.position.z = Math.sin(a) * 18;
      }
    });

    this.controls.update();
    this.renderer.render(this.scene, this.camera);
  }
}
