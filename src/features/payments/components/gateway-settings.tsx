"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Link2, Unlink, ShieldCheck, Copy } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";
import { paymentProviderOptions } from "@/lib/validations/payment-gateway";
import { formatDate } from "@/lib/utils";
import type { PaymentGatewayConnectionData } from "@/features/payments/types";

export function GatewaySettings({ connections, businessId }: { connections: PaymentGatewayConnectionData[]; businessId: string }) {
  const router = useRouter();
  const [provider, setProvider] = useState<"PAYSTACK" | "FLUTTERWAVE" | "STRIPE">("PAYSTACK");
  const [publicKey, setPublicKey] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [webhookSecret, setWebhookSecret] = useState("");
  const [currency, setCurrency] = useState("NGN");
  const [connecting, setConnecting] = useState(false);
  const [testingProvider, setTestingProvider] = useState<string | null>(null);
  const [disconnectProvider, setDisconnectProvider] = useState<string | null>(null);

  async function connect() {
    setConnecting(true);
    try {
      const res = await fetch(`/api/payment-gateway/${provider}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, publicKey: publicKey || undefined, secretKey, webhookSecret: webhookSecret || undefined, currency }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not connect gateway");
      toast.success(`${provider} connected`);
      setPublicKey("");
      setSecretKey("");
      setWebhookSecret("");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not connect gateway");
    } finally {
      setConnecting(false);
    }
  }

  async function testConnection(p: string) {
    setTestingProvider(p);
    try {
      const res = await fetch(`/api/payment-gateway/${p}/test`, { method: "POST" });
      const data = await res.json();
      if (data.success) toast.success(data.message);
      else toast.error(data.message ?? "Connection test failed");
      router.refresh();
    } catch {
      toast.error("Could not test connection");
    } finally {
      setTestingProvider(null);
    }
  }

  async function disconnect(p: string) {
    const res = await fetch(`/api/payment-gateway/${p}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not disconnect gateway");
      return;
    }
    toast.success(`${p} disconnected`);
    router.refresh();
  }

  const webhookUrl = (p: string) => `${typeof window !== "undefined" ? window.location.origin : ""}/api/payments/webhook/${p}/${businessId}`;

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-foreground">Connect a Custom Gateway (not required)</p>
            <p className="text-xs text-muted-foreground">
              You don&apos;t need this. Fashion360 already collects customer payments for you and transfers your
              share to your bank account under Payouts — no gateway or API key needed. This is only for a business
              that specifically wants to route payments through its own gateway account instead.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as typeof provider)}>
                <SelectTrigger className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {paymentProviderOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label>Currency</Label>
              <Input value={currency} onChange={(e) => setCurrency(e.target.value.toUpperCase())} maxLength={3} placeholder="NGN" />
            </div>
            <div className="space-y-1.5">
              <Label>Public Key</Label>
              <Input value={publicKey} onChange={(e) => setPublicKey(e.target.value)} placeholder="pk_..." />
            </div>
            <div className="space-y-1.5">
              <Label>Secret Key</Label>
              <Input type="password" value={secretKey} onChange={(e) => setSecretKey(e.target.value)} placeholder="sk_..." />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <Label>Webhook Secret (optional)</Label>
              <Input type="password" value={webhookSecret} onChange={(e) => setWebhookSecret(e.target.value)} placeholder="Used to verify incoming webhooks" />
            </div>
          </div>

          <div className="rounded-xl border border-border bg-surface p-3 text-xs text-muted-foreground">
            <p className="mb-1 flex items-center gap-1.5 font-medium text-foreground">
              <ShieldCheck className="size-3.5" /> Webhook URL to configure in {provider}
            </p>
            <div className="flex items-center gap-2">
              <code className="flex-1 truncate">{webhookUrl(provider)}</code>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => {
                  navigator.clipboard.writeText(webhookUrl(provider));
                  toast.success("Webhook URL copied");
                }}
                aria-label="Copy webhook URL"
              >
                <Copy className="size-3.5" />
              </Button>
            </div>
          </div>

          <Button onClick={connect} disabled={connecting || !secretKey} className="gap-1.5">
            <Link2 className="size-4" /> {connecting ? "Connecting..." : "Connect Gateway"}
          </Button>
        </CardContent>
      </Card>

      <div className="space-y-3">
        {connections.length === 0 && <p className="text-sm text-muted-foreground">No payment gateways connected yet.</p>}
        {connections.map((conn) => (
          <Card key={conn.id} className="border-none shadow-sm">
            <CardContent className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                {conn.status === "CONNECTED" ? (
                  <CheckCircle2 className="size-5 text-success" />
                ) : conn.status === "ERROR" ? (
                  <XCircle className="size-5 text-danger" />
                ) : (
                  <XCircle className="size-5 text-muted-foreground" />
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-foreground">{conn.provider}</p>
                    {conn.isActive && <Badge className="bg-accent-soft text-primary hover:bg-accent-soft">Active</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {conn.currency} · Secret: {conn.secretKeyMasked ?? "not set"} · Webhook: {conn.webhookConfigured ? "configured" : "not set"}
                  </p>
                  {conn.lastTestedAt && (
                    <p className="text-xs text-muted-foreground">
                      Last tested {formatDate(conn.lastTestedAt)}: {conn.lastTestResult}
                    </p>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={() => testConnection(conn.provider)} disabled={testingProvider === conn.provider}>
                  {testingProvider === conn.provider ? "Testing..." : "Test Connection"}
                </Button>
                {conn.status === "CONNECTED" && (
                  <Button variant="ghost" size="sm" className="gap-1 text-danger hover:text-danger" onClick={() => setDisconnectProvider(conn.provider)}>
                    <Unlink className="size-3.5" /> Disconnect
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <ConfirmDialog
        open={!!disconnectProvider}
        onOpenChange={(open) => !open && setDisconnectProvider(null)}
        title="Disconnect this payment gateway?"
        description="Customers will no longer be able to pay online through this provider until it's reconnected."
        confirmLabel="Disconnect"
        destructive
        onConfirm={() => {
          if (disconnectProvider) return disconnect(disconnectProvider);
        }}
      />
    </div>
  );
}
