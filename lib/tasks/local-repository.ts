import { taskInputSchema, taskUpdateSchema } from "@/lib/validation/task";
import { createSampleTasks } from "@/lib/tasks/sample-data";
import {
  TaskRepositoryError,
  type TaskRepository,
} from "@/lib/tasks/repository";
import type { Task, TaskInput } from "@/types/task";

const STORAGE_KEY = "jmv-task-tracker.tasks.v1";

function readTasks(): Task[] {
  const value = window.localStorage.getItem(STORAGE_KEY);
  if (!value) {
    const samples = createSampleTasks();
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(samples));
    return samples;
  }

  try {
    return JSON.parse(value) as Task[];
  } catch {
    throw new TaskRepositoryError(
      "Local task data could not be read. Clear this site’s storage to start again.",
    );
  }
}

function saveTasks(tasks: Task[]) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

export class LocalTaskRepository implements TaskRepository {
  async list() {
    return readTasks();
  }

  async create(rawInput: TaskInput) {
    const input = taskInputSchema.parse(rawInput);
    const now = new Date().toISOString();
    const task: Task = {
      id: crypto.randomUUID(),
      userId: "demo-user",
      ...input,
      createdAt: now,
      updatedAt: now,
      completedAt: input.status === "completed" ? now : null,
    };
    saveTasks([task, ...readTasks()]);
    return task;
  }

  async update(id: string, rawInput: Partial<TaskInput>) {
    const input = taskUpdateSchema.parse(rawInput);
    const tasks = readTasks();
    const current = tasks.find((task) => task.id === id);
    if (!current) throw new TaskRepositoryError("That task no longer exists.");

    const now = new Date().toISOString();
    const nextStatus = input.status ?? current.status;
    const updated: Task = {
      ...current,
      ...input,
      updatedAt: now,
      completedAt:
        nextStatus === "completed" ? (current.completedAt ?? now) : null,
    };
    saveTasks(tasks.map((task) => (task.id === id ? updated : task)));
    return updated;
  }

  async remove(id: string) {
    const tasks = readTasks();
    if (!tasks.some((task) => task.id === id))
      throw new TaskRepositoryError("That task no longer exists.");
    saveTasks(tasks.filter((task) => task.id !== id));
  }
}
