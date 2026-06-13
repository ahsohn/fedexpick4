import { NextRequest, NextResponse } from "next/server";
import { unstable_noStore as noStore } from "next/cache";
import { sql } from "@/lib/db";
import type { User } from "@/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  noStore();
  try {
    const rows = await sql`SELECT id, name, email, is_commissioner, created_at FROM users ORDER BY name`;
    return NextResponse.json(rows as User[]);
  } catch (error) {
    console.error("Get users error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { name, email, is_commissioner } = await request.json();
    if (!name || !email) {
      return NextResponse.json({ error: "Name and email required" }, { status: 400 });
    }

    const rows = await sql`
      INSERT INTO users (name, email, is_commissioner)
      VALUES (${name}, ${email.toLowerCase().trim()}, ${is_commissioner ?? false})
      RETURNING id, name, email, is_commissioner, created_at
    `;
    return NextResponse.json(rows[0] as User, { status: 201 });
  } catch (error: any) {
    if (error?.code === "23505") {
      return NextResponse.json({ error: "Email already exists" }, { status: 409 });
    }
    console.error("Create user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();
    if (id === undefined || id === null) {
      return NextResponse.json({ error: "User id required" }, { status: 400 });
    }
    await sql`DELETE FROM users WHERE id = ${id}`;
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Delete user error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
