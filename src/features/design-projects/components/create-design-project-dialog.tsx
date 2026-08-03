"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { designProjectCategoryOptions } from "@/lib/validations/design-project";

export function CreateDesignProjectDialog({
  serviceRequestId,
  customerName,
  designers,
}: {
  serviceRequestId: string;
  customerName: string;
  designers: { id: string; name: string | null }[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [name, setName] = useState(`${customerName}'s Design`);
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState<string>("");
  const [assignedDesignerId, setAssignedDesignerId] = useState<string>("");

  async function handleSubmit() {
    if (!name.trim()) {
      toast.error("Give this design project a name");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/business/design-projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceRequestId,
          name: name.trim(),
          description: description.trim() || undefined,
          category: category || undefined,
          assignedDesignerId: assignedDesignerId || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not create the design project");
      toast.success("Design project created");
      setOpen(false);
      router.push(`/dashboard/design-projects/${data.project.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not create the design project");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="w-full gap-1.5">
          <Palette className="size-4" /> Start Design Project
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Start a design project</DialogTitle>
          <DialogDescription>
            This begins the design brief, versions, and approval flow with {customerName}.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Project name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} disabled={submitting} />
          </div>
          <div className="space-y-1.5">
            <Label>Category (optional)</Label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a category" />
              </SelectTrigger>
              <SelectContent>
                {designProjectCategoryOptions.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {designers.length > 0 && (
            <div className="space-y-1.5">
              <Label>Assign designer (optional)</Label>
              <Select value={assignedDesignerId} onValueChange={setAssignedDesignerId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Unassigned" />
                </SelectTrigger>
                <SelectContent>
                  {designers.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name ?? "Unnamed staff"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
          <div className="space-y-1.5">
            <Label>Notes (optional)</Label>
            <Textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} disabled={submitting} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={submitting}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting ? "Creating..." : "Create Project"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
