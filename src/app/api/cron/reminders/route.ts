import { NextResponse } from "next/server";
import { processDueReminders } from "@/lib/appointment-reminders";

// Point an external scheduler (e.g. Vercel Cron) at this route every few
// minutes in production. It's also invoked opportunistically from the
// Appointments Dashboard so reminders still go out without one configured.
export async function GET() {
  const processed = await processDueReminders();
  return NextResponse.json({ processed });
}
