"use client";

// Format-specific loaders live only here — swapping the rendering engine or
// adding a new format later means touching just this file, never the rest
// of the app (Design3DViewer's props contract never changes).
import { useGLTF } from "@react-three/drei";
import { useLoader } from "@react-three/fiber";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { FBXLoader } from "three/examples/jsm/loaders/FBXLoader.js";

function GltfModel({ url }: { url: string }) {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
}

function ObjModel({ url }: { url: string }) {
  const obj = useLoader(OBJLoader, url);
  return <primitive object={obj} />;
}

function FbxModel({ url }: { url: string }) {
  const fbx = useLoader(FBXLoader, url);
  return <primitive object={fbx} />;
}

export function ModelLoader({ url, format }: { url: string; format: string }) {
  switch (format) {
    case "GLB":
    case "GLTF":
      return <GltfModel url={url} />;
    case "OBJ":
      return <ObjModel url={url} />;
    case "FBX":
      return <FbxModel url={url} />;
    default:
      return null;
  }
}
