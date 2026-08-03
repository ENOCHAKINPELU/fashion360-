"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Calendar } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface Occasion {
  key: string;
  label: string;
}

// Part 9: "customer selects WEDDING -> personalize discovery around it."
export function OccasionPicker() {
  const [occasions, setOccasions] = useState<Occasion[]>([]);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;
    fetch("/api/occasions")
      .then((res) => res.json())
      .then((data) => setOccasions(data.occasions ?? []))
      .catch(() => {});
  }, []);

  if (occasions.length === 0) return null;

  return (
    <Card className="border-none shadow-sm">
      <CardContent>
        <div className="mb-3 flex items-center gap-2">
          <Calendar className="size-4 text-primary" />
          <p className="text-sm font-semibold text-foreground">What are you dressing for?</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {occasions.map((o) => (
            <Link key={o.key} href={`/account/occasions/${o.key.toLowerCase()}`}>
              <Badge variant="outline" className="cursor-pointer px-3 py-1.5 text-sm hover:border-primary hover:text-primary">
                {o.label}
              </Badge>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
