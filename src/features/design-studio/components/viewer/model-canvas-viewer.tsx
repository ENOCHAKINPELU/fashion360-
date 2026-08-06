"use client";

import { Component, Suspense, useEffect, useRef, useState, type ReactNode } from "react";
import * as THREE from "three";
import { Canvas } from "@react-three/fiber";
import { Environment, Loader, OrbitControls, Stage } from "@react-three/drei";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { useReducedMotion } from "framer-motion";
import { Maximize, Minimize, RotateCcw, RotateCw, ZoomIn, ZoomOut, Box, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { ModelLoader } from "@/features/design-studio/components/viewer/model-loader";
import type { DesignTextureData } from "@/features/design-studio/types";

const VIEW_PRESETS: Record<string, [number, number, number]> = {
  Front: [0, 0.4, 4.5],
  Back: [0, 0.4, -4.5],
  Left: [-4.5, 0.4, 0],
  Right: [4.5, 0.4, 0],
  Top: [0, 4.5, 0.01],
  Bottom: [0, -4.5, 0.01],
};

const MIN_DISTANCE = 1.5;
const MAX_DISTANCE = 12;
const TWEEN_MS = 450;

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

// Standard React error boundary — R3F's Canvas still throws real errors up
// through the outer React tree when a loader (useGLTF/useLoader) rejects, so
// wrapping the Canvas here catches a bad/missing model file instead of
// crashing the page.
class ModelErrorBoundary extends Component<
  { children: ReactNode; resetKey: number; onRetry: () => void },
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: unknown) {
    console.error("3D design preview failed to load:", error);
  }

  componentDidUpdate(prevProps: { resetKey: number }) {
    if (prevProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full min-h-[320px] flex-col items-center justify-center gap-3 p-6 text-center">
          <AlertTriangle className="size-8 text-white/60" />
          <p className="text-sm font-medium text-white">Unable to load the design preview.</p>
          <p className="text-xs text-white/50">The 3D file may be missing or invalid.</p>
          <Button variant="secondary" size="sm" onClick={this.props.onRetry}>
            Try Again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}

export function ModelCanvasViewer({
  modelUrl,
  format,
  className,
  isDemo,
  textures,
}: {
  modelUrl: string;
  format: string;
  className?: string;
  isDemo?: boolean;
  textures?: DesignTextureData[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const controlsRef = useRef<OrbitControlsImpl>(null);
  const rafRef = useRef<number | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [autoRotate, setAutoRotate] = useState(false);
  const [retryKey, setRetryKey] = useState(0);
  const reduceMotion = useReducedMotion();

  useEffect(() => () => {
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
  }, []);

  function animateToPosition(position: [number, number, number]) {
    const controls = controlsRef.current;
    if (!controls) return;
    if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);

    const camera = controls.object;
    const startPos = camera.position.clone();
    const endPos = new THREE.Vector3(...position);
    const startTarget = controls.target.clone();
    const endTarget = new THREE.Vector3(0, 0, 0);

    if (reduceMotion) {
      camera.position.copy(endPos);
      controls.target.copy(endTarget);
      camera.lookAt(endTarget);
      controls.update();
      return;
    }

    const startTime = performance.now();
    const tick = (now: number) => {
      const t = clamp((now - startTime) / TWEEN_MS, 0, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      camera.position.lerpVectors(startPos, endPos, eased);
      controls.target.lerpVectors(startTarget, endTarget, eased);
      camera.lookAt(controls.target);
      controls.update();
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function resetView() {
    animateToPosition(VIEW_PRESETS.Front);
  }

  function zoomBy(factor: number) {
    const controls = controlsRef.current;
    if (!controls) return;
    const camera = controls.object;
    const target = controls.target;
    const direction = camera.position.clone().sub(target);
    const currentDistance = direction.length();
    const newDistance = clamp(currentDistance * factor, MIN_DISTANCE, MAX_DISTANCE);
    direction.setLength(newDistance);
    camera.position.copy(target.clone().add(direction));
    controls.update();
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

  function retry() {
    setRetryKey((k) => k + 1);
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
      <div className="absolute top-3 left-3 z-10 flex flex-wrap gap-1.5">
        <Badge className="gap-1 bg-primary text-white hover:bg-primary">
          <Box className="size-3" /> 3D Preview
        </Badge>
        {isDemo && (
          <Badge variant="outline" className="border-warning/40 bg-warning-soft text-warning">
            Demo Model
          </Badge>
        )}
      </div>

      <div className="absolute top-3 right-3 z-10">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={toggleFullscreen}
              aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            >
              {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{isFullscreen ? "Exit Fullscreen" : "Fullscreen"}</TooltipContent>
        </Tooltip>
      </div>

      <div className="relative flex-1">
        <ModelErrorBoundary resetKey={retryKey} onRetry={retry}>
          <Canvas
            key={retryKey}
            camera={{ position: VIEW_PRESETS.Front, fov: 40 }}
            dpr={[1, 2]}
            gl={{ preserveDrawingBuffer: true }}
          >
            <Suspense fallback={null}>
              <Stage environment="city" intensity={0.5} shadows="contact" adjustCamera={1.2}>
                <ModelLoader url={modelUrl} format={format} textures={textures} />
              </Stage>
              <Environment preset="studio" />
            </Suspense>
            <OrbitControls
              ref={controlsRef}
              makeDefault
              enablePan
              enableZoom
              enableRotate
              minDistance={MIN_DISTANCE}
              maxDistance={MAX_DISTANCE}
              autoRotate={autoRotate && !reduceMotion}
              autoRotateSpeed={1.2}
            />
          </Canvas>
        </ModelErrorBoundary>
        <Loader containerStyles={{ background: "rgba(20,18,31,0.85)" }} />
      </div>

      <div className="flex items-center justify-center gap-1.5 border-t border-white/10 bg-black/20 p-2">
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="secondary"
              size="icon-sm"
              onClick={() => zoomBy(1 / 0.8)}
              aria-label="Zoom out"
            >
              <ZoomOut className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom Out</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="sm" className="gap-1.5 text-white/80 hover:text-white" onClick={resetView}>
              <RotateCcw className="size-3.5" /> Reset
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset View</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="secondary" size="icon-sm" onClick={() => zoomBy(0.8)} aria-label="Zoom in">
              <ZoomIn className="size-3.5" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Zoom In</TooltipContent>
        </Tooltip>
        {!reduceMotion && (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant={autoRotate ? "default" : "secondary"}
                size="icon-sm"
                onClick={() => setAutoRotate((v) => !v)}
                aria-label={autoRotate ? "Stop auto rotate" : "Auto rotate"}
                aria-pressed={autoRotate}
              >
                <RotateCw className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{autoRotate ? "Stop Auto Rotate" : "Auto Rotate"}</TooltipContent>
          </Tooltip>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-1.5 border-t border-white/10 bg-black/20 p-2">
        {Object.entries(VIEW_PRESETS).map(([label, position]) => (
          <Button
            key={label}
            variant="ghost"
            size="sm"
            className="text-white/80 hover:bg-white/10 hover:text-white"
            onClick={() => animateToPosition(position)}
          >
            {label}
          </Button>
        ))}
      </div>
    </div>
  );
}
