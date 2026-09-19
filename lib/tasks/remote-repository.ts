import {
  TaskRepositoryError,
  type TaskRepository,
} from "@/lib/tasks/repository";
import type { Task, TaskInput } from "@/types/task";

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers },
  });
  const body = (await response.json().catch(() => null)) as {
    data?: T;
    error?: string;
  } | null;
  if (!response.ok)
    throw new TaskRepositoryError(
      body?.error ?? "The task service is temporarily unavailable.",
    );
  return body?.data as T;
}

export class RemoteTaskRepository implements TaskRepository {
  list() {
    return request<Task[]>("/api/tasks");
  }

  create(input: TaskInput) {
    return request<Task>("/api/tasks", {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  update(id: string, input: Partial<TaskInput>) {
    return request<Task>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    });
  }

  remove(id: string) {
    return request<void>(`/api/tasks/${encodeURIComponent(id)}`, {
      method: "DELETE",
    });
  }
}
