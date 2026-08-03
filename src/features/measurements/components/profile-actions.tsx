"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Pencil, Archive, ArchiveRestore, Copy, Star, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ConfirmDialog } from "@/shared/components/confirm-dialog";

export function ProfileActions({
  profileId,
  name,
  isDefault,
  isArchived,
}: {
  profileId: string;
  name: string;
  isDefault: boolean;
  isArchived: boolean;
}) {
  const router = useRouter();
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState(name);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [busy, setBusy] = useState(false);

  async function rename() {
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName }),
      });
      if (!res.ok) throw new Error("Could not rename profile");
      toast.success("Profile renamed");
      setRenameOpen(false);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function toggleArchive() {
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/profiles/${profileId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isArchived ? "unarchive" : "archive" }),
      });
      if (!res.ok) throw new Error("Could not update profile");
      toast.success(isArchived ? "Profile restored" : "Profile archived");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function duplicate() {
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/profiles/${profileId}/duplicate`, { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Could not duplicate profile");
      toast.success("Profile duplicated");
      router.push(`/dashboard/measurements/profiles/${json.profile.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function setDefault() {
    setBusy(true);
    try {
      const res = await fetch(`/api/measurements/profiles/${profileId}/set-default`, { method: "POST" });
      if (!res.ok) throw new Error("Could not set as default");
      toast.success("Set as default profile");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    const res = await fetch(`/api/measurements/profiles/${profileId}`, { method: "DELETE" });
    if (!res.ok) {
      toast.error("Could not delete profile");
      return;
    }
    toast.success("Profile deleted");
    router.push("/dashboard/measurements");
  }

  return (
    <div className="flex flex-wrap gap-2">
      {!isDefault && !isArchived && (
        <Button variant="outline" size="sm" onClick={setDefault} disabled={busy} className="gap-1.5">
          <Star className="size-3.5" /> Set as Default
        </Button>
      )}
      <Button variant="outline" size="sm" onClick={() => setRenameOpen(true)} className="gap-1.5">
        <Pencil className="size-3.5" /> Rename
      </Button>
      <Button variant="outline" size="sm" onClick={duplicate} disabled={busy} className="gap-1.5">
        <Copy className="size-3.5" /> Duplicate
      </Button>
      <Button variant="outline" size="sm" onClick={toggleArchive} disabled={busy} className="gap-1.5">
        {isArchived ? <ArchiveRestore className="size-3.5" /> : <Archive className="size-3.5" />}
        {isArchived ? "Unarchive" : "Archive"}
      </Button>
      <Button variant="destructive" size="sm" onClick={() => setDeleteOpen(true)} className="gap-1.5">
        <Trash2 className="size-3.5" /> Delete
      </Button>

      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Rename Profile</DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label>Profile Name</Label>
            <Input value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)}>
              Cancel
            </Button>
            <Button onClick={rename} disabled={busy || !newName.trim()}>
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Delete this profile?"
        description="This permanently deletes the profile and all its saved measurements. This cannot be undone."
        confirmLabel="Delete"
        destructive
        onConfirm={remove}
      />
    </div>
  );
}
