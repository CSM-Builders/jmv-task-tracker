"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm, useWatch } from "react-hook-form";
import { dateKeyInTimeZone } from "@/lib/utils/timezone";
import {
  formValuesToTaskInput,
  taskFormSchema,
  type TaskFormValues,
} from "@/lib/validation/task";
import type { Project, Task, TaskInput } from "@/types/task";

interface TaskFormProps {
  task: Task | null;
  tasks: Task[];
  projects: Project[];
  busy: boolean;
  onClose(): void;
  onSubmit(input: TaskInput): Promise<void>;
}

export function TaskForm({
  task,
  tasks,
  projects,
  busy,
  onClose,
  onSubmit,
}: TaskFormProps) {
  const initialProject = task?.projectId ?? "";
  const initialTimezone =
    projects.find((project) => project.id === initialProject)?.timezone ??
    "Asia/Manila";
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
    control,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      projectId: initialProject,
      parentTaskId: task?.parentTaskId ?? "",
      externalKey: task?.externalKey ?? "",
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "todo",
      priority: task?.priority ?? "medium",
      dueDate: task?.dueDate
        ? dateKeyInTimeZone(new Date(task.dueDate), initialTimezone)
        : "",
      category: task?.category ?? "",
      estimatedMinutes:
        task?.estimatedMinutes === null || task?.estimatedMinutes === undefined
          ? ""
          : String(task.estimatedMinutes),
      dayNumber:
        task?.dayNumber === null || task?.dayNumber === undefined
          ? ""
          : String(task.dayNumber),
      definitionOfDone: task?.definitionOfDone ?? "",
      requiredEvidence: task?.requiredEvidence ?? "",
      interviewCompetency: task?.interviewCompetency ?? "",
      resourceLinks: task?.resourceLinks.join("\n") ?? "",
      notes: task?.notes ?? "",
      tags: task?.tags.join(", ") ?? "",
      dependencyIds: task?.dependencyIds ?? [],
    },
  });
  const projectId = useWatch({ control, name: "projectId" });
  const timezone =
    projects.find((project) => project.id === projectId)?.timezone ??
    "Asia/Manila";
  const candidates = tasks.filter(
    (candidate) =>
      candidate.id !== task?.id && candidate.projectId === (projectId || null),
  );
  const parents = candidates.filter(
    (candidate) => candidate.parentTaskId === null,
  );

  useEffect(() => {
    setFocus("title");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, setFocus]);

  const fieldClass = "control px-3";
  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        className="surface-card max-h-[94vh] w-full overflow-y-auto rounded-t-3xl p-5 sm:max-w-3xl sm:rounded-3xl sm:p-7"
        role="dialog"
        aria-modal="true"
        aria-labelledby="task-form-title"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]">
              {task ? "UPDATE TASK" : "NEW TASK"}
            </p>
            <h2
              id="task-form-title"
              className="font-display mt-1 text-2xl font-bold"
            >
              {task ? "Refine the work item" : "Capture the next action"}
            </h2>
          </div>
          <button
            type="button"
            className="control grid h-11 w-11 place-items-center"
            onClick={onClose}
            disabled={busy}
            aria-label="Close task form"
          >
            <X size={20} aria-hidden="true" />
          </button>
        </div>
        <form
          className="mt-6 grid gap-5"
          onSubmit={handleSubmit((values) =>
            onSubmit(formValuesToTaskInput(values, timezone)),
          )}
          noValidate
        >
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Project
              <select
                aria-label="Project"
                className={fieldClass}
                {...register("projectId")}
              >
                <option value="">No project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Parent task
              <select
                aria-label="Parent task"
                className={fieldClass}
                {...register("parentTaskId")}
              >
                <option value="">Top-level task</option>
                {parents.map((parent) => (
                  <option key={parent.id} value={parent.id}>
                    {parent.title}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Title{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              Required
            </span>
            <input
              className={fieldClass}
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              placeholder="What needs to happen?"
            />
            {errors.title && (
              <span role="alert" className="text-sm text-[var(--danger)]">
                {errors.title.message}
              </span>
            )}
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Description{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              Plain text and checklists, up to 20,000 characters
            </span>
            <textarea
              className="control min-h-40 resize-y px-3 py-2"
              {...register("description")}
              aria-invalid={Boolean(errors.description)}
              placeholder={"Add context or a checklist:\n- [ ] First step"}
            />
          </label>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold">
              Status
              <select
                aria-label="Status"
                className={fieldClass}
                {...register("status")}
              >
                <option value="todo">To do</option>
                <option value="in_progress">In progress</option>
                <option value="completed">Completed</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Priority
              <select
                aria-label="Priority"
                className={fieldClass}
                {...register("priority")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Due date{" "}
              <span className="font-normal text-[var(--muted-foreground)]">
                {timezone}
              </span>
              <input
                className={fieldClass}
                type="date"
                {...register("dueDate")}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold">
              Category
              <input className={fieldClass} {...register("category")} />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Estimate (minutes)
              <input
                className={fieldClass}
                type="number"
                min="0"
                {...register("estimatedMinutes")}
                disabled={tasks.some(
                  (child) => child.parentTaskId === task?.id,
                )}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Day number
              <input
                className={fieldClass}
                type="number"
                min="1"
                {...register("dayNumber")}
              />
            </label>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              External key
              <input
                className={fieldClass}
                {...register("externalKey")}
                placeholder="Stable import key"
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Tags{" "}
              <span className="font-normal text-[var(--muted-foreground)]">
                Comma-separated
              </span>
              <input className={fieldClass} {...register("tags")} />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Dependencies{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              Use Ctrl/Cmd to select multiple
            </span>
            <select
              multiple
              className="control min-h-28 px-3 py-2"
              {...register("dependencyIds")}
            >
              {candidates.map((candidate) => (
                <option key={candidate.id} value={candidate.id}>
                  {candidate.externalKey ? `${candidate.externalKey} — ` : ""}
                  {candidate.title}
                </option>
              ))}
            </select>
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Definition of done
              <textarea
                className="control min-h-24 px-3 py-2"
                {...register("definitionOfDone")}
              />
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Required evidence
              <textarea
                className="control min-h-24 px-3 py-2"
                {...register("requiredEvidence")}
              />
            </label>
          </div>
          <label className="grid gap-2 text-sm font-bold">
            Interview competency
            <input
              className={fieldClass}
              {...register("interviewCompetency")}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Resource links{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              One http/https URL per line
            </span>
            <textarea
              className="control min-h-24 px-3 py-2"
              {...register("resourceLinks")}
            />
          </label>
          <label className="grid gap-2 text-sm font-bold">
            Evidence and notes
            <textarea
              className="control min-h-32 px-3 py-2"
              {...register("notes")}
            />
          </label>
          <div className="mt-1 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
            <button
              className="secondary-button px-5"
              type="button"
              onClick={onClose}
              disabled={busy}
            >
              Cancel
            </button>
            <button
              className="primary-button px-5"
              type="submit"
              disabled={busy}
            >
              {busy ? "Saving…" : task ? "Save changes" : "Create task"}
            </button>
          </div>
        </form>
      </section>
    </div>
  );
}
