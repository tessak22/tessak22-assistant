export function todayStr(): string {
  return new Date().toISOString().split("T")[0];
}

export function formatDate(dateStr: string | null): string {
  if (!dateStr) return "No date";
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function priorityLabel(p: number): string {
  switch (p) {
    case 1:
      return "Critical";
    case 2:
      return "High";
    case 3:
      return "Medium";
    case 4:
      return "Low";
    case 5:
      return "Minimal";
    default:
      return "Unknown";
  }
}

export function priorityColor(p: number): string {
  switch (p) {
    case 1:
      return "text-red-600 bg-red-50 border-red-200";
    case 2:
      return "text-orange-600 bg-orange-50 border-orange-200";
    case 3:
      return "text-yellow-600 bg-yellow-50 border-yellow-200";
    case 4:
      return "text-blue-600 bg-blue-50 border-blue-200";
    case 5:
      return "text-gray-600 bg-gray-50 border-gray-200";
    default:
      return "text-gray-600 bg-gray-50 border-gray-200";
  }
}

export function statusLabel(s: string): string {
  switch (s) {
    case "pending":
      return "Pending";
    case "in_progress":
      return "In Progress";
    case "completed":
      return "Completed";
    case "deferred":
      return "Deferred";
    default:
      return s;
  }
}
