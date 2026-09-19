"use client";

import {
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Pencil,
  Trash2,
} from "lucide-react";
import { isOverdue } from "@/lib/utils/tasks";
import type { Task, TaskStatus } from "@/types/task";

const statusMeta: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: "To do", icon: Circle },
  in_progress: { label: "In progress", icon: Clock3 },
  completed: { label: "Completed", icon: Check },
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

interface TaskCardProps {
  task: Task;
  busy: boolean;
  onEdit(task: Task): void;
  onDelete(task: Task): void;
  onStatus(task: Task, status: TaskStatus): Promise<void>;
}

export function TaskCard({
  task,
  busy,
  onEdit,
  onDelete,
  onStatus,
}: TaskCardProps) {
  const overdue = isOverdue(task);
  const StatusIcon = statusMeta[task.status].icon;

  return (
    <article
      className={`surface-card rounded-2xl border-l-2 p-4 md:p-5 ${task.status === "completed" ? "opacity-75" : ""}`}
      style={{
        borderLeftColor:
          task.priority === "high"
            ? "var(--danger)"
            : task.priority === "medium"
              ? "var(--warning)"
              : "var(--success)",
      }}
    >
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-extrabold ${task.status === "completed" ? "text-[var(--success)]" : "text-[var(--primary)]"}`}
            >
              <StatusIcon size={13} aria-hidden="true" />
              {statusMeta[task.status].label}
            </span>
            <span className="rounded-full border border-[var(--border-subtle)] px-2.5 py-1 text-xs font-extrabold capitalize">
              {task.priority} priority
            </span>
            {overdue && (
              <span className="rounded-full border border-[color-mix(in_srgb,var(--danger)_42%,transparent)] bg-[color-mix(in_srgb,var(--danger)_9%,transparent)] px-2.5 py-1 text-xs font-extrabold text-[var(--danger)]">
                Overdue
              </span>
            )}
          </div>
          <h3
            className={`font-display mt-3 text-xl font-bold leading-snug ${task.status === "completed" ? "line-through decoration-[var(--muted-foreground)]" : ""}`}
          >
            {task.title}
          </h3>
          {task.description && (
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
              {task.description}
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted-foreground)]">
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1.5 ${overdue ? "font-bold text-[var(--danger)]" : ""}`}
              >
                <CalendarDays size={16} aria-hidden="true" /> Due{" "}
                {formatDate(task.dueDate)}
              </span>
            ) : (
              <span>No due date</span>
            )}
            <span>Created {formatDate(task.createdAt)}</span>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:max-w-64 xl:justify-end">
          <label className="min-w-40 flex-1 xl:flex-none">
            <span className="sr-only">Change status for {task.title}</span>
            <select
              className="control w-full px-3 text-sm font-bold"
              value={task.status}
              disabled={busy}
              onChange={(event) =>
                void onStatus(task, event.target.value as TaskStatus)
              }
              aria-label={`Change status for ${task.title}`}
            >
              <option value="todo">To do</option>
              <option value="in_progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </label>
          <button
            type="button"
            className="control grid h-11 w-11 place-items-center"
            onClick={() => onEdit(task)}
            disabled={busy}
            aria-label={`Edit ${task.title}`}
          >
            <Pencil size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="control grid h-11 w-11 place-items-center text-[var(--danger)]"
            onClick={() => onDelete(task)}
            disabled={busy}
            aria-label={`Delete ${task.title}`}
          >
            <Trash2 size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </article>
  );
}
