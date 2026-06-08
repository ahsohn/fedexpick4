import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    if (!userId) return NextResponse.json({ error: "user_id required" }, { status: 400 });

    const uId = parseInt(userId, 10);
    if (Number.isNaN(uId)) return NextResponse.json({ error: "Invalid user_id" }, { status: 400 });

    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString());

    const picks = await sql`
      SELECT p.*, g.name as golfer_name, t.name as tournament_name, t.deadline
      FROM picks p
      JOIN golfers g ON p.golfer_id = g.id
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.user_id = ${uId}
        AND t.season_year = ${season}
      ORDER BY t.deadline DESC NULLS LAST, p.pick_order ASC
    `;

    const usedGolfers = await sql`
      SELECT DISTINCT g.id, g.name
      FROM picks p
      JOIN golfers g ON p.golfer_id = g.id
      JOIN tournaments t ON p.tournament_id = t.id
      WHERE p.user_id = ${uId}
        AND t.season_year = ${season}
        AND (
          (p.pick_type = 'starter' AND p.was_subbed_out = false)
          OR (p.pick_type = 'backup' AND p.was_activated = true)
        )
      ORDER BY g.name
    `;

    const byTournament = new Map<string, any>();
    for (const pick of picks) {
      const tName = pick.tournament_name as string;
      if (!byTournament.has(tName)) {
        byTournament.set(tName, { tournament_name: tName, deadline: pick.deadline, picks: [] });
      }
      byTournament.get(tName)!.picks.push(pick);
    }

    return NextResponse.json({
      history: Array.from(byTournament.values()),
      used_golfers: usedGolfers,
      used_count: usedGolfers.length,
    });
  } catch (error) {
    console.error("Get history error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
