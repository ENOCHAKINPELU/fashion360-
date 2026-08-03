"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CustomerActivityTimeline, type ActivityItem } from "@/features/customers/components/customer-activity-timeline";

export function CustomerActivityLogTab({
  customerId,
  initialActivities,
  initialTotalPages,
}: {
  customerId: string;
  initialActivities: ActivityItem[];
  initialTotalPages: number;
}) {
  const [activities, setActivities] = useState(initialActivities);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(initialTotalPages);
  const [loading, setLoading] = useState(false);

  async function loadMore() {
    setLoading(true);
    try {
      const nextPage = page + 1;
      const res = await fetch(`/api/customers/${customerId}/activity?page=${nextPage}`);
      const data = await res.json();
      setActivities((prev) => [...prev, ...data.activities]);
      setTotalPages(data.pagination.totalPages);
      setPage(nextPage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <CustomerActivityTimeline activities={activities} />
      {page < totalPages && (
        <div className="flex justify-center">
          <Button variant="outline" size="sm" onClick={loadMore} disabled={loading}>
            {loading ? "Loading..." : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}
