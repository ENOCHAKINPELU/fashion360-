"use client";

import { useState } from "react";
import { ImageOff } from "lucide-react";
import { ImageLightbox } from "@/features/design-gallery/components/image-lightbox";
import { cn } from "@/lib/utils";

export function DesignImageGallery({
  mainImageUrl,
  images,
}: {
  mainImageUrl: string | null;
  images: { id: string; url: string }[];
}) {
  const allImages = [
    ...(mainImageUrl ? [{ id: "main", url: mainImageUrl }] : []),
    ...images.filter((img) => img.url !== mainImageUrl),
  ];
  const [active, setActive] = useState(allImages[0]?.url ?? null);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);

  if (allImages.length === 0) {
    return (
      <div className="flex aspect-square w-full items-center justify-center rounded-2xl border border-border bg-muted text-muted-foreground">
        <ImageOff className="size-10" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={() => active && setLightboxUrl(active)}
        className="block w-full overflow-hidden rounded-2xl border border-border bg-muted"
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={active ?? ""} alt="" className="aspect-square w-full object-cover" />
      </button>

      {allImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto scrollbar-thin">
          {allImages.map((img) => (
            <button
              key={img.id}
              type="button"
              onClick={() => setActive(img.url)}
              className={cn(
                "size-16 shrink-0 overflow-hidden rounded-xl border-2 transition-colors",
                active === img.url ? "border-primary" : "border-transparent"
              )}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={img.url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      )}

      <ImageLightbox url={lightboxUrl} onOpenChange={(open) => !open && setLightboxUrl(null)} />
    </div>
  );
}
