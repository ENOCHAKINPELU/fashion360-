"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { genderOptions } from "@/lib/validations/customer";
import type { MeasurementSessionItem } from "@/features/measurements/types";

async function uploadPhoto(file: File): Promise<string> {
  const form = new FormData();
  form.append("file", file);
  form.append("folder", "measurement-photos");
  const res = await fetch("/api/uploads", { method: "POST", body: form });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Upload failed");
  return data.url;
}

export function PhotoSessionForm({ session }: { session: MeasurementSessionItem }) {
  const router = useRouter();
  const [frontFile, setFrontFile] = useState<File | null>(null);
  const [sideFile, setSideFile] = useState<File | null>(null);
  const [frontPreview, setFrontPreview] = useState<string | null>(null);
  const [sidePreview, setSidePreview] = useState<string | null>(null);
  const [heightCm, setHeightCm] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [gender, setGender] = useState("");
  const [consent, setConsent] = useState(false);
  const [stage, setStage] = useState<"upload" | "processing">("upload");

  function pickFile(kind: "front" | "side", file: File | undefined) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (kind === "front") {
      setFrontFile(file);
      setFrontPreview(url);
    } else {
      setSideFile(file);
      setSidePreview(url);
    }
  }

  async function submit() {
    if (!frontFile || !sideFile) {
      toast.error("Upload both front and side photos");
      return;
    }
    if (!heightCm || !weightKg || !gender) {
      toast.error("Height, weight, and gender are required for estimation");
      return;
    }
    if (!consent) {
      toast.error("Customer consent is required before uploading body photos");
      return;
    }

    setStage("processing");
    try {
      const [frontImageUrl, sideImageUrl] = await Promise.all([uploadPhoto(frontFile), uploadPhoto(sideFile)]);

      // Brief pause so the processing state reads as real work, even though
      // the mock provider resolves instantly — matches the intended UX of a
      // real CV pipeline this can be swapped in for later.
      await new Promise((resolve) => setTimeout(resolve, 1400));

      const res = await fetch("/api/measurements/estimate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: session.customerId,
          profileId: session.profileId ?? undefined,
          sessionId: session.id,
          heightCm: Number(heightCm),
          weightKg: Number(weightKg),
          gender,
          frontImageUrl,
          sideImageUrl,
          consent: true,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Estimation failed");

      toast.success("Estimation complete, review the results");
      router.push(`/dashboard/measurements/${json.measurement.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Something went wrong");
      setStage("upload");
    }
  }

  if (stage === "processing") {
    return (
      <Card className="border-none shadow-sm">
        <CardContent className="flex flex-col items-center justify-center gap-4 py-24 text-center">
          <Loader2 className="size-10 animate-spin text-primary" />
          <div>
            <p className="text-lg font-semibold text-foreground">Estimating measurements...</p>
            <p className="text-sm text-muted-foreground">This will only take a moment.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm">
        <CardContent className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <PhotoDropzone label="Front Photo" preview={frontPreview} onFile={(f) => pickFile("front", f)} />
            <PhotoDropzone label="Side Photo" preview={sidePreview} onFile={(f) => pickFile("side", f)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <Label>Height (cm)</Label>
              <Input type="number" min={50} max={250} value={heightCm} onChange={(e) => setHeightCm(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Weight (kg)</Label>
              <Input type="number" min={10} max={300} value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label>Gender</Label>
              <Select value={gender} onValueChange={setGender}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {genderOptions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/40 p-4">
            <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
            <p className="text-xs text-muted-foreground">
              Body photos are sensitive personal data. They&apos;re stored securely and used only to estimate
              measurements for this order. The customer can request deletion at any time.
            </p>
          </div>

          <label className="flex items-center gap-2 text-sm text-foreground">
            <Checkbox checked={consent} onCheckedChange={(v) => setConsent(v === true)} />
            The customer has consented to uploading these photos for measurement estimation.
          </label>

          <Button onClick={submit} className="w-full sm:w-auto">
            Start Estimation
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

function PhotoDropzone({
  label,
  preview,
  onFile,
}: {
  label: string;
  preview: string | null;
  onFile: (file: File | undefined) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex aspect-[3/4] cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-muted/30 text-center hover:border-primary/40 hover:bg-accent-soft/40">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt={label} className="size-full rounded-xl object-cover" />
        ) : (
          <>
            <Upload className="size-6 text-muted-foreground" />
            <span className="text-xs text-muted-foreground">Click to upload</span>
          </>
        )}
        <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => onFile(e.target.files?.[0])} />
      </label>
    </div>
  );
}
