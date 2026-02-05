import { db } from "./db";

export interface TaskWithClient {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  priority: number;
  due_date: string | null;
  estimate_minutes: number;
  status: string;
  is_placeholder: boolean;
  quick_context: string | null;
  predicted_blockers: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
  client_name: string | null;
  client_priority: number | null;
  client_color: string | null;
}

/**
 * Ivy Lee prioritization engine.
 *
 * Scoring factors (lower score = higher priority):
 * 1. Due date urgency — tasks due today or overdue get highest weight
 * 2. Task priority (1=highest, 5=lowest)
 * 3. Client priority (1=VIP, 5=lowest) — breaks ties between same due date + task priority
 * 4. Creation date — older tasks get slight priority boost
 *
 * Returns the top N tasks for the day, each ≤ 60 minutes.
 */
export async function getPrioritizedTasks(
  userId: string,
  dateStr: string,
  limit: number = 6
): Promise<TaskWithClient[]> {
  const tasks = await db.all<TaskWithClient>(
    `
    SELECT
      t.*,
      c.name as client_name,
      c.priority as client_priority,
      c.color as client_color
    FROM tasks t
    LEFT JOIN clients c ON t.client_id = c.id
    WHERE t.user_id = $1
      AND t.status = 'pending'
      AND t.estimate_minutes <= 60
    ORDER BY
      -- Overdue/due today first
      CASE
        WHEN t.due_date IS NOT NULL AND t.due_date <= $2::date THEN 0
        WHEN t.due_date IS NOT NULL AND t.due_date <= ($2::date + INTERVAL '3 days') THEN 1
        WHEN t.due_date IS NOT NULL THEN 2
        ELSE 3
      END ASC,
      -- Task priority (1 = highest)
      t.priority ASC,
      -- Client priority (1 = VIP)
      COALESCE(c.priority, 5) ASC,
      -- Older tasks first
      t.created_at ASC
    LIMIT $3
  `,
    [userId, dateStr, limit]
  );

  return tasks;
}

export function computeScore(
  task: TaskWithClient,
  dateStr: string
): { score: number; breakdown: string } {
  let score = 0;
  const parts: string[] = [];

  // Due date urgency (0-30 points)
  if (task.due_date) {
    const due = new Date(task.due_date);
    const today = new Date(dateStr);
    const daysUntil = Math.floor(
      (due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
    );
    if (daysUntil <= 0) {
      score += 0;
      parts.push("Due/overdue (+0)");
    } else if (daysUntil <= 3) {
      score += 10;
      parts.push(`Due in ${daysUntil}d (+10)`);
    } else {
      score += 20;
      parts.push(`Due in ${daysUntil}d (+20)`);
    }
  } else {
    score += 30;
    parts.push("No due date (+30)");
  }

  // Task priority (0-20 points)
  const taskPriScore = (task.priority - 1) * 5;
  score += taskPriScore;
  parts.push(`Task P${task.priority} (+${taskPriScore})`);

  // Client priority (0-20 points)
  const clientPri = task.client_priority ?? 5;
  const clientPriScore = (clientPri - 1) * 5;
  score += clientPriScore;
  parts.push(`Client P${clientPri} (+${clientPriScore})`);

  return { score, breakdown: parts.join(", ") };
}
