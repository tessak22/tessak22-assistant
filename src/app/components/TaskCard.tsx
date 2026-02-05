"use client";

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

interface TaskCardProps {
  task: Task;
  showPosition?: boolean;
  onComplete?: (taskId: string) => void;
  onEdit?: (task: Task) => void;
  compact?: boolean;
}

const priorityStyles: Record<number, string> = {
  1: "border-l-red-500",
  2: "border-l-orange-400",
  3: "border-l-yellow-400",
  4: "border-l-[#00c2d8]",
  5: "border-l-gray-300",
};

const priorityLabels: Record<number, string> = {
  1: "Critical",
  2: "High",
  3: "Medium",
  4: "Low",
  5: "Minimal",
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

export function TaskCard({
  task,
  showPosition,
  onComplete,
  onEdit,
  compact,
}: TaskCardProps) {
  const isDone = task.completed === 1 || task.status === "completed";
  const isOverdue =
    task.due_date &&
    new Date(task.due_date + "T00:00:00") < new Date(new Date().toISOString().split("T")[0] + "T00:00:00") &&
    !isDone;

  const leftBorderColor = task.client_color
    ? undefined
    : (priorityStyles[task.priority] || "border-l-gray-300");

  return (
    <div
      className={`bg-white border border-[var(--color-border)] rounded-lg border-l-4 ${
        !task.client_color ? leftBorderColor : ""
      } ${isDone ? "opacity-60" : ""} ${
        compact ? "p-3" : "p-4"
      } shadow-sm hover:shadow-md transition-shadow`}
      style={
        task.client_color
          ? { borderLeftColor: task.client_color }
          : undefined
      }
    >
      <div className="flex items-start gap-3">
        {showPosition && task.position && (
          <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[var(--color-primary-light)] text-[var(--color-primary)] text-sm font-bold flex items-center justify-center">
            {task.position}
          </span>
        )}
        {onComplete && !isDone && (
          <button
            onClick={() => onComplete(task.id)}
            className="flex-shrink-0 w-5 h-5 mt-0.5 rounded border-2 border-slate-300 hover:border-[var(--color-primary)] hover:bg-[var(--color-primary-light)] transition-colors"
            title="Mark complete"
          />
        )}
        {isDone && (
          <span className="flex-shrink-0 w-5 h-5 mt-0.5 rounded bg-green-500 text-white flex items-center justify-center text-xs">
            &#10003;
          </span>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3
              className={`text-sm font-medium ${
                isDone ? "line-through text-[var(--color-text-muted)]" : "text-[var(--color-dark)]"
              }`}
            >
              {task.title}
            </h3>
            {task.is_placeholder === 1 && (
              <span className="px-1.5 py-0.5 text-xs bg-[var(--color-primary-light)] text-[var(--color-primary)] border border-[var(--color-primary)]/30 rounded">
                Placeholder
              </span>
            )}
          </div>
          <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1">
              P{task.priority}
              <span className="text-[var(--color-text-muted)] opacity-80">
                {priorityLabels[task.priority]}
              </span>
            </span>
            <span>{task.estimate_minutes}m</span>
            {task.client_name && (
              <span
                className="px-1.5 py-0.5 rounded text-xs font-medium"
                style={{
                  backgroundColor: task.client_color
                    ? task.client_color + "20"
                    : "var(--color-text-muted)20",
                  color: task.client_color || "var(--color-dark-muted)",
                }}
              >
                {task.client_name}
              </span>
            )}
            {task.due_date && (
              <span className={isOverdue ? "text-red-600 font-medium" : ""}>
                {isOverdue ? "Overdue: " : "Due "}
                {formatDate(task.due_date)}
              </span>
            )}
          </div>
          {!compact && task.quick_context && (
            <p className="mt-1 text-xs text-[var(--color-text-muted)] italic">
              {task.quick_context}
            </p>
          )}
          {!compact && task.predicted_blockers && (
            <p className="mt-1 text-xs text-red-400">
              Blocker: {task.predicted_blockers}
            </p>
          )}
        </div>
        {onEdit && (
          <button
            onClick={() => onEdit(task)}
            className="flex-shrink-0 text-[var(--color-text-muted)] hover:text-[var(--color-dark)] text-sm"
          >
            Edit
          </button>
        )}
      </div>
    </div>
  );
}
