import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const task = db
    .prepare(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?`
    )
    .get(id);
  if (!task) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  return NextResponse.json(task);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await request.json();
  const db = getDb();

  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }

  if (body.estimate_minutes !== undefined && body.estimate_minutes > 60) {
    return NextResponse.json(
      { error: "Tasks must be 60 minutes or less (Ivy Lee Method)" },
      { status: 400 }
    );
  }

  const fields = [
    "title",
    "description",
    "client_id",
    "priority",
    "due_date",
    "estimate_minutes",
    "status",
    "is_placeholder",
    "quick_context",
    "predicted_blockers",
  ];

  const updates: string[] = [];
  const values: unknown[] = [];

  for (const field of fields) {
    if (body[field] !== undefined) {
      updates.push(`${field} = ?`);
      values.push(
        field === "is_placeholder" ? (body[field] ? 1 : 0) : body[field]
      );
    }
  }

  if (body.status === "completed") {
    updates.push("completed_at = datetime('now')");
  }

  if (updates.length > 0) {
    updates.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(
      `UPDATE tasks SET ${updates.join(", ")} WHERE id = ?`
    ).run(...values);
  }

  const task = db
    .prepare(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?`
    )
    .get(id);
  return NextResponse.json(task);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const existing = db.prepare("SELECT * FROM tasks WHERE id = ?").get(id);
  if (!existing) {
    return NextResponse.json({ error: "Task not found" }, { status: 404 });
  }
  db.prepare("DELETE FROM tasks WHERE id = ?").run(id);
  return NextResponse.json({ success: true });
}
