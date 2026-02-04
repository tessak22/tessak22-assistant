import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!client) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  return NextResponse.json(client);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const { name, priority, color, notes } = body;

  const db = getDb();
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }

  db.prepare(
    `UPDATE clients SET
      name = COALESCE(?, name),
      priority = COALESCE(?, priority),
      color = COALESCE(?, color),
      notes = COALESCE(?, notes),
      updated_at = datetime('now')
    WHERE id = ?`
  ).run(name, priority, color, notes, id);

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json(client);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Client not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM clients WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
