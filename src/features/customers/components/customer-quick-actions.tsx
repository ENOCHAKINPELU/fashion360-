"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  CalendarPlus,
  Ruler,
  ShoppingBag,
  FileText,
  Receipt,
  Mail,
  MessageCircle,
  MessageSquare,
  Printer,
} from "lucide-react";
import { toast } from "sonner";

interface QuickActionsCustomer {
  id: string;
  firstName: string;
  lastName: string;
  customerCode: string;
  email: string | null;
  phone: string | null;
}

export function CustomerQuickActions({ customer }: { customer: QuickActionsCustomer }) {
  const router = useRouter();
  const [messaging, setMessaging] = useState(false);
  const phoneDigits = customer.phone?.replace(/[^\d]/g, "");

  async function startConversation() {
    setMessaging(true);
    try {
      const res = await fetch("/api/business/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customer.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start a conversation");
      router.push(`/dashboard/messages?open=${data.conversation.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not start a conversation");
    } finally {
      setMessaging(false);
    }
  }

  function printCard() {
    const win = window.open("", "_blank", "width=420,height=560");
    if (!win) {
      toast.error("Please allow pop-ups to print the customer card");
      return;
    }
    win.document.write(`
      <html>
        <head><title>${customer.firstName} ${customer.lastName} | Fashion360</title></head>
        <body style="font-family: Inter, Arial, sans-serif; padding: 32px;">
          <h2 style="margin-bottom:4px;">${customer.firstName} ${customer.lastName}</h2>
          <p style="color:#6F7287;margin-top:0;">${customer.customerCode}</p>
          <p>Email: ${customer.email ?? "N/A"}</p>
          <p>Phone: ${customer.phone ?? "N/A"}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  }

  const actions = [
    { label: "Book Appointment", icon: CalendarPlus, href: `/dashboard/appointments?customerId=${customer.id}` },
    { label: "New Measurement", icon: Ruler, href: `/dashboard/measurements?customerId=${customer.id}` },
    { label: "New Order", icon: ShoppingBag, href: `/dashboard/orders/new?customerId=${customer.id}` },
    { label: "Generate Quote", icon: FileText, href: `/dashboard/quotations?customerId=${customer.id}` },
    { label: "Generate Invoice", icon: Receipt, href: `/dashboard/invoices?customerId=${customer.id}` },
  ];

  return (
    <div className="flex flex-wrap gap-2">
      {actions.map((action) => (
        <Link
          key={action.label}
          href={action.href}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
        >
          <action.icon className="size-3.5" /> {action.label}
        </Link>
      ))}
      <button
        onClick={startConversation}
        disabled={messaging}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft disabled:opacity-60"
      >
        <MessageSquare className="size-3.5" /> {messaging ? "Opening..." : "Message"}
      </button>
      <a
        href={customer.email ? `mailto:${customer.email}` : undefined}
        onClick={(e) => !customer.email && (e.preventDefault(), toast.error("No email on file"))}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
      >
        <Mail className="size-3.5" /> Send Email
      </a>
      <a
        href={phoneDigits ? `https://wa.me/${phoneDigits}` : undefined}
        target="_blank"
        rel="noreferrer"
        onClick={(e) => !phoneDigits && (e.preventDefault(), toast.error("No phone number on file"))}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
      >
        <MessageCircle className="size-3.5" /> Send WhatsApp
      </a>
      <button
        onClick={printCard}
        className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface px-3 py-1.5 text-xs font-medium text-foreground transition-colors hover:border-primary/40 hover:bg-accent-soft"
      >
        <Printer className="size-3.5" /> Print Customer Card
      </button>
    </div>
  );
}
