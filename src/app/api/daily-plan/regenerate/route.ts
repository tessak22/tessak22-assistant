import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { getPrioritizedTasks } from "@/lib/prioritize";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const date = body.date || new Date().toISOString().split("T")[0];

  const db = getDb();

  interface DailyPlan {
    id: string;
    date: string;
  }

  let plan = db
    .prepare("SELECT * FROM daily_plans WHERE date = ?")
    .get(date) as DailyPlan | undefined;

  if (plan) {
    // Clear existing non-completed tasks from the plan
    db.prepare(
      "DELETE FROM daily_plan_tasks WHERE daily_plan_id = ? AND completed = 0"
    ).run(plan.id);
  } else {
    const id = uuidv4();
    db.prepare("INSERT INTO daily_plans (id, date) VALUES (?, ?)").run(
      id,
      date
    );
    plan = db
      .prepare("SELECT * FROM daily_plans WHERE id = ?")
      .get(id) as DailyPlan;
  }

  // Count how many completed tasks are already in the plan
  interface CountResult {
    count: number;
  }
  const completedCount = (
    db
      .prepare(
        "SELECT COUNT(*) as count FROM daily_plan_tasks WHERE daily_plan_id = ? AND completed = 1"
      )
      .get(plan.id) as CountResult
  ).count;

  const slotsAvailable = 6 - completedCount;

  if (slotsAvailable > 0) {
    // Get existing task IDs in the plan
    const existingTaskIds = db
      .prepare(
        "SELECT task_id FROM daily_plan_tasks WHERE daily_plan_id = ?"
      )
      .all(plan.id)
      .map((r) => (r as { task_id: string }).task_id);

    // Get prioritized tasks excluding ones already in the plan
    const candidates = getPrioritizedTasks(date, slotsAvailable + existingTaskIds.length);
    const newTasks = candidates
      .filter((t) => !existingTaskIds.includes(t.id))
      .slice(0, slotsAvailable);

    const insertTask = db.prepare(
      "INSERT OR IGNORE INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES (?, ?, ?, ?)"
    );

    db.transaction(() => {
      newTasks.forEach((task, i) => {
        insertTask.run(uuidv4(), plan!.id, task.id, completedCount + i + 1);
      });
    })();
  }

  // Return the updated plan
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
