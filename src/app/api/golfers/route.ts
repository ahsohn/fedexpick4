import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ESPNClient } from "@/lib/espn/client";

export const dynamic = "force-dynamic";

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

    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString(), 10);

    // A golfer is "used" only if they actually played as a starter, or were an
    // activated backup, in a DIFFERENT tournament this season. The current
    // tournament (tId) is excluded so a user can edit their own pending picks.
    const golfers = await sql`
      SELECT
        g.id,
        g.espn_id,
        g.name,
        g.active,
        g.created_at,
        tf.in_field,
        used.tournament_name as used_in_week
      FROM golfers g
      LEFT JOIN tournament_field tf ON g.id = tf.golfer_id AND tf.tournament_id = ${tId}
      LEFT JOIN (
        SELECT DISTINCT p.golfer_id, t.name as tournament_name
        FROM picks p
        JOIN tournaments t ON p.tournament_id = t.id
        WHERE p.user_id = ${uId}
          AND t.season_year = ${season}
          AND t.id != ${tId}
          AND (
            (p.pick_type = 'starter' AND p.was_subbed_out = false)
            OR (p.pick_type = 'backup' AND p.was_activated = true)
          )
      ) used ON g.id = used.golfer_id
      WHERE g.active = true
      ORDER BY g.name ASC
    `;

    // Best-effort FedEx Cup ranking from ESPN, keyed by espn_id. If ESPN is
    // unavailable, ranks are simply omitted (null) and the page still works.
    const rankByEspnId = new Map<string, number>();
    try {
      const standings = await new ESPNClient().getFedexStandings(season);
      for (const s of standings) {
        if (s.player.espnId) rankByEspnId.set(s.player.espnId, s.rank);
      }
    } catch (err) {
      console.error("FedEx standings fetch failed (ranks omitted):", err);
    }

    const withRank = golfers.map((g: any) => ({
      ...g,
      fedex_rank: rankByEspnId.get(g.espn_id) ?? null,
    }));

    const tournament = await sql`SELECT field_last_updated FROM tournaments WHERE id = ${tId}`;

    return NextResponse.json({
      golfers: withRank,
      field_last_updated: tournament[0]?.field_last_updated ?? null,
    });
  } catch (error) {
    console.error("Get golfers error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
