import type { SupabaseClient } from "@supabase/supabase-js";
import { rowToTask } from "@/lib/tasks/mappers";
import type { TaskRow } from "@/types/database";
import type { Task } from "@/types/task";

export async function attachDependencies(
  supabase: SupabaseClient,
  rows: TaskRow[],
): Promise<Task[]> {
  if (!rows.length) return [];
  const ids = rows.map((row) => row.id);
  const { data, error } = await supabase
    .from("task_dependencies")
    .select("task_id, depends_on_task_id")
    .in("task_id", ids);
  if (error) throw error;
  const dependencyMap = new Map<string, string[]>();
  for (const dependency of data ?? []) {
    const current = dependencyMap.get(dependency.task_id) ?? [];
    current.push(dependency.depends_on_task_id);
    dependencyMap.set(dependency.task_id, current);
  }
  return rows.map((row) =>
    rowToTask({ ...row, dependency_ids: dependencyMap.get(row.id) ?? [] }),
  );
}

export function taskInsert(input: Record<string, unknown>, userId: string) {
  return {
    user_id: userId,
    project_id: input.projectId,
    parent_task_id: input.parentTaskId,
    external_key: input.externalKey,
    title: input.title,
    description: input.description,
    status: input.status,
    priority: input.priority,
    due_date: input.dueDate,
    category: input.category,
    estimated_minutes: input.estimatedMinutes,
    day_number: input.dayNumber,
    definition_of_done: input.definitionOfDone,
    required_evidence: input.requiredEvidence,
    interview_competency: input.interviewCompetency,
    resource_links: input.resourceLinks,
    notes: input.notes,
    tags: input.tags,
    completed_at:
      input.status === "completed" ? new Date().toISOString() : null,
  };
}
