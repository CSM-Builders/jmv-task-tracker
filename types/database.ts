import type { TaskPriority, TaskStatus } from "@/types/task";

export interface TaskRow {
  id: string;
  user_id: string;
  project_id: string | null;
  parent_task_id: string | null;
  external_key: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  due_date: string | null;
  category: string | null;
  estimated_minutes: number | null;
  day_number: number | null;
  definition_of_done: string | null;
  required_evidence: string | null;
  interview_competency: string | null;
  resource_links: string[] | null;
  notes: string | null;
  tags: string[] | null;
  dependency_ids?: string[] | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

export interface ProjectRow {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  timezone: string;
  start_date: string | null;
  end_date: string | null;
  external_key: string | null;
  created_at: string;
  updated_at: string;
}
