import { taskInputSchema, taskUpdateSchema } from "@/lib/validation/task";
import { createSampleTasks } from "@/lib/tasks/sample-data";
import {
  TaskRepositoryError,
  type TaskRepository,
} from "@/lib/tasks/repository";
import type { Task, TaskInput } from "@/types/task";

const STORAGE_KEY = "jmv-task-tracker.tasks.v1";

function upgradeTask(task: Task): Task {
  return {
    ...task,
    projectId: task.projectId ?? null,
    parentTaskId: task.parentTaskId ?? null,
    externalKey: task.externalKey ?? null,
    category: task.category ?? null,
    estimatedMinutes: task.estimatedMinutes ?? null,
    dayNumber: task.dayNumber ?? null,
    definitionOfDone: task.definitionOfDone ?? null,
    requiredEvidence: task.requiredEvidence ?? null,
    interviewCompetency: task.interviewCompetency ?? null,
    resourceLinks: task.resourceLinks ?? [],
    notes: task.notes ?? null,
    tags: task.tags ?? [],
    dependencyIds: task.dependencyIds ?? [],
  };
}

function readTasks(): Task[] {
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    const samples = createSampleTasks();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
    return samples;
  }

  try {
    const upgraded = (JSON.parse(value) as Task[]).map(upgradeTask);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(upgraded));
    return upgraded;
  } catch {
    throw new TaskRepositoryError(
      "Local task data could not be read. Clear this site’s storage to start again.",
    );
  }
}

function saveTasks(tasks: Task[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function validateDependencies(
  tasks: Task[],
  taskId: string | null,
  projectId: string | null,
  dependencyIds: string[],
) {
  for (const dependencyId of dependencyIds) {
    const dependency = tasks.find((task) => task.id === dependencyId);
    if (!dependency || dependency.projectId !== projectId)
      throw new TaskRepositoryError(
        "Dependencies must be existing tasks in the same project.",
      );
    if (dependencyId === taskId)
      throw new TaskRepositoryError("A task cannot depend on itself.");
  }
  if (!taskId) return;
  const graph = new Map(
    tasks.map((task) => [
      task.id,
      task.id === taskId ? dependencyIds : task.dependencyIds,
    ]),
  );
  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string): boolean => {
    if (visiting.has(id)) return true;
    if (visited.has(id)) return false;
    visiting.add(id);
    if ((graph.get(id) ?? []).some(visit)) return true;
    visiting.delete(id);
    visited.add(id);
    return false;
  };
  if (visit(taskId))
    throw new TaskRepositoryError("Task dependency cycle detected.");
}

export class LocalTaskRepository implements TaskRepository {
  async list() {
    return readTasks();
  }

  async create(rawInput: TaskInput) {
    const input = taskInputSchema.parse(rawInput);
    const tasks = readTasks();
    if (input.parentTaskId) {
      const parent = tasks.find((task) => task.id === input.parentTaskId);
      if (
        !parent ||
        parent.parentTaskId ||
        parent.projectId !== input.projectId
      )
        throw new TaskRepositoryError(
          "Choose a top-level parent in the same project.",
        );
    }
    validateDependencies(tasks, null, input.projectId, input.dependencyIds);
    const unresolved = input.dependencyIds.filter(
      (dependencyId) =>
        tasks.find((task) => task.id === dependencyId)?.status !== "completed",
    );
    if (
      ["in_progress", "completed"].includes(input.status) &&
      unresolved.length &&
      !input.dependencyOverrideReason
    )
      throw new TaskRepositoryError(
        "Complete dependencies before starting or completing this task.",
      );
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      userId: "demo-user",
      ...input,
      createdAt: now,
      updatedAt: now,
      completedAt: input.status === "completed" ? now : null,
    };
    saveTasks([
      task,
      ...tasks.map((existing) =>
        existing.id === input.parentTaskId
          ? {
              ...existing,
              estimatedMinutes: null,
              ...(existing.status === "completed" &&
              input.status !== "completed"
                ? { status: "todo" as const, completedAt: null }
                : {}),
            }
          : existing,
      ),
    ]);
    return task;
  }

  async update(id: string, rawInput: Partial<TaskInput>) {
    const input = taskUpdateSchema.parse(rawInput);
    const tasks = readTasks();
    const current = tasks.find((task) => task.id === id);
    if (!current) throw new TaskRepositoryError("That task no longer exists.");

    const projectId =
      input.projectId === undefined ? current.projectId : input.projectId;
    const parentTaskId =
      input.parentTaskId === undefined
        ? current.parentTaskId
        : input.parentTaskId;
    if (parentTaskId) {
      const parent = tasks.find((task) => task.id === parentTaskId);
      if (!parent || parent.parentTaskId || parent.projectId !== projectId)
        throw new TaskRepositoryError(
          "Choose a top-level parent in the same project.",
        );
    }
    const dependencyIds = input.dependencyIds ?? current.dependencyIds;
    if (
      tasks.some(
        (task) => task.parentTaskId === id && task.projectId !== projectId,
      ) ||
      tasks.some(
        (task) =>
          task.id !== id &&
          task.dependencyIds.includes(id) &&
          task.projectId !== projectId,
      )
    )
      throw new TaskRepositoryError(
        "Existing child and dependency links must stay in the same project.",
      );
    validateDependencies(tasks, id, projectId, dependencyIds);
    const unresolved = dependencyIds.filter(
      (dependencyId) =>
        tasks.find((task) => task.id === dependencyId)?.status !== "completed",
    );
    const now = new Date().toISOString();
    const nextStatus = input.status ?? current.status;
    if (
      ["in_progress", "completed"].includes(nextStatus) &&
      unresolved.length &&
      !input.dependencyOverrideReason
    )
      throw new TaskRepositoryError(
        "Complete dependencies before starting or completing this task.",
      );
    if (nextStatus === "completed") {
      const incompleteChild = tasks.some(
        (task) => task.parentTaskId === id && task.status !== "completed",
      );
      if (incompleteChild)
        throw new TaskRepositoryError(
          "Complete every child before completing its parent.",
        );
    }
    const updated: Task = {
      ...current,
      ...input,
      updatedAt: now,
      completedAt:
        nextStatus === "completed" ? (current.completedAt ?? now) : null,
    };
    saveTasks(
      tasks.map((task) => {
        if (task.id === id) return updated;
        if (
          current.status === "completed" &&
          nextStatus !== "completed" &&
          task.id === current.parentTaskId
        )
          return { ...task, status: "todo", completedAt: null, updatedAt: now };
        return task;
      }),
    );
    return updated;
  }

  async remove(id: string) {
    const tasks = readTasks();
    if (!tasks.some((task) => task.id === id))
      throw new TaskRepositoryError("That task no longer exists.");
    if (tasks.some((task) => task.parentTaskId === id))
      throw new TaskRepositoryError(
        "Delete or move this task's children before deleting it.",
      );
    if (tasks.some((task) => task.dependencyIds.includes(id)))
      throw new TaskRepositoryError(
        "Remove this task from dependent tasks before deleting it.",
      );
    saveTasks(tasks.filter((task) => task.id !== id));
  }
}
