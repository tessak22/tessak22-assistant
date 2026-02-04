import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const db = getDb();
  const clients = db
    .prepare("SELECT * FROM clients ORDER BY priority ASC, name ASC")
    .all();
  return NextResponse.json(clients);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { name, priority = 3, color = "#6B7280", notes = "" } = body;

  if (!name?.trim()) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    "INSERT INTO clients (id, name, priority, color, notes) VALUES (?, ?, ?, ?, ?)"
  ).run(id, name.trim(), priority, color, notes);

  const client = db.prepare("SELECT * FROM clients WHERE id = ?").get(id);
  return NextResponse.json(client, { status: 201 });
}
