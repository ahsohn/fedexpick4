import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { ESPNClient } from "@/lib/espn/client";
import { processUserPicks } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { tournament_id } = await request.json();
    if (!tournament_id) {
      return NextResponse.json({ error: "tournament_id required" }, { status: 400 });
    }

    const tournaments = await sql`SELECT * FROM tournaments WHERE id = ${tournament_id}`;
    if (tournaments.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const tournament = tournaments[0];

    if (!tournament.espn_event_id) {
      return NextResponse.json({ error: "No ESPN event linked" }, { status: 400 });
    }

    const client = new ESPNClient();
    const leaderboard = await client.getLeaderboard(tournament.espn_event_id as string);

    const fieldEspnIds = new Set(leaderboard.entries.map((e) => e.player.espnId));
    const fedexPointsByEspnId = new Map<string, number>();
    for (const entry of leaderboard.entries) {
      if (entry.fedexPoints !== null) {
        fedexPointsByEspnId.set(entry.player.espnId, entry.fedexPoints);
      }
    }

    // Fetch picks with golfer and user names in a single query (no per-row
    // lookups). espn_id feeds the scoring engine; the names are for display.
    const picks = await sql`
      SELECT p.id, p.user_id, p.golfer_id, p.pick_type, p.pick_order,
             g.espn_id, g.name AS golfer_name, u.name AS user_name
      FROM picks p
      JOIN golfers g ON p.golfer_id = g.id
      JOIN users u ON p.user_id = u.id
      WHERE p.tournament_id = ${tournament_id}
      ORDER BY p.user_id, p.pick_order
    `;

    const picksByUser = new Map<number, any[]>();
    const userNameById = new Map<number, string>();
    const golferNameById = new Map<number, string>();
    for (const pick of picks) {
      const userId = pick.user_id as number;
      if (!picksByUser.has(userId)) picksByUser.set(userId, []);
      picksByUser.get(userId)!.push(pick);
      userNameById.set(userId, (pick.user_name as string) ?? "Unknown");
      golferNameById.set(pick.golfer_id as number, (pick.golfer_name as string) ?? "Unknown");
    }

    const results: any[] = [];
    for (const [userId, userPicks] of Array.from(picksByUser.entries())) {
      const scored = processUserPicks(userPicks, fieldEspnIds, fedexPointsByEspnId);
      const userName = userNameById.get(userId) ?? "Unknown";

      const enriched = scored.map((s) => ({
        ...s,
        golfer_name: golferNameById.get(s.golfer_id) ?? "Unknown",
      }));

      const weekTotal = enriched
        .filter((p) => (p.pick_type === "starter" && !p.was_subbed_out) || (p.pick_type === "backup" && p.was_activated))
        .reduce((sum, p) => sum + p.fedex_points, 0);

      results.push({
        user_id: userId,
        user_name: userName,
        picks: enriched,
        week_total: weekTotal,
      });
    }

    return NextResponse.json({ tournament: tournament.name, results });
  } catch (error) {
    console.error("Fetch scores error:", error);
    return NextResponse.json({ error: "Failed to fetch scores" }, { status: 500 });
  }
}
