"use client";

// Turns a fabric assignment (DesignTexture, optionally backed by a
// catalogued FabricLibraryItem's PBR properties) into a real three.js
// material, and decides which mesh in a loaded garment model it applies to.
// This is the actual "fabric as digital material" engine — see
// prisma/schema.prisma's FabricLibraryItem comment and model-loader.tsx.
import * as THREE from "three";
import type { DesignTextureData } from "@/features/design-studio/types";

const textureLoader = new THREE.TextureLoader();
const textureCache = new Map<string, THREE.Texture>();

function loadCachedTexture(url: string, { srgb }: { srgb: boolean }): THREE.Texture {
  const cached = textureCache.get(url);
  if (cached) return cached;
  const tex = textureLoader.load(url);
  tex.wrapS = tex.wrapT = THREE.RepeatWrapping;
  if (srgb) tex.colorSpace = THREE.SRGBColorSpace;
  textureCache.set(url, tex);
  return tex;
}

const HEX_PATTERN = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/**
 * Builds a MeshPhysicalMaterial from a fabric assignment. Falls back
 * gracefully: no linked FabricLibraryItem -> flat color from the texture's
 * own colorHex (or its photo, if any) with sensible fabric-like defaults;
 * no color at all -> a neutral gray placeholder rather than failing.
 */
export function buildFabricMaterial(texture: DesignTextureData): THREE.MeshPhysicalMaterial {
  const fabric = texture.fabricLibraryItem;
  const colorHex = fabric?.baseColorHex ?? texture.colorHex ?? undefined;
  const opacity = fabric?.opacity ?? 1;

  const material = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(colorHex && HEX_PATTERN.test(colorHex) ? colorHex : "#c9c9c9"),
    roughness: fabric?.roughness ?? 0.55,
    metalness: fabric?.metalness ?? 0.03,
    reflectivity: fabric?.reflectivity ?? 0.5,
    opacity,
    transparent: opacity < 1,
  });

  if (fabric?.textureMapUrl) {
    material.map = loadCachedTexture(fabric.textureMapUrl, { srgb: true });
  } else if (!fabric && texture.imageUrl) {
    // No catalogued fabric linked — still use the version's own reference
    // photo as the map so the garment isn't just a flat guessed color.
    material.map = loadCachedTexture(texture.imageUrl, { srgb: true });
  }

  if (fabric?.normalMapUrl) {
    material.normalMap = loadCachedTexture(fabric.normalMapUrl, { srgb: false });
  }

  return material;
}

// V1 mesh-targeting convention: since an uploaded GLB's mesh names are
// whatever the designer's 3D software produced, we match by keyword rather
// than requiring an exact contract. A mesh that matches no role keeps its
// original baked-in material untouched — we never guess-recolor a part we
// can't identify (e.g. a mannequin head or display stand).
const ROLE_KEYWORDS: Record<string, string[]> = {
  PRIMARY: ["primary", "garment", "body", "gown", "dress", "shirt", "main"],
  SECONDARY: ["secondary"],
  TRIM: ["trim"],
  LINING: ["lining"],
  ACCENT: ["accent", "collar", "neckline", "cuff"],
};

const NEVER_MATCH_KEYWORDS = ["head", "stand", "mannequin", "base", "form"];

export function meshNameMatchesRole(meshName: string, role: string): boolean {
  const lower = meshName.toLowerCase();
  if (NEVER_MATCH_KEYWORDS.some((k) => lower.includes(k))) return false;
  return (ROLE_KEYWORDS[role] ?? []).some((k) => lower.includes(k));
}

/** Mutates every mesh in `root` whose name matches an assigned fabric's role. */
export function applyFabricMaterials(root: THREE.Object3D, textures: DesignTextureData[]) {
  if (textures.length === 0) return;
  root.traverse((child) => {
    if (!(child instanceof THREE.Mesh)) return;
    const assignment = textures.find((t) => meshNameMatchesRole(child.name, t.role));
    if (!assignment) return;
    child.material = buildFabricMaterial(assignment);
  });
}
