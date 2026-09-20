export const TASK_STATUSES = ["todo", "in_progress", "completed"] as const;
export const TASK_PRIORITIES = ["low", "medium", "high"] as const;

export type TaskStatus = (typeof TASK_STATUSES)[number];
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export interface Task {
  id: string;
  userId: string;
  projectId: string | null;
  parentTaskId: string | null;
  externalKey: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  dayNumber: number | null;
  definitionOfDone: string | null;
  requiredEvidence: string | null;
  interviewCompetency: string | null;
  resourceLinks: string[];
  notes: string | null;
  tags: string[];
  dependencyIds: string[];
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
}

export interface TaskInput {
  projectId: string | null;
  parentTaskId: string | null;
  externalKey: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string | null;
  category: string | null;
  estimatedMinutes: number | null;
  dayNumber: number | null;
  definitionOfDone: string | null;
  requiredEvidence: string | null;
  interviewCompetency: string | null;
  resourceLinks: string[];
  notes: string | null;
  tags: string[];
  dependencyIds: string[];
  dependencyOverrideReason?: string | null;
}

export type TaskSort = "createdAt" | "dueDate" | "title" | "priority";
export type TaskView =
  | "dashboard"
  | "projects"
  | "all"
  | "today"
  | "upcoming"
  | "completed"
  | "settings";

export interface Project {
  id: string;
  userId: string;
  name: string;
  description: string | null;
  timezone: string;
  startDate: string | null;
  endDate: string | null;
  externalKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProjectInput {
  name: string;
  description: string | null;
  timezone: string;
  startDate: string | null;
  endDate: string | null;
  externalKey: string | null;
}

export interface TaskListResult {
  tasks: Task[];
  totalCount: number;
  nextCursor: string | null;
}
