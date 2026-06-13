import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { sql } from "@/lib/db";
import { refreshField, ensureFieldFresh } from "@/lib/field";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { tournamentId: string } }
) {
  noStore();
  try {
    const tournamentId = parseInt(params.tournamentId, 10);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
    }

    const tournaments = await sql`SELECT * FROM tournaments WHERE id = ${tournamentId}`;
    if (tournaments.length === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    const tournament = tournaments[0] as any;

    const lastUpdated = await ensureFieldFresh({
      id: tournamentId,
      espn_event_id: tournament.espn_event_id,
      deadline: tournament.deadline,
      field_last_updated: tournament.field_last_updated,
    });

    const field = await sql`
      SELECT tf.golfer_id, tf.in_field, g.name, g.espn_id
      FROM tournament_field tf
      JOIN golfers g ON tf.golfer_id = g.id
      WHERE tf.tournament_id = ${tournamentId}
    `;

    return NextResponse.json({ field, field_last_updated: lastUpdated });
  } catch (error) {
    console.error("Get field error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST = manual refresh (always refreshes, ignores staleness)
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
