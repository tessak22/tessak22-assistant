"use client";

import { useState, useEffect, useCallback } from "react";
import { TaskCard } from "../components/TaskCard";
import { QuickAddTask } from "../components/QuickAddTask";

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

export default function CheckinPage() {
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allPendingTasks, setAllPendingTasks] = useState<Task[]>([]);
  const [morningNotes, setMorningNotes] = useState("");
  const [eveningNotes, setEveningNotes] = useState("");
  const [mode, setMode] = useState<"morning" | "evening">("morning");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const today = new Date().toISOString().split("T")[0];

  const loadPlan = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/daily-plan?date=${today}`);
      const data = await res.json();
      setPlan(data.plan);
      setTasks(data.tasks);
      setMorningNotes(data.plan.morning_notes || "");
      setEveningNotes(data.plan.evening_notes || "");

      // Auto-detect mode based on check-in status
      if (data.plan.morning_checked_in && !data.plan.evening_checked_in) {
        setMode("evening");
      }
    } finally {
      setLoading(false);
    }
  }, [today]);

  const loadAllTasks = useCallback(async () => {
    const res = await fetch("/api/tasks?status=pending");
    const data = await res.json();
    setAllPendingTasks(data);
  }, []);

  useEffect(() => {
    loadPlan();
    loadAllTasks();
  }, [loadPlan, loadAllTasks]);

  async function handleMorningCheckin() {
    setSaving(true);
    try {
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          morning_checked_in: true,
          morning_notes: morningNotes,
        }),
      });
      await loadPlan();
    } finally {
      setSaving(false);
    }
  }

  async function handleEveningCheckin() {
    setSaving(true);
    try {
      await fetch("/api/daily-plan", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: today,
          evening_checked_in: true,
          evening_notes: eveningNotes,
        }),
      });
      await loadPlan();
    } finally {
      setSaving(false);
    }
  }

  async function handleRegenerate() {
    setSaving(true);
    try {
      const res = await fetch("/api/daily-plan/regenerate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: today }),
      });
      const data = await res.json();
      setPlan(data.plan);
      setTasks(data.tasks);
    } finally {
      setSaving(false);
    }
  }

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

  async function handleRemoveFromPlan(planTaskId: string) {
    await fetch("/api/daily-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        tasks: [{ plan_task_id: planTaskId, remove: true }],
      }),
    });
    await loadPlan();
  }

  async function handleAddToPlan(taskId: string) {
    const nextPosition = tasks.length + 1;
    if (nextPosition > 6) {
      alert("Ivy Lee Method: Maximum 6 tasks per day. Remove one first.");
      return;
    }
    await fetch("/api/daily-plan", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date: today,
        tasks: [{ task_id: taskId, position: nextPosition }],
      }),
    });
    await loadPlan();
    await loadAllTasks();
  }

  const tasksInPlanIds = new Set(tasks.map((t) => t.id));
  const availableTasks = allPendingTasks.filter(
    (t) => !tasksInPlanIds.has(t.id)
  );
  const placeholderTasks = tasks.filter((t) => t.is_placeholder === 1);
  const blockerTasks = tasks.filter(
    (t) => t.predicted_blockers && t.completed !== 1
  );
  const totalMinutes = tasks
    .filter((t) => t.completed !== 1)
    .reduce((sum, t) => sum + t.estimate_minutes, 0);

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">Daily Check-in</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            {new Date(today + "T00:00:00").toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setMode("morning")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "morning"
                ? "bg-[var(--color-primary-light)] text-[var(--color-primary-hover)] border border-[var(--color-primary)]/30"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]/30 border border-[var(--color-border)]"
            }`}
          >
            Morning
            {plan?.morning_checked_in ? " \u2713" : ""}
          </button>
          <button
            onClick={() => setMode("evening")}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              mode === "evening"
                ? "bg-[var(--color-secondary-light)] text-[#007a8a] border border-[#00c2d8]/40"
                : "text-[var(--color-text-muted)] hover:bg-[var(--color-primary-light)]/30 border border-[var(--color-border)]"
            }`}
          >
            End of Day
            {plan?.evening_checked_in ? " \u2713" : ""}
          </button>
        </div>
      </div>

      {/* Stats bar */}
      <div className="bg-white border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
        <div className="flex gap-6 text-sm">
          <div>
            <span className="text-[var(--color-text-muted)]">Tasks today:</span>{" "}
            <span className="font-medium">{tasks.length}/6</span>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Completed:</span>{" "}
            <span className="font-medium text-green-600">
              {tasks.filter((t) => t.completed === 1).length}
            </span>
          </div>
          <div>
            <span className="text-[var(--color-text-muted)]">Remaining time:</span>{" "}
            <span className="font-medium">
              {Math.floor(totalMinutes / 60)}h {totalMinutes % 60}m
            </span>
          </div>
          {placeholderTasks.length > 0 && (
            <div>
              <span className="text-[var(--color-primary)] font-medium">
                {placeholderTasks.length} placeholder(s) to flesh out
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Morning Check-in */}
      {mode === "morning" && (
        <div className="space-y-4">
          <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/30 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-[var(--color-primary-hover)]">
              Morning Check-in
            </h2>
            <p className="text-sm text-[var(--color-primary)] mt-1">
              Review your prioritized list for today. Adjust if needed &mdash;
              swap tasks, change order, or replace items based on what you know
              this morning.
            </p>
          </div>

          {/* Today's tasks */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Today&apos;s 6 Tasks (auto-prioritized)
              </h3>
              <button
                onClick={handleRegenerate}
                disabled={saving}
                className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium disabled:opacity-50"
              >
                Re-prioritize
              </button>
            </div>
            {tasks.map((task) => (
              <div key={task.plan_task_id || task.id} className="flex items-center gap-2">
                <TaskCard
                  task={task}
                  showPosition
                  onComplete={handleCompleteTask}
                />
                <button
                  onClick={() =>
                    task.plan_task_id && handleRemoveFromPlan(task.plan_task_id)
                  }
                  className="text-xs text-red-400 hover:text-red-600 flex-shrink-0"
                  title="Remove from today"
                >
                  ✕
                </button>
              </div>
            ))}
            {tasks.length === 0 && (
              <p className="text-sm text-[var(--color-text-muted)] py-4 text-center">
                No tasks for today. Add some tasks first, then re-prioritize.
              </p>
            )}
          </div>

          {/* Swap in from backlog */}
          {tasks.length < 6 && availableTasks.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-semibold text-[var(--color-dark)]">
                Add from Backlog
              </h3>
              <div className="space-y-1">
                {availableTasks.slice(0, 5).map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center gap-2"
                  >
                    <TaskCard task={task} compact />
                    <button
                      onClick={() => handleAddToPlan(task.id)}
                      className="text-xs text-[var(--color-primary)] hover:text-[var(--color-primary-hover)] font-medium flex-shrink-0"
                    >
                      + Add
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Morning notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-dark)]">
              Morning Notes
            </label>
            <textarea
              value={morningNotes}
              onChange={(e) => setMorningNotes(e.target.value)}
              placeholder="Any adjustments, context, or priorities for today..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
            />
          </div>

          <button
            onClick={handleMorningCheckin}
            disabled={saving}
            className="w-full py-3 bg-[var(--color-primary)] text-white font-medium rounded-lg hover:bg-[var(--color-primary-hover)] disabled:opacity-50 transition-colors"
          >
            {plan?.morning_checked_in
              ? "Update Morning Check-in"
              : "Complete Morning Check-in"}
          </button>
        </div>
      )}

      {/* Evening Check-in */}
      {mode === "evening" && (
        <div className="space-y-4">
          <div className="bg-[var(--color-secondary-light)] border border-[#00c2d8]/40 rounded-lg p-4">
            <h2 className="text-lg font-semibold text-[#007a8a]">
              End-of-Day Review
            </h2>
            <p className="text-sm text-[var(--color-secondary)] mt-1">
              Review what got done, flesh out placeholder tasks, identify
              blockers, and prep tomorrow&apos;s list.
            </p>
          </div>

          {/* Task review */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Today&apos;s Tasks
            </h3>
            {tasks.map((task) => (
              <TaskCard
                key={task.plan_task_id || task.id}
                task={task}
                showPosition
                onComplete={
                  task.completed !== 1 ? handleCompleteTask : undefined
                }
                onEdit={(t) => (window.location.href = `/tasks?edit=${t.id}`)}
              />
            ))}
          </div>

          {/* Placeholder tasks needing attention */}
          {placeholderTasks.length > 0 && (
            <div className="bg-[var(--color-primary-light)] border border-[var(--color-primary)]/30 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-[var(--color-primary-hover)]">
                Placeholders to Flesh Out
              </h3>
              <p className="text-xs text-[var(--color-primary)]">
                These tasks were quick-added and need full details. Click
                &quot;Edit&quot; to add description, priority, client, and due date.
              </p>
              {placeholderTasks.map((task) => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={(t) =>
                    (window.location.href = `/tasks?edit=${t.id}`)
                  }
                />
              ))}
            </div>
          )}

          {/* Blockers */}
          {blockerTasks.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-3">
              <h3 className="text-sm font-semibold text-red-800">
                Predicted Blockers
              </h3>
              <p className="text-xs text-red-600">
                Address these before signing off so they can be resolved
                overnight.
              </p>
              {blockerTasks.map((task) => (
                <div
                  key={task.id}
                  className="bg-white rounded p-3 border border-red-100"
                >
                  <p className="text-sm font-medium text-[var(--color-dark)]">
                    {task.title}
                  </p>
                  <p className="text-xs text-red-500 mt-1">
                    {task.predicted_blockers}
                  </p>
                </div>
              ))}
            </div>
          )}

          {/* Quick add for tomorrow */}
          <div className="space-y-2">
            <h3 className="text-sm font-semibold text-[var(--color-dark)]">
              Quick-add for Tomorrow
            </h3>
            <QuickAddTask onTaskAdded={loadAllTasks} />
          </div>

          {/* Evening notes */}
          <div className="space-y-2">
            <label className="text-sm font-semibold text-[var(--color-dark)]">
              End-of-Day Notes
            </label>
            <textarea
              value={eveningNotes}
              onChange={(e) => setEveningNotes(e.target.value)}
              placeholder="Reflection, carry-overs, anything to address before tomorrow..."
              rows={3}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-secondary)]"
            />
          </div>

          <button
            onClick={handleEveningCheckin}
            disabled={saving}
            className="w-full py-3 bg-[var(--color-secondary)] text-white font-medium rounded-lg hover:bg-[#0099ad] disabled:opacity-50 transition-colors"
          >
            {plan?.evening_checked_in
              ? "Update End-of-Day Review"
              : "Complete End-of-Day Review"}
          </button>
        </div>
      )}
    </div>
  );
}
