"use client";

// Format-specific loaders live only here — swapping the rendering engine or
// adding a new format later means touching just this file, never the rest
// of the app (Design3DViewer's props contract never changes).
import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";
import type { Object3D } from "three";
import type { DesignTextureData } from "@/features/design-studio/types";
import { applyFabricMaterials } from "@/features/design-studio/components/viewer/fabric-material";

// useGLTF/useLoader cache and share one scene graph across every viewer
// instance of the same URL, so fabric materials are applied to a clone —
// otherwise assigning one order's fabric would recolor every other open
// viewer of the same base model.
function useFabricInstance(source: Object3D, textures: DesignTextureData[]) {
  return useMemo(() => {
    const instance = source.clone(true);
    applyFabricMaterials(instance, textures);
    return instance;
  }, [source, textures]);
}

function GltfModel({ url, textures }: { url: string; textures: DesignTextureData[] }) {
  const { scene } = useGLTF(url);
  const instance = useFabricInstance(scene, textures);
  return <primitive object={instance} />;
}

function ObjModel({ url, textures }: { url: string; textures: DesignTextureData[] }) {
  const obj = useLoader(OBJLoader, url);
  const instance = useFabricInstance(obj, textures);
  return <primitive object={instance} />;
}

function FbxModel({ url, textures }: { url: string; textures: DesignTextureData[] }) {
  const fbx = useLoader(FBXLoader, url);
  const instance = useFabricInstance(fbx, textures);
  return <primitive object={instance} />;
}

export function ModelLoader({
  url,
  format,
  textures = [],
}: {
  url: string;
  format: string;
  // Fabric assignments to apply on top of the model's baked-in materials —
  // see fabric-material.ts. Empty/omitted renders the GLB exactly as authored.
  textures?: DesignTextureData[];
}) {
  switch (format) {
    case "GLB":
    case "GLTF":
      return <GltfModel url={url} textures={textures} />;
    case "OBJ":
      return <ObjModel url={url} textures={textures} />;
    case "FBX":
      return <FbxModel url={url} textures={textures} />;
    default:
      return null;
  }
}
