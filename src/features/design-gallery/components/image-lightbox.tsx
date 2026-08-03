"use client";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";

export function ImageLightbox({ url, onOpenChange }: { url: string | null; onOpenChange: (open: boolean) => void }) {
  return (
    <Dialog open={!!url} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl border-none bg-transparent p-0 shadow-none ring-0">
        <DialogTitle className="sr-only">Design image preview</DialogTitle>
        {url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={url} alt="" className="max-h-[85vh] w-full rounded-2xl object-contain" />
        )}
      </DialogContent>
    </Dialog>
  );
}
