import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPrioritizedTasks } from "@/lib/prioritize";
import { getCurrentUser } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const date = body.date || new Date().toISOString().split("T")[0];

    interface DailyPlan {
      id: string;
      user_id: string;
      date: string;
    }

    let plan = (await db.get(
      "SELECT * FROM daily_plans WHERE date = $1 AND user_id = $2",
      [date, user.id]
    )) as DailyPlan | undefined;

    if (plan) {
      // Clear existing non-completed tasks from the plan
      await db.run(
        "DELETE FROM daily_plan_tasks WHERE daily_plan_id = $1 AND completed = FALSE",
        [plan.id]
      );
    } else {
      const id = uuidv4();
      await db.run(
        "INSERT INTO daily_plans (id, user_id, date) VALUES ($1, $2, $3)",
        [id, user.id, date]
      );
      plan = (await db.get("SELECT * FROM daily_plans WHERE id = $1", [
        id,
      ])) as DailyPlan;
    }

    // Count how many completed tasks are already in the plan
    interface CountResult {
      count: number;
    }
    const completedCount = (
      (await db.get(
        "SELECT COUNT(*) as count FROM daily_plan_tasks WHERE daily_plan_id = $1 AND completed = TRUE",
        [plan.id]
      )) as CountResult
    ).count;

    const slotsAvailable = 6 - completedCount;

    if (slotsAvailable > 0) {
      // Get existing task IDs in the plan
      const existingTaskIds = (
        await db.all(
          "SELECT task_id FROM daily_plan_tasks WHERE daily_plan_id = $1",
          [plan.id]
        )
      ).map((r) => (r as { task_id: string }).task_id);

      // Get prioritized tasks excluding ones already in the plan
      const candidates = await getPrioritizedTasks(
        user.id,
        date,
        slotsAvailable + existingTaskIds.length
      );
      const newTasks = candidates
        .filter((t) => !existingTaskIds.includes(t.id))
        .slice(0, slotsAvailable);

      // Insert new tasks in transaction
      await db.transaction(async (client) => {
        for (let i = 0; i < newTasks.length; i++) {
          await client.query(
            "INSERT INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES ($1, $2, $3, $4) ON CONFLICT (daily_plan_id, task_id) DO NOTHING",
            [uuidv4(), plan!.id, newTasks[i].id, completedCount + i + 1]
          );
        }
      });
    }

    // Return the updated plan
    const updatedPlan = await db.get(
      "SELECT * FROM daily_plans WHERE id = $1",
      [plan.id]
    );
    const tasks = await db.all(
      `SELECT dpt.position, dpt.completed, dpt.id as plan_task_id,
              t.*, c.name as client_name, c.priority as client_priority, c.color as client_color
       FROM daily_plan_tasks dpt
       JOIN tasks t ON dpt.task_id = t.id
       LEFT JOIN clients c ON t.client_id = c.id
       WHERE dpt.daily_plan_id = $1
       ORDER BY dpt.position ASC`,
      [plan.id]
    );

    return NextResponse.json({ plan: updatedPlan, tasks });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error regenerating daily plan:", error);
    return NextResponse.json(
      { error: "Failed to regenerate daily plan" },
      { status: 500 }
    );
  }
}
