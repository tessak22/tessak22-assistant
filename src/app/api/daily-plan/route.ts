import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getPrioritizedTasks } from "@/lib/prioritize";
import { getCurrentUser } from "@/lib/session";
import { v4 as uuidv4 } from "uuid";

interface DailyPlan {
  id: string;
  user_id: string;
  date: string;
  morning_checked_in: boolean;
  evening_checked_in: boolean;
  morning_notes: string | null;
  evening_notes: string | null;
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const { searchParams } = new URL(request.url);
    const date =
      searchParams.get("date") || new Date().toISOString().split("T")[0];

    let plan = (await db.get(
      "SELECT * FROM daily_plans WHERE date = $1 AND user_id = $2",
      [date, user.id]
    )) as DailyPlan | undefined;

    if (!plan) {
      // Auto-generate a plan from the prioritization engine
      const id = uuidv4();
      await db.run(
        "INSERT INTO daily_plans (id, user_id, date) VALUES ($1, $2, $3)",
        [id, user.id, date]
      );

      const topTasks = await getPrioritizedTasks(user.id, date, 6);

      // Insert tasks in transaction
      await db.transaction(async (client) => {
        for (let i = 0; i < topTasks.length; i++) {
          await client.query(
            "INSERT INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES ($1, $2, $3, $4) ON CONFLICT (daily_plan_id, task_id) DO NOTHING",
            [uuidv4(), id, topTasks[i].id, i + 1]
          );
        }
      });

      plan = (await db.get("SELECT * FROM daily_plans WHERE id = $1", [
        id,
      ])) as DailyPlan;
    }

    // Get tasks for this plan
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

    return NextResponse.json({ plan, tasks });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("Error fetching daily plan:", error);
    return NextResponse.json(
      { error: "Failed to fetch daily plan" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser();
    const body = await request.json();
    const {
      date,
      morning_notes,
      evening_notes,
      morning_checked_in,
      evening_checked_in,
      tasks: taskUpdates,
    } = body;

    const plan = (await db.get(
      "SELECT * FROM daily_plans WHERE date = $1 AND user_id = $2",
      [date, user.id]
    )) as DailyPlan | undefined;

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 });
    }

    // Update plan metadata
    const updates: string[] = ["updated_at = NOW()"];
    const values: unknown[] = [];

    if (morning_notes !== undefined) {
      values.push(morning_notes);
      updates.push(`morning_notes = $${values.length}`);
    }
    if (evening_notes !== undefined) {
      values.push(evening_notes);
      updates.push(`evening_notes = $${values.length}`);
    }
    if (morning_checked_in !== undefined) {
      values.push(morning_checked_in);
      updates.push(`morning_checked_in = $${values.length}`);
    }
    if (evening_checked_in !== undefined) {
      values.push(evening_checked_in);
      updates.push(`evening_checked_in = $${values.length}`);
    }

    values.push(plan.id, user.id);
    await db.run(
      `UPDATE daily_plans SET ${updates.join(", ")} WHERE id = $${values.length - 1} AND user_id = $${values.length}`,
      values
    );

    // Update task positions/completion if provided
    if (taskUpdates && Array.isArray(taskUpdates)) {
      await db.transaction(async (client) => {
        for (const t of taskUpdates) {
          if (t.remove && t.plan_task_id) {
            await client.query(
              "DELETE FROM daily_plan_tasks WHERE id = $1",
              [t.plan_task_id]
            );
          } else if (t.plan_task_id) {
            await client.query(
              "UPDATE daily_plan_tasks SET position = $1, completed = $2 WHERE id = $3",
              [t.position, t.completed, t.plan_task_id]
            );
          } else if (t.task_id) {
            await client.query(
              "INSERT INTO daily_plan_tasks (id, daily_plan_id, task_id, position) VALUES ($1, $2, $3, $4) ON CONFLICT (daily_plan_id, task_id) DO NOTHING",
              [uuidv4(), plan.id, t.task_id, t.position]
            );
          }
        }
      });
    }

    // Return updated plan with tasks
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
    console.error("Error updating daily plan:", error);
    return NextResponse.json(
      { error: "Failed to update daily plan" },
      { status: 500 }
    );
  }
}
