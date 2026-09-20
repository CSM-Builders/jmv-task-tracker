"use client";

import {
  CalendarDays,
  Check,
  Circle,
  Clock3,
  Pencil,
  Trash2,
  LockKeyhole,
  Link as LinkIcon,
} from "lucide-react";
import {
  isOverdue,
  taskEstimate,
  unresolvedDependencies,
} from "@/lib/utils/tasks";
import { formatDateInTimeZone } from "@/lib/utils/timezone";
import type { Project, Task, TaskStatus } from "@/types/task";

const statusMeta: Record<TaskStatus, { label: string; icon: typeof Circle }> = {
  todo: { label: "To do", icon: Circle },
  in_progress: { label: "In progress", icon: Clock3 },
  completed: { label: "Completed", icon: Check },
};

function PlainText({ value }: { value: string }) {
  return (
    <div className="grid gap-1">
      {value.split("\n").map((line, index) => {
        const match = line.match(/^\s*- \[([ xX])\]\s*(.*)$/);
        return match ? (
          <label key={index} className="flex items-start gap-2">
            <input
              type="checkbox"
              checked={match[1].toLowerCase() === "x"}
              readOnly
              className="mt-1"
            />
            <span>{match[2]}</span>
          </label>
        ) : (
          <span key={index}>{line || "\u00a0"}</span>
        );
      })}
    </div>
  );
}

interface TaskCardProps {
  task: Task;
  tasks: Task[];
  projects: Project[];
  busy: boolean;
  onEdit(task: Task): void;
  onDelete(task: Task): void;
  onStatus(task: Task, status: TaskStatus): Promise<void>;
}

export function TaskCard({
  task,
  tasks,
  projects,
  busy,
  onEdit,
  onDelete,
  onStatus,
}: TaskCardProps) {
  const overdue = isOverdue(task);
  const project = projects.find((candidate) => candidate.id === task.projectId);
  const timezone = project?.timezone ?? "Asia/Manila";
  const unresolved = unresolvedDependencies(task, tasks);
  const children = tasks.filter((child) => child.parentTaskId === task.id);
  const completedChildren = children.filter(
    (child) => child.status === "completed",
  ).length;
  const estimate = taskEstimate(task, tasks);
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
            {unresolved.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--warning)_50%,transparent)] px-2.5 py-1 text-xs font-extrabold text-[var(--warning)]">
                <LockKeyhole size={13} />
                Blocked
              </span>
            )}
            {task.status === "completed" && unresolved.length > 0 && (
              <span className="rounded-full border border-[var(--warning)] px-2.5 py-1 text-xs font-bold text-[var(--warning)]">
                Prerequisite reopened
              </span>
            )}
          </div>
          <h3
            className={`font-display mt-3 text-xl font-bold leading-snug ${task.status === "completed" ? "line-through decoration-[var(--muted-foreground)]" : ""}`}
          >
            {task.title}
          </h3>
          {task.description && (
            <div className="mt-2 whitespace-pre-wrap text-sm leading-6 text-[var(--muted-foreground)]">
              <PlainText value={task.description} />
            </div>
          )}
          {children.length > 0 && (
            <p className="mt-3 text-sm font-bold">
              {completedChildren}/{children.length} subtasks complete ·{" "}
              {estimate} estimated minutes
            </p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[var(--muted-foreground)]">
            {task.dueDate ? (
              <span
                className={`inline-flex items-center gap-1.5 ${overdue ? "font-bold text-[var(--danger)]" : ""}`}
              >
                <CalendarDays size={16} aria-hidden="true" /> Due{" "}
                {formatDateInTimeZone(task.dueDate, timezone)} ({timezone})
              </span>
            ) : (
              <span>No due date</span>
            )}
            <span>
              Created {formatDateInTimeZone(task.createdAt, timezone)}
            </span>
            {task.category && <span>{task.category}</span>}
            {task.dayNumber && <span>Day {task.dayNumber}</span>}
            {estimate > 0 && !children.length && (
              <span>{estimate} estimated minutes</span>
            )}
          </div>
          {(task.definitionOfDone ||
            task.requiredEvidence ||
            task.notes ||
            task.resourceLinks.length > 0 ||
            unresolved.length > 0) && (
            <details className="mt-4 rounded-xl border border-[var(--border-subtle)] p-3 text-sm">
              <summary className="cursor-pointer font-bold">
                Evidence, dependencies and notes
              </summary>
              <div className="mt-3 grid gap-3 text-[var(--muted-foreground)]">
                {unresolved.length > 0 && (
                  <p>
                    <strong className="text-[var(--foreground)]">
                      Unresolved dependencies:
                    </strong>{" "}
                    {unresolved
                      .map(
                        (id) =>
                          tasks.find((item) => item.id === id)?.title ?? id,
                      )
                      .join(", ")}
                  </p>
                )}
                {task.definitionOfDone && (
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Definition of done
                    </strong>
                    <PlainText value={task.definitionOfDone} />
                  </div>
                )}
                {task.requiredEvidence && (
                  <div>
                    <strong className="text-[var(--foreground)]">
                      Required evidence
                    </strong>
                    <PlainText value={task.requiredEvidence} />
                  </div>
                )}
                {task.notes && (
                  <div>
                    <strong className="text-[var(--foreground)]">Notes</strong>
                    <PlainText value={task.notes} />
                  </div>
                )}
                {task.resourceLinks.map((link) => (
                  <a
                    key={link}
                    className="inline-flex items-center gap-1 text-[var(--primary)] underline"
                    href={link}
                    target="_blank"
                    rel="noreferrer"
                  >
                    <LinkIcon size={14} />
                    {link}
                  </a>
                ))}
              </div>
            </details>
          )}
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
              <option
                value="in_progress"
                disabled={
                  unresolved.length > 0 && task.status !== "in_progress"
                }
              >
                In progress
              </option>
              <option
                value="completed"
                disabled={unresolved.length > 0 && task.status !== "completed"}
              >
                Completed
              </option>
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
