import { NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ESPNClient } from "@/lib/espn/client";

export const dynamic = "force-dynamic";

export async function POST() {
  try {
    const client = new ESPNClient({ delayMs: 2000 });
    const season = 2026;
    let discovered = 0;

    // 1. Seed from FedEx Cup standings
    const standings = await client.getFedexStandings(season);
    for (const s of standings) {
      if (!s.player.espnId) continue;
      await sql`
        INSERT INTO golfers (espn_id, name)
        VALUES (${s.player.espnId}, ${s.player.displayName})
        ON CONFLICT (espn_id) DO NOTHING
      `;
      discovered++;
    }

    // 2. Get schedule and scrape each completed tournament's leaderboard
    const schedule = await client.getSchedule(season);
    const completedEvents = schedule.filter(
      (e) => e.status.toLowerCase().includes("complete") || e.status.toLowerCase().includes("final")
    );

    for (const event of completedEvents) {
      try {
        const leaderboard = await client.getLeaderboard(event.eventId);
        for (const entry of leaderboard.entries) {
          if (!entry.player.espnId) continue;
          await sql`
            INSERT INTO golfers (espn_id, name)
            VALUES (${entry.player.espnId}, ${entry.player.displayName})
            ON CONFLICT (espn_id) DO NOTHING
          `;
          discovered++;
        }
      } catch (err) {
        console.error(`Failed to fetch leaderboard for ${event.name}:`, err);
        // Continue with other events
      }
    }

    const totalGolfers = await sql`SELECT COUNT(*) as count FROM golfers`;

    return NextResponse.json({
      success: true,
      eventsScraped: completedEvents.length,
      totalGolfersInDb: Number(totalGolfers[0].count),
    });
  } catch (error) {
    console.error("Seed error:", error);
    return NextResponse.json({ error: "Seed failed" }, { status: 500 });
  }
}
