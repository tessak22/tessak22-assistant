"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { TaskCard } from "../components/TaskCard";
import { QuickAddTask } from "../components/QuickAddTask";

interface Client {
  id: string;
  name: string;
  priority: number;
  color: string;
}

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
}

export default function TasksPage() {
  return (
    <Suspense fallback={<div className="text-center text-slate-400 py-8">Loading...</div>}>
      <TasksContent />
    </Suspense>
  );
}

function TasksContent() {
  const searchParams = useSearchParams();
  const editId = searchParams.get("edit");

  const [tasks, setTasks] = useState<Task[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("pending");
  const [form, setForm] = useState({
    title: "",
    description: "",
    client_id: "",
    priority: 3,
    due_date: "",
    estimate_minutes: 60,
    is_placeholder: false,
    quick_context: "",
    predicted_blockers: "",
  });

  const loadTasks = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter ? `?status=${filter}` : "";
      const res = await fetch(`/api/tasks${params}`);
      const data = await res.json();
      setTasks(data);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  const loadClients = useCallback(async () => {
    const res = await fetch("/api/clients");
    const data = await res.json();
    setClients(data);
  }, []);

  useEffect(() => {
    loadTasks();
    loadClients();
  }, [loadTasks, loadClients]);

  // Handle edit query param
  useEffect(() => {
    if (editId) {
      fetch(`/api/tasks/${editId}`)
        .then((r) => r.json())
        .then((task) => {
          if (task && !task.error) {
            startEdit(task);
          }
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editId]);

  function resetForm() {
    setForm({
      title: "",
      description: "",
      client_id: "",
      priority: 3,
      due_date: "",
      estimate_minutes: 60,
      is_placeholder: false,
      quick_context: "",
      predicted_blockers: "",
    });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(task: Task) {
    setForm({
      title: task.title,
      description: task.description || "",
      client_id: task.client_id || "",
      priority: task.priority,
      due_date: task.due_date || "",
      estimate_minutes: task.estimate_minutes,
      is_placeholder: task.is_placeholder === 1,
      quick_context: task.quick_context || "",
      predicted_blockers: task.predicted_blockers || "",
    });
    setEditingId(task.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim()) return;

    const payload = {
      ...form,
      client_id: form.client_id || null,
      due_date: form.due_date || null,
    };

    if (editingId) {
      await fetch(`/api/tasks/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    } else {
      await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
    }

    resetForm();
    await loadTasks();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this task permanently?")) return;
    await fetch(`/api/tasks/${id}`, { method: "DELETE" });
    await loadTasks();
  }

  async function handleStatusChange(id: string, status: string) {
    await fetch(`/api/tasks/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    await loadTasks();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tasks</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage your task backlog. Each task is max 1 hour (Ivy Lee Method).
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          + New Task
        </button>
      </div>

      {/* Quick add */}
      <QuickAddTask onTaskAdded={loadTasks} />

      {/* Filter */}
      <div className="flex gap-2">
        {["pending", "in_progress", "completed", "deferred", ""].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
              filter === s
                ? "bg-blue-50 text-blue-700 border-blue-200"
                : "text-slate-500 border-slate-200 hover:bg-slate-50"
            }`}
          >
            {s === "" ? "All" : s === "in_progress" ? "In Progress" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Full task form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "Edit Task" : "New Task"}
          </h2>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              value={form.description}
              onChange={(e) =>
                setForm({ ...form, description: e.target.value })
              }
              rows={3}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Full task details..."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Client
              </label>
              <select
                value={form.client_id}
                onChange={(e) =>
                  setForm({ ...form, client_id: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">No client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} (P{c.priority})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 - Critical</option>
                <option value={2}>2 - High</option>
                <option value={3}>3 - Medium</option>
                <option value={4}>4 - Low</option>
                <option value={5}>5 - Minimal</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Due Date
              </label>
              <input
                type="date"
                value={form.due_date}
                onChange={(e) =>
                  setForm({ ...form, due_date: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Estimate (minutes, max 60)
              </label>
              <input
                type="number"
                value={form.estimate_minutes}
                onChange={(e) =>
                  setForm({
                    ...form,
                    estimate_minutes: Math.min(60, parseInt(e.target.value) || 0),
                  })
                }
                min={5}
                max={60}
                step={5}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Quick Context
              </label>
              <input
                type="text"
                value={form.quick_context}
                onChange={(e) =>
                  setForm({ ...form, quick_context: e.target.value })
                }
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Email ref, meeting note..."
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Predicted Blockers
            </label>
            <input
              type="text"
              value={form.predicted_blockers}
              onChange={(e) =>
                setForm({ ...form, predicted_blockers: e.target.value })
              }
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Anything that could block this task..."
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="is_placeholder"
              checked={form.is_placeholder}
              onChange={(e) =>
                setForm({ ...form, is_placeholder: e.target.checked })
              }
              className="rounded border-slate-300"
            />
            <label htmlFor="is_placeholder" className="text-sm text-slate-600">
              Placeholder (needs fleshing out during EOD review)
            </label>
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              {editingId ? "Update" : "Create"} Task
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-slate-600 border border-slate-200 rounded-md hover:bg-slate-50"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : tasks.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-500">
            No {filter && filter !== "" ? filter : ""} tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <div key={task.id} className="flex items-center gap-2">
              <div className="flex-1">
                <TaskCard
                  task={task}
                  onComplete={
                    task.status !== "completed"
                      ? () => handleStatusChange(task.id, "completed")
                      : undefined
                  }
                  onEdit={startEdit}
                />
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0">
                {task.status === "pending" && (
                  <button
                    onClick={() =>
                      handleStatusChange(task.id, "in_progress")
                    }
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Start
                  </button>
                )}
                {task.status !== "deferred" && task.status !== "completed" && (
                  <button
                    onClick={() =>
                      handleStatusChange(task.id, "deferred")
                    }
                    className="text-xs text-slate-400 hover:text-slate-600"
                  >
                    Defer
                  </button>
                )}
                {task.status === "deferred" && (
                  <button
                    onClick={() =>
                      handleStatusChange(task.id, "pending")
                    }
                    className="text-xs text-blue-500 hover:text-blue-700"
                  >
                    Reopen
                  </button>
                )}
                <button
                  onClick={() => handleDelete(task.id)}
                  className="text-xs text-red-400 hover:text-red-600"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
