import * as THREE from "three";
import type { PrintData } from "./types";

/** Turns the brain's print "recipe" into real 3D geometry. Origin sits at the base. */
export function buildPrint(p: PrintData): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.55, metalness: 0.05, flatShading: p.shape === "crystal" });
  const d = p.detail;
  const add = (geo: THREE.BufferGeometry, x = 0, y = 0, z = 0, m: THREE.Material = mat) => {
    const mesh = new THREE.Mesh(geo, m);
    mesh.position.set(x, y, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    g.add(mesh);
    return mesh;
  };

  switch (p.shape) {
    case "vase": {
      const pts: THREE.Vector2[] = [];
      for (let i = 0; i <= 20; i++) {
        const t = i / 20;
        const r = 0.12 + 0.13 * Math.sin(t * Math.PI * (0.8 + d * 0.3)) ** 2 + 0.04 * t;
        pts.push(new THREE.Vector2(r, t * 0.6));
      }
      const geo = new THREE.LatheGeometry(pts, 24);
      const m = add(geo);
      (m.material as THREE.Material).side = THREE.DoubleSide;
      break;
    }
    case "tower": {
      const floors = 2 + d;
      for (let i = 0; i < floors; i++) {
        const s = 0.32 - i * 0.035;
        const b = add(new THREE.BoxGeometry(s, 0.14, s), 0, 0.07 + i * 0.14);
        b.rotation.y = i * 0.35;
      }
      add(new THREE.ConeGeometry(0.15, 0.22, 4), 0, floors * 0.14 + 0.11).rotation.y = Math.PI / 4;
      break;
    }
    case "crystal": {
      const n = 2 + d;
      for (let i = 0; i < n; i++) {
        const h = 0.25 + ((i * 37) % 10) / 22;
        const c = add(new THREE.OctahedronGeometry(0.09, 0), 0, h / 2);
        c.scale.set(1, h / 0.18, 1);
        const a = (i / n) * Math.PI * 2;
        c.position.x = i ? Math.cos(a) * 0.1 : 0;
        c.position.z = i ? Math.sin(a) * 0.1 : 0;
        c.rotation.z = i ? Math.cos(a) * 0.35 : 0;
        c.rotation.x = i ? -Math.sin(a) * 0.35 : 0;
      }
      break;
    }
    case "mushroom": {
      const white = new THREE.MeshStandardMaterial({ color: "#f4efe6", roughness: 0.8 });
      add(new THREE.CylinderGeometry(0.06, 0.08, 0.3, 12), 0, 0.15, 0, white);
      const cap = add(new THREE.SphereGeometry(0.22, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2), 0, 0.28);
      cap.scale.y = 0.75;
      for (let i = 0; i < d + 2; i++) {
        const a = i * 2.4;
        const dot = add(new THREE.SphereGeometry(0.03, 8, 6), Math.cos(a) * 0.13, 0.4, Math.sin(a) * 0.13, white);
        dot.scale.y = 0.4;
      }
      break;
    }
    case "knot": {
      const k = add(new THREE.TorusKnotGeometry(0.14, 0.04, 96, 10, 2, 2 + d), 0, 0.26);
      k.rotation.x = Math.PI / 2;
      add(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 16), 0, 0.03, 0, new THREE.MeshStandardMaterial({ color: "#555", roughness: 0.7 }));
      break;
    }
    case "tree": {
      add(new THREE.CylinderGeometry(0.03, 0.04, 0.14, 8), 0, 0.07, 0, new THREE.MeshStandardMaterial({ color: "#7a5230" }));
      const layers = 2 + Math.ceil(d / 2);
      for (let i = 0; i < layers; i++) add(new THREE.ConeGeometry(0.2 - i * 0.04, 0.22, 10), 0, 0.2 + i * 0.12);
      break;
    }
  }
  g.scale.setScalar(p.size * 1.4);
  return g;
}
