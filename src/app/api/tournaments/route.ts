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
      ORDER BY deadline ASC NULLS LAST
    `;
    return NextResponse.json(rows);
  } catch (error) {
    console.error("Get tournaments error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
