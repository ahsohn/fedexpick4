import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = config[0]?.value ?? new Date().getFullYear().toString();

    const rows = await sql`
      SELECT * FROM tournaments
      WHERE season_year = ${parseInt(season)}
        AND status = 'open'
      ORDER BY deadline ASC NULLS LAST
      LIMIT 1
    `;

    if (rows.length === 0) {
      const recent = await sql`
        SELECT * FROM tournaments
        WHERE season_year = ${parseInt(season)}
        ORDER BY deadline DESC NULLS LAST
        LIMIT 1
      `;
      return NextResponse.json(recent[0] ?? null);
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Get current tournament error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
