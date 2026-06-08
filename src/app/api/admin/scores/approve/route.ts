import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { recalculateStandings } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { tournament_id, results } = await request.json();
    if (!tournament_id || !results) {
      return NextResponse.json({ error: "tournament_id and results required" }, { status: 400 });
    }

    const updates = [];
    for (const userResult of results) {
      for (const pick of userResult.picks) {
        updates.push(sql`
          UPDATE picks
          SET fedex_points = ${pick.fedex_points},
              was_subbed_out = ${pick.was_subbed_out},
              was_activated = ${pick.was_activated}
          WHERE id = ${pick.pick_id}
        `);
      }
    }
    updates.push(sql`UPDATE tournaments SET status = 'scored' WHERE id = ${tournament_id}`);

    await sql.transaction(updates);

    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString());
    await recalculateStandings(season);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve scores error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
