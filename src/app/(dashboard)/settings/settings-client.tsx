"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input, Label, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

type Business = {
  name: string;
  currency: string;
  measurementUnit: string;
  workingHours: { text?: string } | null;
  socialLinks: { instagram?: string; facebook?: string; whatsapp?: string } | null;
};

export function SettingsClient({ business }: { business: Business }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/business", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        currency: form.get("currency"),
        measurementUnit: form.get("measurementUnit"),
        workingHoursText: form.get("workingHoursText"),
        instagram: form.get("instagram"),
        facebook: form.get("facebook"),
        whatsapp: form.get("whatsapp"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      toast.error("Could not save settings");
      return;
    }
    toast.success("Settings saved");
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl text-foreground">Settings</h1>
        <p className="text-sm text-muted">Your business profile, preferences, and branding.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Business profile</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Business name</Label>
                <Input id="name" name="name" defaultValue={business.name} />
              </div>
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select id="currency" name="currency" defaultValue={business.currency}>
                  <option value="NGN">Naira (NGN)</option>
                  <option value="USD">US Dollar (USD)</option>
                  <option value="GBP">British Pound (GBP)</option>
                  <option value="EUR">Euro (EUR)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="measurementUnit">Measurement unit</Label>
                <Select id="measurementUnit" name="measurementUnit" defaultValue={business.measurementUnit}>
                  <option value="metric">Metric (cm)</option>
                  <option value="imperial">Imperial (in)</option>
                </Select>
              </div>
              <div>
                <Label htmlFor="workingHoursText">Working hours</Label>
                <Input
                  id="workingHoursText"
                  name="workingHoursText"
                  placeholder="Mon–Sat, 9am–6pm"
                  defaultValue={business.workingHours?.text || ""}
                />
              </div>
              <div>
                <Label htmlFor="instagram">Instagram</Label>
                <Input id="instagram" name="instagram" defaultValue={business.socialLinks?.instagram || ""} />
              </div>
              <div>
                <Label htmlFor="facebook">Facebook</Label>
                <Input id="facebook" name="facebook" defaultValue={business.socialLinks?.facebook || ""} />
              </div>
              <div>
                <Label htmlFor="whatsapp">WhatsApp</Label>
                <Input id="whatsapp" name="whatsapp" defaultValue={business.socialLinks?.whatsapp || ""} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={loading}>
                {loading ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
