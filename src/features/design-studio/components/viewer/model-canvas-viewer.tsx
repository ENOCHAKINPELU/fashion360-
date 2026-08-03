"use client";

import { Suspense, useRef, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { Environment, Loader, OrbitControls, Stage } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { Maximize, Minimize, RotateCcw, Box } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ModelLoader } from "@/features/design-studio/components/viewer/model-loader";

const VIEW_PRESETS: Record<string, [number, number, number]> = {
  Front: [0, 0.4, 4.5],
  Back: [0, 0.4, -4.5],
  Left: [-4.5, 0.4, 0],
  Right: [4.5, 0.4, 0],
  Top: [0, 4.5, 0.01],
  Bottom: [0, -4.5, 0.01],
};

export function ModelCanvasViewer({
  modelUrl,
  format,
  className,
}: {
  modelUrl: string;
  format: string;
  className?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  function setView(position: [number, number, number]) {
    const controls = controlsRef.current;
    if (!controls) return;
    controls.object.position.set(...position);
    controls.target.set(0, 0, 0);
    controls.object.lookAt(0, 0, 0);
    controls.update();
  }

  function resetView() {
    setView(VIEW_PRESETS.Front);
  }

  async function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (!document.fullscreenElement) {
      await el.requestFullscreen?.();
      setIsFullscreen(true);
    } else {
      await document.exitFullscreen?.();
      setIsFullscreen(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-[#14121f]",
        isFullscreen && "bg-[#14121f] p-4",
        className
      )}
    >
      <div className="absolute top-3 left-3 z-10">
        <Badge className="gap-1 bg-primary text-white hover:bg-primary">
          <Box className="size-3" /> 3D Preview
        </Badge>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <Button variant="secondary" size="icon-sm" onClick={resetView} aria-label="Reset view" title="Reset view">
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
        </Button>
      </div>

      <div className="relative flex-1">
        <Canvas
          camera={{ position: VIEW_PRESETS.Front, fov: 40 }}
          dpr={[1, 2]}
          gl={{ preserveDrawingBuffer: true }}
        >
          <Suspense fallback={null}>
            <Stage environment="city" intensity={0.5} shadows="contact" adjustCamera={1.2}>
              <ModelLoader url={modelUrl} format={format} />
            </Stage>
            <Environment preset="studio" />
          </Suspense>
          <OrbitControls
            ref={controlsRef}
            makeDefault
            enablePan
            enableZoom
            enableRotate
            minDistance={1.5}
            maxDistance={12}
          />
        </Canvas>
        <Loader containerStyles={{ background: "rgba(20,18,31,0.85)" }} />
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 bg-black/20 p-2">
        {Object.entries(VIEW_PRESETS).map(([label, position]) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => setView(position)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
