"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { X } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  formValuesToTaskInput,
  taskFormSchema,
  type TaskFormValues,
} from "@/lib/validation/task";
import type { Task, TaskInput } from "@/types/task";

function toDateInput(value: string | null) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 10);
}

interface TaskFormProps {
  task: Task | null;
  busy: boolean;
  onClose(): void;
  onSubmit(input: TaskInput): Promise<void>;
}

export function TaskForm({ task, busy, onClose, onSubmit }: TaskFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
    setFocus,
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: {
      title: task?.title ?? "",
      description: task?.description ?? "",
      status: task?.status ?? "todo",
      priority: task?.priority ?? "medium",
      dueDate: toDateInput(task?.dueDate ?? null),
    },
  });

  useEffect(() => {
    setFocus("title");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !busy) onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [busy, onClose, setFocus]);

  return (
    <div
      className="fixed inset-0 z-50 grid items-end bg-black/70 p-0 backdrop-blur-sm sm:place-items-center sm:p-5"
      role="presentation"
      onMouseDown={(event) => {
        if (event.currentTarget === event.target && !busy) onClose();
      }}
    >
      <section
        className="surface-card max-h-[94vh] w-full overflow-y-auto rounded-t-3xl p-5 sm:max-w-xl sm:rounded-3xl sm:p-7"
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
              {task ? "Refine the next action" : "Capture the next action"}
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
          onSubmit={handleSubmit(async (values) =>
            onSubmit(formValuesToTaskInput(values)),
          )}
          noValidate
        >
          <label className="grid gap-2 text-sm font-bold">
            Title{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              Required
            </span>
            <input
              className="control px-3"
              {...register("title")}
              aria-invalid={Boolean(errors.title)}
              aria-describedby={errors.title ? "title-error" : undefined}
              placeholder="What needs to happen?"
            />
            {errors.title && (
              <span
                id="title-error"
                role="alert"
                className="text-sm font-medium text-[var(--danger)]"
              >
                {errors.title.message}
              </span>
            )}
          </label>

          <label className="grid gap-2 text-sm font-bold">
            Description{" "}
            <span className="font-normal text-[var(--muted-foreground)]">
              Optional
            </span>
            <textarea
              className="control min-h-28 resize-y px-3 py-2"
              {...register("description")}
              aria-invalid={Boolean(errors.description)}
              placeholder="Add context, a definition of done, or useful links."
            />
            {errors.description && (
              <span
                role="alert"
                className="text-sm font-medium text-[var(--danger)]"
              >
                {errors.description.message}
              </span>
            )}
          </label>

          <div className="grid gap-4 sm:grid-cols-3">
            <label className="grid gap-2 text-sm font-bold">
              Status
              <select
                className="control px-3"
                aria-label="Status"
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
                className="control px-3"
                aria-label="Priority"
                {...register("priority")}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </label>
            <label className="grid gap-2 text-sm font-bold">
              Due date
              <input
                className="control px-3"
                type="date"
                aria-label="Due date"
                {...register("dueDate")}
                aria-invalid={Boolean(errors.dueDate)}
              />
            </label>
          </div>

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
