import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");
  const clientId = searchParams.get("client_id");

  const db = getDb();
  let query = `
    SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE 1=1
  `;
  const queryParams: unknown[] = [];

  if (status) {
    query += " AND t.status = ?";
    queryParams.push(status);
  }
  if (clientId) {
    query += " AND t.client_id = ?";
    queryParams.push(clientId);
  }

  query += " ORDER BY t.priority ASC, t.due_date ASC, t.created_at ASC";
  const tasks = db.prepare(query).all(...queryParams);
  return NextResponse.json(tasks);
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const {
    title,
    description = "",
    client_id = null,
    priority = 3,
    due_date = null,
    estimate_minutes = 60,
    is_placeholder = false,
    quick_context = "",
    predicted_blockers = "",
  } = body;

  if (!title?.trim()) {
    return NextResponse.json({ error: "Title is required" }, { status: 400 });
  }

  if (estimate_minutes > 60) {
    return NextResponse.json(
      { error: "Tasks must be 60 minutes or less (Ivy Lee Method)" },
      { status: 400 }
    );
  }

  const db = getDb();
  const id = uuidv4();
  db.prepare(
    `INSERT INTO tasks (id, title, description, client_id, priority, due_date, estimate_minutes, is_placeholder, quick_context, predicted_blockers)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  ).run(
    id,
    title.trim(),
    description,
    client_id,
    priority,
    due_date,
    estimate_minutes,
    is_placeholder ? 1 : 0,
    quick_context,
    predicted_blockers
  );

  const task = db
    .prepare(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = ?`
    )
    .get(id);
  return NextResponse.json(task, { status: 201 });
}
