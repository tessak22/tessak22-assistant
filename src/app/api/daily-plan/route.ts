import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPrioritizedTasks } from "@/lib/prioritize";
import { v4 as uuidv4 } from "uuid";

interface DailyPlan {
  id: string;
  date: string;
  morning_checked_in: number;
  evening_checked_in: number;
  morning_notes: string | null;
  evening_notes: string | null;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const date =
    searchParams.get("date") || new Date().toISOString().split("T")[0];

  const db = getDb();
  let plan = db
    .prepare("SELECT * FROM daily_plans WHERE date = ?")
    .get(date) as DailyPlan | undefined;

  if (!plan) {
    // Auto-generate a plan from the prioritization engine
    const id = uuidv4();
    db.prepare(
      "INSERT INTO daily_plans (id, date) VALUES (?, ?)"
    ).run(id, date);

    const topTasks = getPrioritizedTasks(date, 6);
    const insertTask = db.prepare(
      "INSERT OR IGNORE INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES (?, ?, ?, ?)"
    );

    const insertMany = db.transaction(() => {
      topTasks.forEach((task, i) => {
        insertTask.run(uuidv4(), id, task.id, i + 1);
      });
    });
    insertMany();

    plan = db
      .prepare("SELECT * FROM daily_plans WHERE id = ?")
      .get(id) as DailyPlan;
  }

  // Get tasks for this plan
  const tasks = db
    .prepare(
      `SELECT dpt.position, dpt.completed, dpt.id as plan_task_id,
              t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM daily_plan_tasks dpt
       JOIN tasks t ON dpt.task_id = t.id
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE dpt.daily_plan_id = ?
       ORDER BY dpt.position ASC`
    )
    .all(plan.id);

  return NextResponse.json({ plan, tasks });
}

export async function PUT(request: NextRequest) {
  const body = await request.json();
  const { date, morning_notes, evening_notes, morning_checked_in, evening_checked_in, tasks: taskUpdates } = body;

  const db = getDb();
  const plan = db
    .prepare("SELECT * FROM daily_plans WHERE date = ?")
    .get(date) as DailyPlan | undefined;

  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Update plan metadata
  const updates: string[] = ["updated_at = datetime('now')"];
  const values: unknown[] = [];

  if (morning_notes !== undefined) {
    updates.push("morning_notes = ?");
    values.push(morning_notes);
  }
  if (evening_notes !== undefined) {
    updates.push("evening_notes = ?");
    values.push(evening_notes);
  }
  if (morning_checked_in !== undefined) {
    updates.push("morning_checked_in = ?");
    values.push(morning_checked_in ? 1 : 0);
  }
  if (evening_checked_in !== undefined) {
    updates.push("evening_checked_in = ?");
    values.push(evening_checked_in ? 1 : 0);
  }

  values.push(plan.id);
  db.prepare(
    `UPDATE daily_plans SET ${updates.join(", ")} WHERE id = ?`
  ).run(...values);

  // Update task positions/completion if provided
  if (taskUpdates && Array.isArray(taskUpdates)) {
    const updateTask = db.prepare(
      "UPDATE daily_plan_tasks SET position = ?, completed = ? WHERE id = ?"
    );
    const insertTask = db.prepare(
      "INSERT OR IGNORE INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES (?, ?, ?, ?)"
    );
    const removeTask = db.prepare(
      "DELETE FROM daily_plan_tasks WHERE id = ?"
    );

    db.transaction(() => {
      for (const t of taskUpdates) {
        if (t.remove && t.plan_task_id) {
          removeTask.run(t.plan_task_id);
        } else if (t.plan_task_id) {
          updateTask.run(t.position, t.completed ? 1 : 0, t.plan_task_id);
        } else if (t.task_id) {
          insertTask.run(uuidv4(), plan.id, t.task_id, t.position);
        }
      }
    })();
  }

  // Return updated plan with tasks
  const updatedPlan = db
    .prepare("SELECT * FROM daily_plans WHERE id = ?")
    .get(plan.id);
  const tasks = db
    .prepare(
      `SELECT dpt.position, dpt.completed, dpt.id as plan_task_id,
              t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM daily_plan_tasks dpt
       JOIN tasks t ON dpt.task_id = t.id
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE dpt.daily_plan_id = ?
       ORDER BY dpt.position ASC`
    )
    .all(plan.id);

  return NextResponse.json({ plan: updatedPlan, tasks });
}
