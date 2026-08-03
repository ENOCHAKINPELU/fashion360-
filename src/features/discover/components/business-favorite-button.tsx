"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";

export function BusinessFavoriteButton({ businessId, initialFavorited }: { businessId: string; initialFavorited: boolean }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [favorited, setFavorited] = useState(initialFavorited);
  const [submitting, setSubmitting] = useState(false);

  if (status !== "authenticated" || session.user.role !== "CUSTOMER") return null;

  async function toggle() {
    setSubmitting(true);
    const next = !favorited;
    setFavorited(next);
    try {
      const res = await fetch(`/api/businesses/${businessId}/favorite`, { method: next ? "POST" : "DELETE" });
      if (!res.ok) throw new Error();
      router.refresh();
    } catch {
      setFavorited(!next);
      toast.error("Could not update favorites");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Button variant="outline" size="sm" className="gap-1.5" onClick={toggle} disabled={submitting}>
      <Heart className={favorited ? "size-4 fill-danger text-danger" : "size-4"} />
      {favorited ? "Favorited" : "Favorite"}
    </Button>
  );
}
