import type { Task } from "@/types/task";

function atEndOfDay(offset: number) {
  const date = new Date();
  date.setDate(date.getDate() + offset);
  date.setHours(23, 59, 59, 0);
  return date.toISOString();
}

export function createSampleTasks(): Task[] {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86_400_000).toISOString();
  return [
    {
      id: "demo-plan-quarter",
      userId: "demo-user",
      projectId: null,
      parentTaskId: null,
      externalKey: null,
      title: "Plan the week’s priority outcomes",
      description: "Choose the three results that will make this week count.",
      status: "in_progress",
      priority: "high",
      dueDate: atEndOfDay(0),
      category: "Planning",
      estimatedMinutes: 30,
      dayNumber: null,
      definitionOfDone: null,
      requiredEvidence: null,
      interviewCompetency: null,
      resourceLinks: [],
      notes: null,
      tags: ["weekly-focus"],
      dependencyIds: [],
      createdAt: yesterday,
      updatedAt: now.toISOString(),
      completedAt: null,
    },
    {
      id: "demo-review-automation",
      userId: "demo-user",
      projectId: null,
      parentTaskId: null,
      externalKey: null,
      title: "Review automation monitoring notes",
      description:
        "Capture recurring alerts and decide which checks can be automated.",
      status: "todo",
      priority: "medium",
      dueDate: atEndOfDay(2),
      category: "Operations",
      estimatedMinutes: 45,
      dayNumber: null,
      definitionOfDone: null,
      requiredEvidence: null,
      interviewCompetency: null,
      resourceLinks: [],
      notes: null,
      tags: [],
      dependencyIds: [],
      createdAt: new Date(now.getTime() - 43_200_000).toISOString(),
      updatedAt: now.toISOString(),
      completedAt: null,
    },
    {
      id: "demo-update-portfolio",
      userId: "demo-user",
      projectId: null,
      parentTaskId: null,
      externalKey: null,
      title: "Publish project case-study outline",
      description:
        "Draft the problem, system design, and measurable outcome sections.",
      status: "completed",
      priority: "low",
      dueDate: atEndOfDay(-1),
      category: "Portfolio",
      estimatedMinutes: 60,
      dayNumber: null,
      definitionOfDone: null,
      requiredEvidence: null,
      interviewCompetency: null,
      resourceLinks: [],
      notes: null,
      tags: ["portfolio"],
      dependencyIds: [],
      createdAt: new Date(now.getTime() - 172_800_000).toISOString(),
      updatedAt: now.toISOString(),
      completedAt: now.toISOString(),
    },
  ];
}
