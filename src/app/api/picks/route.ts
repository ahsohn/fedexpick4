import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// GET user's picks for a tournament
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const tournamentId = searchParams.get("tournament_id");
    const userId = searchParams.get("user_id");

    if (!tournamentId || !userId) {
      return NextResponse.json({ error: "tournament_id and user_id required" }, { status: 400 });
    }

    const tId = parseInt(tournamentId, 10);
    const uId = parseInt(userId, 10);
    if (Number.isNaN(tId) || Number.isNaN(uId)) {
      return NextResponse.json({ error: "Invalid tournament_id or user_id" }, { status: 400 });
    }

    const picks = await sql`
      SELECT p.*, g.name as golfer_name
      FROM picks p
      JOIN golfers g ON p.golfer_id = g.id
      WHERE p.tournament_id = ${tId}
        AND p.user_id = ${uId}
      ORDER BY p.pick_order ASC
    `;

    return NextResponse.json(picks);
  } catch (error) {
    console.error("Get picks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — submit or replace picks for a tournament
export async function POST(request: NextRequest) {
  try {
    const { tournament_id, user_id, picks } = await request.json();

    if (!tournament_id || !user_id || !picks || picks.length !== 5) {
      return NextResponse.json(
        { error: "Must submit exactly 4 starters + 1 backup" },
        { status: 400 }
      );
    }

    // Validate tournament is open
    const tournaments = await sql`SELECT status, deadline FROM tournaments WHERE id = ${tournament_id}`;
    if (tournaments.length === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    if (tournaments[0].status !== "open") {
      return NextResponse.json({ error: "Tournament is not open for picks" }, { status: 400 });
    }
    if (tournaments[0].deadline && new Date(tournaments[0].deadline as string) < new Date()) {
      return NextResponse.json({ error: "Deadline has passed" }, { status: 400 });
    }

    // Validate pick structure: 4 starters + 1 backup, all distinct golfers
    const starters = picks.filter((p: any) => p.pick_type === "starter");
    const backups = picks.filter((p: any) => p.pick_type === "backup");
    const distinctGolfers = new Set(picks.map((p: any) => p.golfer_id));
    if (distinctGolfers.size !== picks.length) {
      return NextResponse.json({ error: "Cannot pick the same golfer twice" }, { status: 400 });
    }
    if (starters.length !== 4 || backups.length !== 1) {
      return NextResponse.json({ error: "Must have exactly 4 starters and 1 backup" }, { status: 400 });
    }

    // Validate no used golfers (except unused backups from prior weeks)
    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString());

    const usedGolfers = await sql`
      SELECT DISTINCT p.golfer_id FROM picks p
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.user_id = ${user_id}
        AND t.season_year = ${season}
        AND t.id != ${tournament_id}
        AND (
          (p.pick_type = 'starter' AND p.was_subbed_out = false)
          OR (p.pick_type = 'backup' AND p.was_activated = true)
        )
    `;
    const usedIds = new Set(usedGolfers.map((r: any) => r.golfer_id));

    if (picks.some((pick: any) => usedIds.has(pick.golfer_id))) {
      return NextResponse.json(
        { error: "One or more selected golfers have already been used this season." },
        { status: 400 }
      );
    }

    // Derive pick_order server-side (starters 1-4 in submitted order, backup 5)
    // so a buggy client can't send colliding orders. Replace existing picks for
    // this (user, tournament) atomically: a failed insert must not leave the
    // user with their old picks deleted and the new ones half-written.
    const insertStatements = [
      ...starters.map((pick: any, i: number) =>
        sql`
          INSERT INTO picks (user_id, tournament_id, golfer_id, pick_type, pick_order)
          VALUES (${user_id}, ${tournament_id}, ${pick.golfer_id}, 'starter', ${i + 1})
        `
      ),
      sql`
        INSERT INTO picks (user_id, tournament_id, golfer_id, pick_type, pick_order)
        VALUES (${user_id}, ${tournament_id}, ${backups[0].golfer_id}, 'backup', 5)
      `,
    ];

    await sql.transaction([
      sql`DELETE FROM picks WHERE user_id = ${user_id} AND tournament_id = ${tournament_id}`,
      ...insertStatements,
    ]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Submit picks error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
