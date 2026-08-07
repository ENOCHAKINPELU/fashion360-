"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";

// Customer-side entry point to start (or resume) a conversation with a
// business from its public profile — mirrors CustomerQuickActions'
// business-side "Message" action.
export function MessageBusinessButton({ businessId }: { businessId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function start() {
    setLoading(true);
    try {
      const res = await fetch("/api/customer/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start a conversation");
      router.push(`/account/messages?open=${data.conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start a conversation");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Button variant="outline" className="w-full gap-1.5" onClick={start} disabled={loading}>
      <MessageSquare className="size-4" /> {loading ? "Opening..." : "Message"}
    </Button>
  );
}
