import type { ProjectRow, TaskRow } from "@/types/database";
import type { Project, Task } from "@/types/task";

export function rowToTask(row: TaskRow): Task {
  return {
    id: row.id,
    userId: row.user_id,
    projectId: row.project_id ?? null,
    parentTaskId: row.parent_task_id ?? null,
    externalKey: row.external_key ?? null,
    title: row.title,
    description: row.description,
    status: row.status,
    priority: row.priority,
    dueDate: row.due_date,
    category: row.category ?? null,
    estimatedMinutes: row.estimated_minutes ?? null,
    dayNumber: row.day_number ?? null,
    definitionOfDone: row.definition_of_done ?? null,
    requiredEvidence: row.required_evidence ?? null,
    interviewCompetency: row.interview_competency ?? null,
    resourceLinks: row.resource_links ?? [],
    notes: row.notes ?? null,
    tags: row.tags ?? [],
    dependencyIds: row.dependency_ids ?? [],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

export function rowToProject(row: ProjectRow): Project {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description,
    timezone: row.timezone,
    startDate: row.start_date,
    endDate: row.end_date,
    externalKey: row.external_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
