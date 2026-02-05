import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const user = await getCurrentUser();
    const clients = await db.all(
      "SELECT * FROM clients WHERE user_id = $1 ORDER BY priority ASC, name ASC",
      [user.id]
    );
    return NextResponse.json(clients);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching clients:", error);
    return NextResponse.json(
      { error: "Failed to fetch clients" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const { name, priority = 3, color = "#6B7280", notes = "" } = body;

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const id = uuidv4();
    await db.run(
      "INSERT INTO clients (id, user_id, name, priority, color, notes) VALUES ($1, $2, $3, $4, $5, $6)",
      [id, user.id, name.trim(), priority, color, notes]
    );

    const client = await db.get("SELECT * FROM clients WHERE id = $1", [id]);
    return NextResponse.json(client, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating client:", error);
    return NextResponse.json(
      { error: "Failed to create client" },
      { status: 500 }
    );
  }
}
