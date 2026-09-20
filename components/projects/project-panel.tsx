"use client";

import { FolderKanban, Plus } from "lucide-react";
import { useMemo, useState } from "react";
import { TaskCard } from "@/components/tasks/task-card";
import { ImportPanel } from "@/components/projects/import-panel";
import {
  ResourceState,
  type LoadFailure,
} from "@/components/ui/resource-state";
import { projectProgress } from "@/lib/utils/tasks";
import { projectInputSchema } from "@/lib/validation/task";
import type { Project, ProjectInput, Task, TaskStatus } from "@/types/task";

interface Props {
  projects: Project[];
  tasks: Task[];
  selectedProjectId: string;
  busyId: string | null;
  projectLoad: {
    status: "loading" | "ready" | "error";
    failure: LoadFailure | null;
  };
  taskLoad: {
    status: "loading" | "ready" | "error";
    failure: LoadFailure | null;
  };
  onSelect(id: string): void;
  onCreate(input: ProjectInput): Promise<void>;
  onEdit(task: Task): void;
  onDelete(task: Task): void;
  onStatus(task: Task, status: TaskStatus): Promise<void>;
  onRetryProjects(): void;
  onReload(): Promise<void>;
}

const initialForm = {
  name: "",
  externalKey: "",
  description: "",
  timezone: "Asia/Manila",
  startDate: "",
  endDate: "",
};

export function ProjectPanel({
  projects,
  tasks,
  selectedProjectId,
  busyId,
  projectLoad,
  taskLoad,
  onSelect,
  onCreate,
  onEdit,
  onDelete,
  onStatus,
  onRetryProjects,
  onReload,
}: Props) {
  const [activePanel, setActivePanel] = useState<"import" | "create" | null>(
    null,
  );
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(initialForm);
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const project =
    projects.find((candidate) => candidate.id === selectedProjectId) ??
    projects[0];
  const projectTasks = useMemo(
    () => tasks.filter((task) => task.projectId === project?.id),
    [project?.id, tasks],
  );
  const days = [
    ...new Set(
      projectTasks
        .map((task) => task.dayNumber)
        .filter((day): day is number => day !== null),
    ),
  ].sort((a, b) => a - b);
  const progress = project ? projectProgress(project.id, tasks) : null;
  const formValue = {
    name: form.name,
    externalKey: form.externalKey || null,
    description: form.description || null,
    timezone: form.timezone,
    startDate: form.startDate || null,
    endDate: form.endDate || null,
  };
  const formValidation = projectInputSchema.safeParse(formValue);
  const fieldError = (field: keyof typeof form) => {
    if (!touched.has(field) || formValidation.success) return null;
    return formValidation.error.issues.find((issue) => issue.path[0] === field)
      ?.message;
  };
  const touch = (field: keyof typeof form) =>
    setTouched((current) => new Set(current).add(field));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!formValidation.success) {
      setTouched(new Set(Object.keys(form)));
      return;
    }
    setSaving(true);
    try {
      await onCreate(formValidation.data);
      setForm(initialForm);
      setTouched(new Set());
      setActivePanel(null);
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="grid gap-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {projects.map((item) => (
            <button
              key={item.id}
              className={
                item.id === project?.id
                  ? "primary-button px-4"
                  : "secondary-button px-4"
              }
              onClick={() => onSelect(item.id)}
            >
              {item.name}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            className="secondary-button px-4"
            aria-expanded={activePanel === "import"}
            aria-controls="project-import-panel"
            onClick={() =>
              setActivePanel((current) =>
                current === "import" ? null : "import",
              )
            }
          >
            Import JSON
          </button>
          <button
            className="secondary-button inline-flex items-center gap-2 px-4"
            aria-expanded={activePanel === "create"}
            aria-controls="project-create-panel"
            onClick={() =>
              setActivePanel((current) =>
                current === "create" ? null : "create",
              )
            }
          >
            <Plus size={17} />
            New project
          </button>
        </div>
      </div>
      {activePanel === "import" && (
        <div id="project-import-panel">
          <ImportPanel
            onImported={async () => {
              await onReload();
              setActivePanel(null);
            }}
          />
        </div>
      )}
      {activePanel === "create" && (
        <form
          id="project-create-panel"
          className="surface-card grid gap-4 rounded-2xl p-5 md:grid-cols-2"
          onSubmit={submit}
          noValidate
        >
          <label className="grid gap-2 text-sm font-bold">
            Name
            <input
              required
              name="name"
              maxLength={160}
              className="control px-3"
              value={form.name}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  name: event.target.value,
                }))
              }
              onBlur={() => touch("name")}
              aria-invalid={Boolean(fieldError("name"))}
              aria-describedby="project-name-error"
            />
            {fieldError("name") && (
              <span id="project-name-error" className="text-[var(--danger)]">
                {fieldError("name")}
              </span>
            )}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            External key
            <input
              name="externalKey"
              maxLength={120}
              className="control px-3"
              value={form.externalKey}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  externalKey: event.target.value,
                }))
              }
              onBlur={() => touch("externalKey")}
              aria-invalid={Boolean(fieldError("externalKey"))}
              aria-describedby="project-external-key-error"
            />
            {fieldError("externalKey") && (
              <span
                id="project-external-key-error"
                className="text-[var(--danger)]"
              >
                {fieldError("externalKey")}
              </span>
            )}
          </label>
          <label className="grid gap-2 text-sm font-bold md:col-span-2">
            Description
            <textarea
              name="description"
              className="control min-h-24 px-3 py-2"
              value={form.description}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  description: event.target.value,
                }))
              }
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Timezone
            <input
              required
              name="timezone"
              className="control px-3"
              value={form.timezone}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  timezone: event.target.value,
                }))
              }
              onBlur={() => touch("timezone")}
              aria-invalid={Boolean(fieldError("timezone"))}
              aria-describedby="project-timezone-error"
            />
            {fieldError("timezone") && (
              <span
                id="project-timezone-error"
                className="text-[var(--danger)]"
              >
                {fieldError("timezone")}
              </span>
            )}
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="grid gap-2 text-sm font-bold">
              Start
              <input
                name="startDate"
                type="date"
                className="control px-3"
                value={form.startDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    startDate: event.target.value,
                  }))
                }
                onBlur={() => touch("startDate")}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              End
              <input
                name="endDate"
                type="date"
                className="control px-3"
                value={form.endDate}
                onChange={(event) =>
                  setForm((current) => ({
                    ...current,
                    endDate: event.target.value,
                  }))
                }
                onBlur={() => touch("endDate")}
                aria-invalid={Boolean(fieldError("endDate"))}
                aria-describedby="project-end-date-error"
              />
              {fieldError("endDate") && (
                <span
                  id="project-end-date-error"
                  className="text-[var(--danger)]"
                >
                  {fieldError("endDate")}
                </span>
              )}
            </label>
          </div>
          <div className="flex gap-2 md:col-span-2 md:justify-end">
            <button
              type="button"
              className="secondary-button px-4"
              onClick={() => setActivePanel(null)}
            >
              Cancel
            </button>
            <button
              className="primary-button px-4"
              disabled={saving || !formValidation.success}
            >
              {saving ? "Creating…" : "Create project"}
            </button>
          </div>
        </form>
      )}
      {projectLoad.status === "loading" ? (
        <ResourceState state="loading" label="projects" />
      ) : projectLoad.status === "error" ? (
        <ResourceState
          state="error"
          label="projects"
          failure={projectLoad.failure}
          onRetry={onRetryProjects}
        />
      ) : !project ? (
        <div className="surface-card grid min-h-60 place-items-center rounded-2xl p-8 text-center">
          <div>
            <FolderKanban className="mx-auto text-[var(--primary)]" />
            <h2 className="font-display mt-3 text-2xl font-bold">
              No projects yet
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              Create a project or import a validated project plan.
            </p>
          </div>
        </div>
      ) : (
        <>
          <article className="surface-card rounded-2xl p-6">
            <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]">
              PROJECT OVERVIEW
            </p>
            <h2 className="font-display mt-2 text-3xl font-bold">
              {project.name}
            </h2>
            {project.description && (
              <p className="mt-3 whitespace-pre-wrap text-[var(--muted-foreground)]">
                {project.description}
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-4">
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">DATES</p>
                <p className="font-bold">
                  {project.startDate ?? "Open"} – {project.endDate ?? "Open"}
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  TIMEZONE
                </p>
                <p className="font-bold">{project.timezone}</p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  LEAF PROGRESS
                </p>
                <p className="font-bold">
                  {progress?.completed}/{progress?.total} ({progress?.percent}%)
                </p>
              </div>
              <div>
                <p className="text-xs text-[var(--muted-foreground)]">
                  ESTIMATED
                </p>
                <p className="font-bold">{progress?.estimatedMinutes} min</p>
              </div>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-[var(--surface-raised)]">
              <div
                className="h-full bg-[var(--primary)]"
                style={{ width: `${progress?.percent ?? 0}%` }}
              />
            </div>
          </article>
          {taskLoad.status === "loading" && (
            <ResourceState state="loading" label="project tasks" />
          )}
          {taskLoad.status === "error" && (
            <ResourceState
              state="error"
              label="project tasks"
              failure={taskLoad.failure}
              onRetry={() => void onReload()}
            />
          )}
          {taskLoad.status === "ready" &&
            (days.length ? days : [0]).map((day) => {
              const dayTasks = projectTasks.filter((task) =>
                day ? task.dayNumber === day : true,
              );
              const parents = dayTasks.filter(
                (task) => task.parentTaskId === null,
              );
              return (
                <details
                  key={day}
                  open
                  className="surface-card rounded-2xl p-4"
                >
                  <summary className="cursor-pointer font-display text-xl font-bold">
                    {day ? `Day ${day}` : "Project tasks"} · {dayTasks.length}{" "}
                    items
                  </summary>
                  <div className="mt-4 grid gap-3">
                    {parents.flatMap((parent) => [
                      <TaskCard
                        key={parent.id}
                        task={parent}
                        tasks={tasks}
                        projects={projects}
                        busy={busyId === parent.id}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onStatus={onStatus}
                      />,
                      ...dayTasks
                        .filter((child) => child.parentTaskId === parent.id)
                        .map((child) => (
                          <div
                            key={child.id}
                            className="ml-3 border-l-2 border-[var(--border)] pl-3 sm:ml-6 sm:pl-5"
                          >
                            <TaskCard
                              task={child}
                              tasks={tasks}
                              projects={projects}
                              busy={busyId === child.id}
                              onEdit={onEdit}
                              onDelete={onDelete}
                              onStatus={onStatus}
                            />
                          </div>
                        )),
                    ])}
                  </div>
                </details>
              );
            })}
        </>
      )}
    </section>
  );
}
