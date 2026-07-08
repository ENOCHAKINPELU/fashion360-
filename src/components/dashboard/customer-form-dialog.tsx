"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { Input, Label, Textarea, Select } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

function toList(value: string) {
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

export function CustomerFormDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const form = new FormData(e.currentTarget);

    const res = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.get("name"),
        phone: form.get("phone"),
        email: form.get("email"),
        address: form.get("address"),
        birthday: form.get("birthday") || null,
        gender: form.get("gender"),
        preferredColors: toList(String(form.get("preferredColors") || "")),
        preferredFabrics: toList(String(form.get("preferredFabrics") || "")),
        stylePreferences: toList(String(form.get("stylePreferences") || "")),
        specialNotes: form.get("specialNotes"),
      }),
    });

    setLoading(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      toast.error(body.error || "Could not create customer");
      return;
    }

    toast.success("Customer added");
    onClose();
    router.refresh();
  }

  return (
    <Modal open={open} onClose={onClose} title="New customer">
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <Label htmlFor="name">Full name</Label>
            <Input id="name" name="name" required />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" name="email" type="email" />
          </div>
          <div>
            <Label htmlFor="birthday">Birthday</Label>
            <Input id="birthday" name="birthday" type="date" />
          </div>
          <div>
            <Label htmlFor="gender">Gender</Label>
            <Select id="gender" name="gender" defaultValue="">
              <option value="">Select...</option>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
            </Select>
          </div>
          <div className="col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input id="address" name="address" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="preferredColors">Preferred colors (comma separated)</Label>
            <Input id="preferredColors" name="preferredColors" placeholder="Emerald, Ivory, Gold" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="preferredFabrics">Preferred fabrics (comma separated)</Label>
            <Input id="preferredFabrics" name="preferredFabrics" placeholder="Silk, Ankara, Linen" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="stylePreferences">Style preferences (comma separated)</Label>
            <Input id="stylePreferences" name="stylePreferences" placeholder="Minimal, Structured" />
          </div>
          <div className="col-span-2">
            <Label htmlFor="specialNotes">Special notes</Label>
            <Textarea id="specialNotes" name="specialNotes" rows={3} />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading ? "Saving..." : "Save customer"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
