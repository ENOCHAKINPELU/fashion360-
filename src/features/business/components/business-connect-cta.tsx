"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { toast } from "sonner";
import { CheckCircle2, Clock, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";

// Part 6's "Request Service / Connect / Contact Business" CTA, wired to the
// real Part 16 connection workflow — not a placeholder button. Only ever
// shown to a signed-in customer; business staff and signed-out visitors get
// a sign-in prompt instead (there's no "browse as a business" concept here).
export function BusinessConnectCta({ businessId }: { businessId: string }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [relationshipStatus, setRelationshipStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (status !== "authenticated" || session.user.role !== "CUSTOMER") {
      setLoading(false);
      return;
    }
    fetch("/api/business-customer-relationships", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        const match = (d.relationships ?? []).find((r: { businessId: string; status: string }) => r.businessId === businessId);
        setRelationshipStatus(match?.status ?? null);
      })
      .finally(() => setLoading(false));
  }, [status, session, businessId]);

  async function connect() {
    setSubmitting(true);
    try {
      const res = await fetch(`/api/businesses/${businessId}/connect`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send connection request");
      setRelationshipStatus("PENDING");
      toast.success("Connection request sent");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not send connection request");
    } finally {
      setSubmitting(false);
    }
  }

  if (status === "loading" || loading) return null;

  if (status !== "authenticated") {
    return (
      <Button className="w-full gap-1.5" onClick={() => router.push(`/login?callbackUrl=${encodeURIComponent(window.location.pathname)}`)}>
        <UserPlus className="size-4" /> Sign in to Connect
      </Button>
    );
  }

  if (session.user.role !== "CUSTOMER") return null;

  if (relationshipStatus === "ACTIVE") {
    return (
      <Button variant="outline" className="w-full gap-1.5" disabled>
        <CheckCircle2 className="size-4 text-success" /> Connected
      </Button>
    );
  }

  if (relationshipStatus === "PENDING") {
    return (
      <Button variant="outline" className="w-full gap-1.5" disabled>
        <Clock className="size-4" /> Request Pending
      </Button>
    );
  }

  return (
    <Button className="w-full gap-1.5" onClick={connect} disabled={submitting}>
      <UserPlus className="size-4" /> {submitting ? "Sending..." : "Request Service / Connect"}
    </Button>
  );
}
