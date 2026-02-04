"use client";

import { useState } from "react";

interface QuickAddTaskProps {
  onTaskAdded: () => void;
}

export function QuickAddTask({ onTaskAdded }: QuickAddTaskProps) {
  const [title, setTitle] = useState("");
  const [quickContext, setQuickContext] = useState("");
  const [isExpanded, setIsExpanded] = useState(false);
  const [saving, setSaving] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) return;

    setSaving(true);
    try {
      const res = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: title.trim(),
          quick_context: quickContext.trim() || null,
          is_placeholder: true,
          estimate_minutes: 60,
        }),
      });
      if (res.ok) {
        setTitle("");
        setQuickContext("");
        setIsExpanded(false);
        onTaskAdded();
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="bg-white border border-[var(--color-border)] rounded-lg p-4 shadow-sm">
      <form onSubmit={handleSubmit}>
        <div className="flex gap-2">
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Quick add task..."
            className="flex-1 px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="px-3 py-2 text-sm text-[var(--color-text-muted)] hover:text-[var(--color-dark)] border border-[var(--color-border)] rounded-md hover:bg-[var(--color-primary-light)]/30"
          >
            + Context
          </button>
          <button
            type="submit"
            disabled={saving || !title.trim()}
            className="px-4 py-2 bg-[var(--color-primary)] text-white text-sm font-medium rounded-md hover:bg-[var(--color-primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Adding..." : "Add"}
          </button>
        </div>
        {isExpanded && (
          <textarea
            value={quickContext}
            onChange={(e) => setQuickContext(e.target.value)}
            placeholder="Quick context (email reference, meeting notes, etc.)..."
            rows={2}
            className="mt-2 w-full px-3 py-2 border border-[var(--color-border)] rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-primary)] focus:border-transparent"
          />
        )}
      </form>
      <p className="mt-2 text-xs text-[var(--color-text-muted)]">
        Quick-add creates a placeholder task. Flesh it out during your end-of-day review.
      </p>
    </div>
  );
}
