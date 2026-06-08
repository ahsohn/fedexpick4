import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString());

    const standings = await sql`
      SELECT
        u.id as user_id,
        u.name as user_name,
        COALESCE(s.total_points, 0) as total_points
      FROM users u
      LEFT JOIN standings s ON u.id = s.user_id AND s.season_year = ${season}
      ORDER BY COALESCE(s.total_points, 0) DESC
    `;

    const ranked = standings.map((row: any, index: number) => ({
      ...row,
      rank: index + 1,
    }));

    return NextResponse.json(ranked);
  } catch (error) {
    console.error("Get standings error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
