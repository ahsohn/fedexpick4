import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ESPNClient } from "@/lib/espn/client";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const tournamentId = parseInt(params.tournamentId, 10);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
    }

    const tournaments = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
    if (tournaments.length === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tournament = tournaments[0];

    // Check if field needs auto-refresh (stale > 6 hours and before deadline)
    const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
    const isPastDeadline = tournament.deadline && new Date(tournament.deadline as string) < new Date();
    const isStale = !tournament.field_last_updated || (tournament.field_last_updated as string) < sixHoursAgo;

    if (isStale && !isPastDeadline && tournament.espn_event_id) {
      await refreshField(tournamentId, tournament.espn_event_id as string);
    }

    const field = await sql`
      SELECT tf.golfer_id, tf.in_field, g.name, g.espn_id
      FROM tournament_field tf
      JOIN golfers g ON tf.golfer_id = g.id
      WHERE tf.tournament_id = ${tournamentId}
    `;

    const lastUpdated = (await sql`SELECT field_last_updated FROM tournaments WHERE id = ${tournamentId}`)[0]?.field_last_updated;

    return NextResponse.json({ field, field_last_updated: lastUpdated });
  } catch (error) {
    console.error("Get field error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST = manual refresh
export async function POST(
  request: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  try {
    const tournamentId = parseInt(params.tournamentId, 10);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
    }

    const tournaments = await sql`SELECT espn_event_id FROM tournaments WHERE id = ${tournamentId}`;
    if (tournaments.length === 0 || !tournaments[0].espn_event_id) {
      return NextResponse.json({ error: "No ESPN event linked" }, { status: 400 });
    }

    await refreshField(tournamentId, tournaments[0].espn_event_id as string);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Refresh field error:", error);
    return NextResponse.json({ error: "Refresh failed" }, { status: 500 });
  }
}

async function refreshField(tournamentId: number, espnEventId: string) {
  const client = new ESPNClient();
  const leaderboard = await client.getLeaderboard(espnEventId);

  await sql`DELETE FROM tournament_field WHERE tournament_id = ${tournamentId}`;

  for (const entry of leaderboard.entries) {
    if (!entry.player.espnId) continue;

    await sql`
      INSERT INTO golfers (espn_id, name)
      VALUES (${entry.player.espnId}, ${entry.player.displayName})
      ON CONFLICT (espn_id) DO NOTHING
    `;

    const golferRows = await sql`SELECT id FROM golfers WHERE espn_id = ${entry.player.espnId}`;
    if (golferRows.length === 0) continue;

    await sql`
      INSERT INTO tournament_field (tournament_id, golfer_id, in_field)
      VALUES (${tournamentId}, ${golferRows[0].id}, true)
      ON CONFLICT (tournament_id, golfer_id) DO UPDATE SET in_field = true
    `;
  }

  await sql`UPDATE tournaments SET field_last_updated = NOW() WHERE id = ${tournamentId}`;
}
