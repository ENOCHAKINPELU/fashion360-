"use client";

import dynamic from "next/dynamic";
import { TwoDPreviewViewer } from "@/features/design-studio/components/viewer/two-d-preview-viewer";
import type { DesignTextureData } from "@/features/design-studio/types";

// The only import the rest of the app should ever use. It decides — never
// the caller — whether a real interactive 3D model is available; if not, it
// falls back to an honestly-labeled 2D preview instead of faking rotation on
// a flat image. Swapping the rendering engine (three.js today) only ever
// means editing ModelCanvasViewer/ModelLoader, never this component's props
// or any call site.
const ModelCanvasViewer = dynamic(
  () =>
    import("@/features/design-studio/components/viewer/model-canvas-viewer").then(
      (mod) => mod.ModelCanvasViewer
    ),
  {
    ssr: false,
    loading: () => <div className="flex h-full min-h-[320px] items-center justify-center rounded-2xl border border-border bg-[#14121f]" />,
  }
);

export interface Design3DViewerModel {
  url: string;
  format: string;
}

export function Design3DViewer({
  model,
  fallbackImageUrl,
  className,
  isDemo,
  textures,
}: {
  model: Design3DViewerModel | null;
  fallbackImageUrl?: string | null;
  className?: string;
  // True only for the placeholder model used to prove the 3D pipeline works
  // before a designer has uploaded a real one — see src/lib/design-demo-model.ts.
  // Never set for an actual designer-uploaded model.
  isDemo?: boolean;
  // Fabric/material assignments for this version — see fabric-material.ts.
  textures?: DesignTextureData[];
}) {
  if (model) {
    return (
      <ModelCanvasViewer modelUrl={model.url} format={model.format} className={className} isDemo={isDemo} textures={textures} />
    );
  }
  return <TwoDPreviewViewer imageUrl={fallbackImageUrl ?? null} className={className} />;
}
