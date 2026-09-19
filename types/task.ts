export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  userId: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskInput {
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
}

export type TaskSort = "createdAt" | "dueDate" | "title" | "priority";
export type TaskView =
  "dashboard" | "all" | "today" | "upcoming" | "completed" | "settings";
