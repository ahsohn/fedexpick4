import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { confirm, new_season } = await request.json();

    if (confirm !== "RESET") {
      return NextResponse.json(
        { error: 'Must send confirm: "RESET" to proceed' },
        { status: 400 }
      );
    }

    // Truncate season data — preserve users, golfers, and config. Wrapped in a
    // single transaction so a partial wipe can never happen. Order respects FKs
    // (children before parents), though ON DELETE CASCADE would also handle it.
    const statements = [
      sql`DELETE FROM picks`,
      sql`DELETE FROM standings`,
      sql`DELETE FROM tournament_field`,
      sql`DELETE FROM tournaments`,
    ];

    if (new_season !== undefined && new_season !== null && !Number.isNaN(parseInt(String(new_season)))) {
      statements.push(
        sql`UPDATE config SET value = ${String(parseInt(String(new_season)))} WHERE key = 'current_season'`
      );
    }

    await sql.transaction(statements);

    return NextResponse.json({ success: true, message: "Season reset complete" });
  } catch (error) {
    console.error("Season reset error:", error);
    return NextResponse.json({ error: "Reset failed" }, { status: 500 });
  }
}
