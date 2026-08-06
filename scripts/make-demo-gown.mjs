// Generates a small original demo GLB — a stylized gown-on-a-stand silhouette
// in Fashion360 brand colors — used purely to prove the 3D preview pipeline
// end-to-end (GLTFLoader -> useGLTF -> Canvas) since no real designer model
// exists yet. Not a photoreal garment; the viewer labels it "Demo Model".
//
// Run once with: node scripts/make-demo-gown.mjs public/models/demo/demo-gown.glb
// Not part of the build/runtime — a one-off asset generator.
import * as THREE from "three";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

// Minimal FileReader shim — GLTFExporter's binary path uses the browser
// FileReader API to turn its merged Blob into an ArrayBuffer; Node has no
// FileReader, but Blob.arrayBuffer() does the same job directly.
globalThis.FileReader = class {
  readAsArrayBuffer(blob) {
    blob.arrayBuffer().then((buf) => {
      this.result = buf;
      this.onloadend?.();
    });
  }
};

const scene = new THREE.Scene();
scene.name = "Fashion360DemoGown";

// Brand palette (matches globals.css tokens)
const DEEP_PURPLE = 0x3d1f5c; // primary / deep royal purple
const VIBRANT_PURPLE = 0x7c3aed;
const GOLD = 0xc9a24b;
const CREAM = 0xf5efe6;

// --- Gown body: a lathe-revolved silhouette (fitted bodice -> flared skirt) ---
const profile = [
  new THREE.Vector2(0.0, 0.0), // hem center
  new THREE.Vector2(0.62, 0.0), // hem edge (wide flare)
  new THREE.Vector2(0.58, 0.18),
  new THREE.Vector2(0.46, 0.42),
  new THREE.Vector2(0.34, 0.62), // waist taper begins
  new THREE.Vector2(0.27, 0.78),
  new THREE.Vector2(0.24, 0.9), // waist (narrowest)
  new THREE.Vector2(0.28, 1.02),
  new THREE.Vector2(0.33, 1.14), // bust
  new THREE.Vector2(0.3, 1.26),
  new THREE.Vector2(0.22, 1.36), // shoulder taper
  new THREE.Vector2(0.16, 1.42), // neckline
];
const gownGeometry = new THREE.LatheGeometry(profile, 48);
gownGeometry.computeVertexNormals();
const gownMaterial = new THREE.MeshStandardMaterial({
  color: DEEP_PURPLE,
  roughness: 0.35,
  metalness: 0.08,
  emissive: new THREE.Color(VIBRANT_PURPLE),
  emissiveIntensity: 0.04,
});
const gown = new THREE.Mesh(gownGeometry, gownMaterial);
gown.name = "GownBody";
gown.castShadow = true;
gown.receiveShadow = true;
scene.add(gown);

// --- Gold waist trim (torus at the narrowest point) ---
const trimGeometry = new THREE.TorusGeometry(0.245, 0.018, 16, 64);
const trimMaterial = new THREE.MeshStandardMaterial({ color: GOLD, roughness: 0.25, metalness: 0.75 });
const trim = new THREE.Mesh(trimGeometry, trimMaterial);
trim.name = "WaistTrim";
trim.rotation.x = Math.PI / 2;
trim.position.y = 0.9;
scene.add(trim);

// --- Neckline collar accent (small gold ring) ---
const collarGeometry = new THREE.TorusGeometry(0.155, 0.012, 12, 48);
const collar = new THREE.Mesh(collarGeometry, trimMaterial.clone());
collar.name = "NecklineTrim";
collar.rotation.x = Math.PI / 2;
collar.position.y = 1.4;
scene.add(collar);

// --- Simple head form (cream, understated — orientation reference only) ---
const headGeometry = new THREE.SphereGeometry(0.11, 32, 24);
const headMaterial = new THREE.MeshStandardMaterial({ color: CREAM, roughness: 0.6, metalness: 0.0 });
const head = new THREE.Mesh(headGeometry, headMaterial);
head.name = "HeadForm";
head.position.y = 1.58;
scene.add(head);

// --- Display stand (simple cylinder base) ---
const standGeometry = new THREE.CylinderGeometry(0.4, 0.44, 0.06, 48);
const standMaterial = new THREE.MeshStandardMaterial({ color: 0x2a2a2a, roughness: 0.5, metalness: 0.2 });
const stand = new THREE.Mesh(standGeometry, standMaterial);
stand.name = "Stand";
stand.position.y = -0.03;
scene.add(stand);

// Center the whole group vertically-ish so OrbitControls' default target (0,0,0) frames it well
scene.position.y = -0.75;

const exporter = new GLTFExporter();
const glb = await exporter.parseAsync(scene, { binary: true, embedImages: false });

const outPath = process.argv[2];
await mkdir(dirname(outPath), { recursive: true });
await writeFile(outPath, Buffer.from(glb));
console.log("Wrote", outPath, `(${(glb.byteLength / 1024).toFixed(1)} KB)`);
