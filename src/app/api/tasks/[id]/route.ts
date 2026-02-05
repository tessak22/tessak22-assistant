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

    const task = await db.get(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, user.id]
    );

    if (!task) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { error: "Failed to fetch task" },
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

    // Check ownership
    const existing = await db.get(
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
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
        values.push(body[field]);
        updates.push(`${field} = $${values.length}`);
      }
    }

    if (body.status === "completed") {
      values.push(null); // placeholder for NOW()
      updates.push(`completed_at = NOW()`);
      values.pop(); // remove placeholder
    }

    if (updates.length > 0) {
      updates.push(`updated_at = NOW()`);
      values.push(id, user.id);
      await db.run(
        `UPDATE tasks SET ${updates.join(", ")} WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
        values
      );
    }

    const task = await db.get(
      `SELECT t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM tasks t LEFT JOIN clients c ON t.client_id = c.id
       WHERE t.id = $1 AND t.user_id = $2`,
      [id, user.id]
    );
    return NextResponse.json(task);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error updating task:", error);
    return NextResponse.json(
      { error: "Failed to update task" },
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
      "SELECT * FROM tasks WHERE id = $1 AND user_id = $2",
      [id, user.id]
    );
    if (!existing) {
      return NextResponse.json({ error: "Task not found" }, { status: 404 });
    }

    await db.run("DELETE FROM tasks WHERE id = $1 AND user_id = $2", [
      id,
      user.id,
    ]);
    return NextResponse.json({ success: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { error: "Failed to delete task" },
      { status: 500 }
    );
  }
}
