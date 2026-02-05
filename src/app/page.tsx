"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard } from "./components/TaskCard";
import { QuickAddTask } from "./components/QuickAddTask";
import Link from "next/link";

interface Task {
  id: string;
  title: string;
  description: string | null;
  client_id: string | null;
  priority: number;
  due_date: string | null;
  estimate_minutes: number;
  status: string;
  is_placeholder: number;
  quick_context: string | null;
  predicted_blockers: string | null;
  client_name: string | null;
  client_priority: number | null;
  client_color: string | null;
  position?: number;
  completed?: number;
  plan_task_id?: string;
}

interface DailyPlan {
  id: string;
  date: string;
  morning_checked_in: number;
  evening_checked_in: number;
  morning_notes: string | null;
  evening_notes: string | null;
}

export default function Home() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split("T")[0];

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-plan?date=${today}`);
      const data = await res.json();
      setPlan(data.plan);
      setTasks(data.tasks);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => {
    loadPlan();
  }, [loadPlan]);

  async function handleCompleteTask(taskId: string) {
    const planTask = tasks.find((t) => t.id === taskId);
    if (!planTask?.plan_task_id) return;

    await fetch("/api/daily-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        tasks: [
          {
            plan_task_id: planTask.plan_task_id,
            position: planTask.position,
            completed: true,
          },
        ],
      }),
    });

    await fetch(`/api/tasks/${taskId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    await loadPlan();
  }

  const completedCount = tasks.filter((t) => t.completed === 1).length;
  const totalMinutes = tasks
    .filter((t) => t.completed !== 1)
    .reduce((sum, t) => sum + t.estimate_minutes, 0);
  const progress = tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 text-[var(--color-text-muted)]">
        Loading...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--color-dark)]">Today</h1>
        <p className="text-sm text-[var(--color-text-muted)] mt-1">
          {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          })}
        </p>
      </div>

      {/* Check-in status */}
      <div className="flex gap-3">
        {!plan?.morning_checked_in && (
          <Link
            href="/checkin"
            className="flex-1 bg-[var(--color-primary-light)] border border-[var(--color-primary)]/30 rounded-lg p-4 hover:bg-[var(--color-primary)]/10 transition-colors"
          >
            <p className="text-sm font-semibold text-[var(--color-primary-hover)]">
              Morning Check-in
            </p>
            <p className="text-xs text-[var(--color-primary)] mt-1">
              Review and confirm your priorities for today
            </p>
          </Link>
        )}
        {plan?.morning_checked_in && !plan?.evening_checked_in && (
          <Link
            href="/checkin"
            className="flex-1 bg-[var(--color-secondary-light)] border border-[#00c2d8]/40 rounded-lg p-4 hover:bg-[#00c2d8]/10 transition-colors"
          >
            <p className="text-sm font-semibold text-[#007a8a]">
              End-of-Day Review
            </p>
            <p className="text-xs text-[var(--color-secondary)] mt-1">
              Wrap up, review blockers, and prep for tomorrow
            </p>
          </Link>
        )}
        {plan?.morning_checked_in && plan?.evening_checked_in && (
          <div className="flex-1 bg-green-50 border border-green-200 rounded-lg p-4">
            <p className="text-sm font-semibold text-green-800">
              All check-ins complete
            </p>
            <p className="text-xs text-green-600 mt-1">
              Great work today. Rest up and come back strong tomorrow.
            </p>
          </div>
        )}
      </div>

      {/* Progress */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-medium text-[var(--color-dark)]">
            Daily Progress
          </span>
          <span className="text-sm text-[var(--color-text-muted)]">
            {completedCount}/{tasks.length} tasks &middot;{" "}
            {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m remaining
          </span>
        </div>
        <div className="w-full bg-slate-100 rounded-full h-2.5">
          <div
            className="bg-[var(--color-primary)] h-2.5 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Quick add */}
      <QuickAddTask onTaskAdded={loadPlan} />

      {/* Today's tasks */}
      <div className="space-y-2">
        <h2 className="text-sm font-semibold text-[var(--color-dark)] uppercase tracking-wide">
          Focus List
        </h2>
        {tasks.length === 0 ? (
          <div className="bg-white border border-[var(--color-border)] rounded-lg p-8 text-center">
            <p className="text-[var(--color-text-muted)] text-sm">No tasks for today yet.</p>
            <p className="text-[var(--color-text-muted)] text-xs mt-1 opacity-80">
              Add some tasks and run your{" "}
              <Link
                href="/checkin"
                className="text-[var(--color-primary)] hover:text-[var(--color-primary-hover)]"
              >
                morning check-in
              </Link>{" "}
              to get started.
            </p>
          </div>
        ) : (
          tasks.map((task) => (
            <TaskCard
              key={task.plan_task_id || task.id}
              task={task}
              showPosition
              onComplete={
                task.completed !== 1 ? handleCompleteTask : undefined
              }
              onEdit={(t) => {
                window.location.href = `/tasks?edit=${t.id}`;
              }}
            />
          ))
        )}
      </div>
    </div>
  );
}
