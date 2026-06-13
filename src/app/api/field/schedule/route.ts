import { NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { ESPNClient } from "@/lib/espn/client";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  try {
    const client = new ESPNClient();
    const season = new Date().getFullYear();
    const schedule = await client.getSchedule(season);
    return NextResponse.json(schedule);
  } catch (error) {
    console.error("Schedule fetch error:", error);
    return NextResponse.json({ error: "Failed to fetch schedule" }, { status: 500 });
  }
}
