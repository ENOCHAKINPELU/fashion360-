"use client";

import { useRef, useState } from "react";
import { ImageIcon, Maximize, Minimize, RotateCcw, ZoomIn, ZoomOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/shared/components/empty-state";
import { cn } from "@/lib/utils";

const MIN_ZOOM = 1;
const MAX_ZOOM = 3;

// Deliberately a flat, honest 2D image viewer — zoom and pan only, no
// rotation gimmick that would misrepresent a 2D image as a 3D garment.
export function TwoDPreviewViewer({ imageUrl, className }: { imageUrl: string | null; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dragState = useRef<{ startX: number; startY: number; originX: number; originY: number } | null>(null);

  function reset() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function zoomIn() {
    setZoom((z) => Math.min(MAX_ZOOM, z + 0.5));
  }

  function zoomOut() {
    setZoom((z) => {
      const next = Math.max(MIN_ZOOM, z - 0.5);
      if (next === 1) setOffset({ x: 0, y: 0 });
      return next;
    });
  }

  function onPointerDown(e: React.PointerEvent) {
    if (zoom === 1) return;
    dragState.current = { startX: e.clientX, startY: e.clientY, originX: offset.x, originY: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }

  function onPointerMove(e: React.PointerEvent) {
    if (!dragState.current) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    setOffset({ x: dragState.current.originX + dx, y: dragState.current.originY + dy });
  }

  function onPointerUp() {
    dragState.current = null;
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
        "relative flex flex-col overflow-hidden rounded-2xl border border-border bg-muted",
        isFullscreen && "bg-muted p-4",
        className
      )}
    >
      <div className="absolute top-3 left-3 z-10">
        <Badge className="gap-1 bg-muted text-foreground hover:bg-muted" variant="outline">
          <ImageIcon className="size-3" /> 2D Design Preview
        </Badge>
      </div>

      <div className="absolute top-3 right-3 z-10 flex gap-1.5">
        <Button variant="secondary" size="icon-sm" onClick={zoomOut} disabled={zoom <= MIN_ZOOM} aria-label="Zoom out">
          <ZoomOut className="size-3.5" />
        </Button>
        <Button variant="secondary" size="icon-sm" onClick={zoomIn} disabled={zoom >= MAX_ZOOM} aria-label="Zoom in">
          <ZoomIn className="size-3.5" />
        </Button>
        <Button variant="secondary" size="icon-sm" onClick={reset} aria-label="Reset view">
          <RotateCcw className="size-3.5" />
        </Button>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={toggleFullscreen}
          aria-label={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
        >
          {isFullscreen ? <Minimize className="size-3.5" /> : <Maximize className="size-3.5" />}
        </Button>
      </div>

      <div
        className="relative flex flex-1 items-center justify-center overflow-hidden"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        style={{ cursor: zoom > 1 ? "grab" : "default", touchAction: "none" }}
      >
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt="Design preview"
            className="max-h-full max-w-full object-contain select-none"
            draggable={false}
            style={{ transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`, transition: dragState.current ? "none" : "transform 0.15s ease" }}
          />
        ) : (
          <EmptyState icon={ImageIcon} title="No preview image yet" className="border-none" />
        )}
      </div>
    </div>
  );
}
