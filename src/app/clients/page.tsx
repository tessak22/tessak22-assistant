"use client";

import { useState, useEffect, useCallback } from "react";

interface Client {
  id: string;
  name: string;
  priority: number;
  color: string;
  notes: string | null;
  created_at: string;
}

const priorityLabels: Record<number, string> = {
  1: "VIP",
  2: "High",
  3: "Standard",
  4: "Low",
  5: "Minimal",
};

const defaultColors = [
  "#8161da",
  "#00c2d8",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#6b4fc9",
  "#9333ea",
  "#64748b",
];

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: "",
    priority: 3,
    color: "#8161da",
    notes: "",
  });

  const loadClients = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/clients");
      const data = await res.json();
      setClients(data);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

  function resetForm() {
    setForm({ name: "", priority: 3, color: "#8161da", notes: "" });
    setEditingId(null);
    setShowForm(false);
  }

  function startEdit(client: Client) {
    setForm({
      name: client.name,
      priority: client.priority,
      color: client.color,
      notes: client.notes || "",
    });
    setEditingId(client.id);
    setShowForm(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      await fetch(`/api/clients/${editingId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    } else {
      await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
    }

    resetForm();
    await loadClients();
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this client? Tasks will keep their data but lose the client association.")) return;
    await fetch(`/api/clients/${id}`, { method: "DELETE" });
    await loadClients();
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[var(--color-dark)]">Clients</h1>
          <p className="text-sm text-[var(--color-text-muted)] mt-1">
            Manage clients and their priority levels. VIP clients&apos; tasks get
            prioritized higher.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-primary-hover)]"
        >
          + Add Client
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-[var(--color-border)] rounded-lg p-5 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-[var(--color-dark)]">
            {editingId ? "Edit Client" : "New Client"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
                Priority
              </label>
              <select
                value={form.priority}
                onChange={(e) =>
                  setForm({ ...form, priority: parseInt(e.target.value) })
                }
                className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              >
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    {p} - {priorityLabels[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Color
            </label>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-full border-2 border-slate-300 flex-shrink-0"
                style={{ backgroundColor: form.color }}
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === "" || val === "#") {
                    setForm({ ...form, color: val });
                  } else if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) {
                    setForm({ ...form, color: val });
                  }
                }}
                placeholder="#1A2B3C"
                className="w-28 px-3 py-2 border border-slate-200 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === c
                      ? "border-[var(--color-dark)] scale-110"
                      : "border-transparent hover:border-[var(--color-border)]"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--color-dark)] mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)]"
              placeholder="Any notes about this client..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-primary-hover)]"
            >
              {editingId ? "Update" : "Create"} Client
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="px-4 py-2 text-sm text-[var(--color-text-muted)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-primary-light)]/30"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Client list */}
      {loading ? (
        <div className="text-center text-[var(--color-text-muted)] py-8">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-[var(--color-border)] rounded-lg p-8 text-center">
          <p className="text-[var(--color-text-muted)]">No clients yet.</p>
          <p className="text-[var(--color-text-muted)] text-sm mt-1 opacity-80">
            Add your first client to start assigning tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-[var(--color-border)] rounded-lg p-4 shadow-sm flex items-center gap-4"
            >
              <div
                className="w-3 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: client.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-[var(--color-dark)]">{client.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded font-medium ${
                      client.priority === 1
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : client.priority === 2
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-[var(--color-primary-light)]/50 text-[var(--color-text-muted)] border border-[var(--color-border)]"
                    }`}
                  >
                    P{client.priority} {priorityLabels[client.priority]}
                  </span>
                </div>
                {client.notes && (
                  <p className="text-xs text-[var(--color-text-muted)] mt-1">{client.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(client)}
                  className="text-sm text-[var(--color-text-muted)] hover:text-[var(--color-dark)]"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(client.id)}
                  className="text-sm text-red-400 hover:text-red-600"
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
