import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    const client = await db.get(
      "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!client) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching client:", error);
    return NextResponse.json(
      { error: "Failed to fetch client" },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;
    const body = await request.json();
    const { name, priority, color, notes } = body;

    // Check ownership
    const existing = await db.get(
      "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await db.run(
      `UPDATE clients SET
        name = COALESCE($1, name),
        priority = COALESCE($2, priority),
        color = COALESCE($3, color),
        notes = COALESCE($4, notes),
        updated_at = NOW()
      WHERE id = $5 AND user_id = $6`,
      [name, priority, color, notes, id, user.id]
    );

    const client = await db.get(
      "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    return NextResponse.json(client);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating client:", error);
    return NextResponse.json(
      { error: "Failed to update client" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await params;

    // Check ownership before deleting
    const existing = await db.get(
      "SELECT * FROM clients WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Client not found" }, { status: 404 });
    }

    await db.run("DELETE FROM clients WHERE id = $1 AND user_id = $2", [
      id,
      user.id,
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting client:", error);
    return NextResponse.json(
      { error: "Failed to delete client" },
      { status: 500 }
    );
  }
}
