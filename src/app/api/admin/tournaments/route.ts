import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { name, espn_event_id, season_year, deadline } = await request.json();
    if (!name || !season_year) {
      return NextResponse.json({ error: "Name and season_year required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO tournaments (name, espn_event_id, season_year, deadline, status)
      VALUES (${name}, ${espn_event_id ?? null}, ${season_year}, ${deadline ?? null}, 'open')
      RETURNING *
    `;
    return NextResponse.json(rows[0], { status: 201 });
  } catch (error) {
    console.error("Create tournament error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const { id, name, espn_event_id, deadline, status } = await request.json();
    if (!id) {
      return NextResponse.json({ error: "Tournament id required" }, { status: 400 });
    }

    const rows = await sql`
      UPDATE tournaments
      SET name = COALESCE(${name ?? null}, name),
          espn_event_id = COALESCE(${espn_event_id ?? null}, espn_event_id),
          deadline = COALESCE(${deadline ?? null}, deadline),
          status = COALESCE(${status ?? null}, status)
      WHERE id = ${id}
      RETURNING *
    `;

    if (rows.length === 0) {
      return NextResponse.json({ error: "Tournament not found" }, { status: 404 });
    }
    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error("Update tournament error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
