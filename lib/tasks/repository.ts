import type { Task, TaskInput } from "@/types/task";

export interface TaskRepository {
  list(): Promise<Task[]>;
  create(input: TaskInput): Promise<Task>;
  update(id: string, input: Partial<TaskInput>): Promise<Task>;
  remove(id: string): Promise<void>;
}

export class TaskRepositoryError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskRepositoryError";
  }
}
