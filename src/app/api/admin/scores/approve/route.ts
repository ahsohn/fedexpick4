import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import { standingsRecalcStatements } from "@/lib/scoring";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { tournament_id, results } = await request.json();
    if (!tournament_id || !Array.isArray(results) || results.length === 0) {
      return NextResponse.json(
        { error: "tournament_id and a non-empty results array are required" },
        { status: 400 }
      );
    }

    const season = parseInt(
      (await sql`SELECT value FROM config WHERE key = 'current_season'`)[0]?.value
        ?? new Date().getFullYear().toString(),
      10
    );

    // Apply every pick update, mark the tournament scored, and recompute
    // standings in ONE transaction so the data can never be left half-scored.
    // Standings statements run last and see the just-updated picks.
    const statements = [];
    for (const userResult of results) {
      for (const pick of userResult.picks ?? []) {
        statements.push(sql`
          UPDATE picks
          SET fedex_points = ${pick.fedex_points},
              was_subbed_out = ${pick.was_subbed_out},
              was_activated = ${pick.was_activated}
          WHERE id = ${pick.pick_id}
        `);
      }
    }
    statements.push(sql`UPDATE tournaments SET status = 'scored' WHERE id = ${tournament_id}`);
    statements.push(...standingsRecalcStatements(season));

    await sql.transaction(statements);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Approve scores error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
