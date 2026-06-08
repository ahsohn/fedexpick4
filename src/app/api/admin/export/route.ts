import { NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

// Escape a value for CSV: wrap in quotes and double any internal quotes.
function csv(value: unknown): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET() {
  try {
    const config = await sql`SELECT value FROM config WHERE key = 'current_season'`;
    const season = parseInt(config[0]?.value ?? new Date().getFullYear().toString());

    const picks = await sql`
      SELECT
        u.name as user_name,
        t.name as tournament_name,
        t.deadline as tournament_date,
        g.name as golfer_name,
        p.pick_type,
        p.pick_order,
        p.was_subbed_out,
        p.was_activated,
        p.fedex_points
      FROM picks p
      JOIN users u ON p.user_id = u.id
      JOIN tournaments t ON p.tournament_id = t.id
      JOIN golfers g ON p.golfer_id = g.id
      WHERE t.season_year = ${season}
      ORDER BY t.deadline NULLS LAST, u.name, p.pick_order
    `;

    const headers = [
      "user", "tournament", "tournament_date", "golfer",
      "pick_type", "pick_order", "was_subbed_out", "was_activated", "fedex_points",
    ].join(",");

    const rows = picks.map((p: any) =>
      [
        csv(p.user_name),
        csv(p.tournament_name),
        csv(p.tournament_date),
        csv(p.golfer_name),
        csv(p.pick_type),
        csv(p.pick_order),
        csv(p.was_subbed_out),
        csv(p.was_activated),
        csv(p.fedex_points),
      ].join(",")
    );

    const body = [headers, ...rows].join("\n");

    return new NextResponse(body, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="fedexpick4-${season}-export.csv"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json({ error: "Export failed" }, { status: 500 });
  }
}
