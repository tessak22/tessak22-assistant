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
  "#2563eb",
  "#7c3aed",
  "#db2777",
  "#dc2626",
  "#ea580c",
  "#16a34a",
  "#0891b2",
  "#4f46e5",
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
    color: "#2563eb",
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
    setForm({ name: "", priority: 3, color: "#2563eb", notes: "" });
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
          <h1 className="text-2xl font-bold text-slate-900">Clients</h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage clients and their priority levels. VIP clients&apos; tasks get
            prioritized higher.
          </p>
        </div>
        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
        >
          + Add Client
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 shadow-sm space-y-4"
        >
          <h2 className="text-lg font-semibold text-slate-900">
            {editingId ? "Edit Client" : "New Client"}
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                Name
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              />
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
                {[1, 2, 3, 4, 5].map((p) => (
                  <option key={p} value={p}>
                    {p} - {priorityLabels[p]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Color
            </label>
            <div className="flex gap-2 flex-wrap">
              {defaultColors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-8 h-8 rounded-full border-2 transition-all ${
                    form.color === c
                      ? "border-slate-900 scale-110"
                      : "border-transparent hover:border-slate-300"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">
              Notes
            </label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              rows={2}
              className="w-full px-3 py-2 border border-slate-200 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Any notes about this client..."
            />
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700"
            >
              {editingId ? "Update" : "Create"} Client
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

      {/* Client list */}
      {loading ? (
        <div className="text-center text-slate-400 py-8">Loading...</div>
      ) : clients.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-lg p-8 text-center">
          <p className="text-slate-500">No clients yet.</p>
          <p className="text-slate-400 text-sm mt-1">
            Add your first client to start assigning tasks.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {clients.map((client) => (
            <div
              key={client.id}
              className="bg-white border border-slate-200 rounded-lg p-4 shadow-sm flex items-center gap-4"
            >
              <div
                className="w-3 h-10 rounded-full flex-shrink-0"
                style={{ backgroundColor: client.color }}
              />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium text-slate-900">{client.name}</h3>
                  <span
                    className={`px-2 py-0.5 text-xs rounded font-medium ${
                      client.priority === 1
                        ? "bg-red-50 text-red-700 border border-red-200"
                        : client.priority === 2
                        ? "bg-orange-50 text-orange-700 border border-orange-200"
                        : "bg-slate-50 text-slate-600 border border-slate-200"
                    }`}
                  >
                    P{client.priority} {priorityLabels[client.priority]}
                  </span>
                </div>
                {client.notes && (
                  <p className="text-xs text-slate-400 mt-1">{client.notes}</p>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => startEdit(client)}
                  className="text-sm text-slate-500 hover:text-slate-700"
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
