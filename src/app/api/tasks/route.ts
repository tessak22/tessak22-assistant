import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    const clientId = searchParams.get("client_id");

    let query = `
      SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
      FROM tasks t
      LEFT JOIN clients c ON t.client_id = c.id
      WHERE t.user_id = $1
    `;
    const queryParams: unknown[] = [user.id];

    if (status) {
      queryParams.push(status);
      query += ` AND t.status = $${queryParams.length}`;
    }
    if (clientId) {
      queryParams.push(clientId);
      query += ` AND t.client_id = $${queryParams.length}`;
    }

    query += " ORDER BY t.priority ASC, t.due_date ASC, t.created_at ASC";
    const tasks = await db.all(query, queryParams);
    return NextResponse.json(tasks);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
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

    const id = uuidv4();
    await db.run(
      `INSERT INTO tasks (id, user_id, title, description, client_id, priority, due_date, estimate_minutes, is_placeholder, quick_context, predicted_blockers)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
      [
        id,
        user.id,
        title.trim(),
        description,
        client_id,
        priority,
        due_date,
        estimate_minutes,
        is_placeholder,
        quick_context,
        predicted_blockers,
      ]
    );

    const task = await db.get(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id WHERE t.id = $1`,
      [id]
    );
    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error creating task:", error);
    return NextResponse.json(
      { error: "Failed to create task" },
      { status: 500 }
    );
  }
}
