import { NextResponse } from "next/server";
import { sendDueScheduledBroadcasts } from "@/lib/admin-broadcasts";
import { checkHighDisputeRate } from "@/lib/admin-system-alerts";

// Same pattern as api/cron/reminders — point an external scheduler at this
// in production; it's also invoked opportunistically from the admin
// Notifications dashboard so scheduled broadcasts and the dispute-rate
// check still run without one configured. See lib/admin-broadcasts.ts's
// sendDueScheduledBroadcasts for why "scheduled" doesn't mean a real
// background job queue in this deployment.
export async function GET() {
  const [broadcastsSent, disputeRateAlert] = await Promise.all([sendDueScheduledBroadcasts(), checkHighDisputeRate()]);
  return NextResponse.json({ broadcastsSent, disputeRateAlertRaised: !!disputeRateAlert });
}
