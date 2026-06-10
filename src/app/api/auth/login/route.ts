import { NextRequest, NextResponse } from "next/server";
import { sql } from "@/lib/db";
import type { LoginResponse, User } from "@/types";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const { email } = await request.json();
    if (!email || typeof email !== "string") {
      return NextResponse.json<LoginResponse>(
        { success: false, error: "Email is required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const rows = await sql`
      SELECT id, name, email, is_commissioner, created_at
      FROM users
      WHERE LOWER(email) = ${normalizedEmail}
    `;

    if (rows.length === 0) {
      return NextResponse.json<LoginResponse>(
        { success: false, error: "Email not found. Contact your commissioner." },
        { status: 404 }
      );
    }

    const user = rows[0] as User;

    return NextResponse.json<LoginResponse>({ success: true, user });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json<LoginResponse>(
      { success: false, error: "Server error" },
      { status: 500 }
    );
  }
}
