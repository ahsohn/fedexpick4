import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  noStore();
  try {
    const tournamentId = parseInt(params.id, 10);
    if (Number.isNaN(tournamentId)) {
      return NextResponse.json({ error: "Invalid tournament id" }, { status: 400 });
    }

    const tournament = await sql`SELECT name, status FROM tournaments WHERE id = ${tournamentId}`;
    if (tournament.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const picks = await sql`
      SELECT
        p.*,
        g.name as golfer_name,
        u.name as user_name
      FROM picks p
      JOIN golfers g ON p.golfer_id = g.id
      JOIN users u ON p.user_id = u.id
      WHERE p.tournament_id = ${tournamentId}
      ORDER BY u.name, p.pick_order
    `;

    const byUser = new Map<number, any>();
    for (const pick of picks) {
      const userId = pick.user_id as number;
      if (!byUser.has(userId)) {
        byUser.set(userId, {
          user_id: userId,
          user_name: pick.user_name,
          picks: [],
          week_total: 0,
        });
      }
      const user = byUser.get(userId)!;
      user.picks.push(pick);
      if (
        (pick.pick_type === "starter" && !pick.was_subbed_out) ||
        (pick.pick_type === "backup" && pick.was_activated)
      ) {
        user.week_total += (pick.fedex_points as number) ?? 0;
      }
    }

    const results = Array.from(byUser.values()).sort((a, b) => b.week_total - a.week_total);

    return NextResponse.json({
      tournament_name: tournament[0].name,
      status: tournament[0].status,
      results,
    });
  } catch (error) {
    console.error("Get results error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
