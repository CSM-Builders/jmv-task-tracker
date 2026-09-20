import type { Task } from "@/types/task";

export function makeTask(overrides: Partial<Task> = {}): Task {
  return {
    id: "11111111-1111-4111-8111-111111111111",
    userId: "demo-user",
    projectId: null,
    parentTaskId: null,
    externalKey: null,
    title: "Review the launch checklist",
    description: "Confirm monitoring and rollback steps.",
    status: "todo",
    priority: "medium",
    dueDate: "2030-04-12T23:59:59.000Z",
    category: null,
    estimatedMinutes: null,
    dayNumber: null,
    definitionOfDone: null,
    requiredEvidence: null,
    interviewCompetency: null,
    resourceLinks: [],
    notes: null,
    tags: [],
    dependencyIds: [],
    createdAt: "2030-04-01T10:00:00.000Z",
    updatedAt: "2030-04-01T10:00:00.000Z",
    completedAt: null,
    ...overrides,
  };
}
