"use client";

import { useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { CheckCircle2, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { COUNTRIES } from "@/lib/constants/countries";

const COPY = {
  CUSTOMER: {
    title: "Join the Customer Waitlist",
    description: "Be among the first to discover and work with fashion designers on Fashion360.",
  },
  DESIGNER: {
    title: "Join as a Founding Designer",
    description: "Be among the first fashion designers to build your digital presence on Fashion360.",
  },
} as const;

interface FormState {
  name: string;
  email: string;
  phone: string;
  city: string;
  country: string;
  fashionInterest: string;
  businessName: string;
  specialty: string;
  yearsExperience: string;
  portfolioUrl: string;
}

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  phone: "",
  city: "",
  country: "",
  fashionInterest: "",
  businessName: "",
  specialty: "",
  yearsExperience: "",
  portfolioUrl: "",
};

export function WaitlistDialog({
  open,
  onOpenChange,
  role,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  role: "CUSTOMER" | "DESIGNER";
}) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [joined, setJoined] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reduceMotion = useReducedMotion();

  function set<K extends keyof FormState>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function submit() {
    setError(null);
    if (!form.name.trim()) return setError("Enter your name");
    if (!form.email.trim()) return setError("Enter your email address");
    if (!form.phone.trim()) return setError("Enter your phone or WhatsApp number");

    setSubmitting(true);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          source: "landing-page",
          name: form.name,
          email: form.email,
          phone: form.phone,
          city: form.city || undefined,
          country: form.country || undefined,
          ...(role === "CUSTOMER"
            ? { fashionInterest: form.fashionInterest || undefined }
            : {
                businessName: form.businessName || undefined,
                specialty: form.specialty || undefined,
                yearsExperience: form.yearsExperience ? Number(form.yearsExperience) : undefined,
                portfolioUrl: form.portfolioUrl || undefined,
              }),
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not join the waitlist");
      setJoined(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not join the waitlist");
    } finally {
      setSubmitting(false);
    }
  }

  function handleOpenChange(next: boolean) {
    onOpenChange(next);
    if (!next) {
      // Reset after the close animation rather than mid-transition
      setTimeout(() => {
        setForm(EMPTY_FORM);
        setJoined(false);
        setError(null);
      }, 200);
    }
  }

  const copy = COPY[role];

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-sm">
        <AnimatePresence mode="wait">
        {joined ? (
          <motion.div
            key="success"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.35, ease: "easeOut" }}
            className="flex flex-col items-center py-4 text-center"
          >
            <motion.div
              initial={{ scale: reduceMotion ? 1 : 0 }}
              animate={{ scale: 1 }}
              transition={reduceMotion ? { duration: 0.2 } : { type: "spring", stiffness: 300, damping: 15, delay: 0.1 }}
            >
              <CheckCircle2 className="size-10 text-success" />
            </motion.div>
            <p className="mt-4 text-base font-semibold text-foreground">You&apos;re on the list.</p>
            <p className="mt-1.5 text-sm text-muted-foreground">
              We&apos;ll let you know when Fashion360 is ready.
            </p>
            <Button className="mt-6 w-full" onClick={() => handleOpenChange(false)}>
              Done
            </Button>
          </motion.div>
        ) : (
          <motion.div
            key="form"
            initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: reduceMotion ? 1 : 0.97 }}
            transition={{ duration: 0.25, ease: "easeOut" }}
          >
            <DialogHeader>
              <DialogTitle>{copy.title}</DialogTitle>
              <DialogDescription>{copy.description}</DialogDescription>
            </DialogHeader>
            <div className="space-y-3">
              <div className="space-y-1.5">
                <Label htmlFor="wl-name">{role === "DESIGNER" ? "Full Name" : "Name"}</Label>
                <Input id="wl-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Your full name" />
              </div>

              {role === "DESIGNER" && (
                <div className="space-y-1.5">
                  <Label htmlFor="wl-business">Business Name (optional)</Label>
                  <Input id="wl-business" value={form.businessName} onChange={(e) => set("businessName", e.target.value)} placeholder="Your fashion brand or studio" />
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="wl-email">Email</Label>
                <Input id="wl-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="you@example.com" />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="wl-phone">Phone / WhatsApp</Label>
                <Input id="wl-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+234..." />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="wl-city">City (optional)</Label>
                  <Input id="wl-city" value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="Your city" />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="wl-country">Country (optional)</Label>
                  <Select value={form.country} onValueChange={(value) => set("country", value)}>
                    <SelectTrigger id="wl-country" className="w-full">
                      <SelectValue placeholder="Select" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((country) => (
                        <SelectItem key={country} value={country}>
                          {country}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {role === "CUSTOMER" ? (
                <div className="space-y-1.5">
                  <Label htmlFor="wl-interest">Fashion Interest (optional)</Label>
                  <Input
                    id="wl-interest"
                    value={form.fashionInterest}
                    onChange={(e) => set("fashionInterest", e.target.value)}
                    placeholder="e.g. bridal, ready-to-wear, streetwear"
                  />
                </div>
              ) : (
                <>
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-specialty">Fashion Specialty (optional)</Label>
                    <Input id="wl-specialty" value={form.specialty} onChange={(e) => set("specialty", e.target.value)} placeholder="e.g. bridal couture, tailoring" />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-experience">Years of Experience (optional)</Label>
                    <Input
                      id="wl-experience"
                      type="number"
                      min={0}
                      max={80}
                      value={form.yearsExperience}
                      onChange={(e) => set("yearsExperience", e.target.value)}
                      placeholder="e.g. 5"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="wl-portfolio">Instagram / Portfolio Link (optional)</Label>
                    <Input id="wl-portfolio" value={form.portfolioUrl} onChange={(e) => set("portfolioUrl", e.target.value)} placeholder="@yourhandle or a link" />
                  </div>
                </>
              )}

              {error && <p className="text-xs text-danger">{error}</p>}
            </div>
            <Button className="w-full" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="size-4 animate-spin" />}
              {submitting ? "Joining..." : "Join the Waitlist"}
            </Button>
          </motion.div>
        )}
        </AnimatePresence>
      </DialogContent>
    </Dialog>
  );
}
