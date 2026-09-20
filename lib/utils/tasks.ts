import type {
  Project,
  Task,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskView,
} from "@/types/task";
import { dateKeyInTimeZone } from "@/lib/utils/timezone";

const priorityRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

export function isOverdue(task: Task, now = new Date()) {
  return (
    task.status !== "completed" &&
    Boolean(task.dueDate && new Date(task.dueDate).getTime() < now.getTime())
  );
}

export function isDueToday(
  task: Task,
  now = new Date(),
  timezone = "Asia/Manila",
) {
  if (!task.dueDate) return false;
  return (
    dateKeyInTimeZone(new Date(task.dueDate), timezone) ===
    dateKeyInTimeZone(now, timezone)
  );
}

export function isUpcoming(
  task: Task,
  now = new Date(),
  timezone = "Asia/Manila",
) {
  if (!task.dueDate || task.status === "completed") return false;
  return (
    dateKeyInTimeZone(new Date(task.dueDate), timezone) >
    dateKeyInTimeZone(now, timezone)
  );
}

interface TaskFilters {
  query: string;
  status: "all" | TaskStatus;
  priority: "all" | TaskPriority;
  projectId?: "all" | "none" | string;
  dayNumber?: "all" | number;
  category?: "all" | string;
  view: TaskView;
  now?: Date;
  projects?: Project[];
}

export function filterTasks(tasks: Task[], filters: TaskFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  const now = filters.now ?? new Date();

  return tasks.filter((task) => {
    const timezone =
      filters.projects?.find((project) => project.id === task.projectId)
        ?.timezone ?? "Asia/Manila";
    const matchesQuery =
      !query ||
      task.title.toLocaleLowerCase().includes(query) ||
      task.description?.toLocaleLowerCase().includes(query) ||
      task.notes?.toLocaleLowerCase().includes(query) ||
      task.requiredEvidence?.toLocaleLowerCase().includes(query) ||
      task.tags.some((tag) => tag.toLocaleLowerCase().includes(query));
    const matchesStatus =
      filters.status === "all" || task.status === filters.status;
    const matchesPriority =
      filters.priority === "all" || task.priority === filters.priority;
    const matchesProject =
      !filters.projectId ||
      filters.projectId === "all" ||
      (filters.projectId === "none"
        ? task.projectId === null
        : task.projectId === filters.projectId);
    const matchesDay =
      !filters.dayNumber ||
      filters.dayNumber === "all" ||
      task.dayNumber === filters.dayNumber;
    const matchesCategory =
      !filters.category ||
      filters.category === "all" ||
      task.category === filters.category;
    const matchesView =
      filters.view === "dashboard" ||
      filters.view === "all" ||
      filters.view === "projects" ||
      (filters.view === "today" && isDueToday(task, now, timezone)) ||
      (filters.view === "upcoming" && isUpcoming(task, now, timezone)) ||
      (filters.view === "completed" && task.status === "completed") ||
      filters.view === "settings";

    return Boolean(
      matchesQuery &&
      matchesStatus &&
      matchesPriority &&
      matchesProject &&
      matchesDay &&
      matchesCategory &&
      matchesView,
    );
  });
}

export function sortTasks(tasks: Task[], sort: TaskSort) {
  return [...tasks].sort((left, right) => {
    if (sort === "title") return left.title.localeCompare(right.title);
    if (sort === "priority")
      return priorityRank[right.priority] - priorityRank[left.priority];
    if (sort === "dueDate") {
      if (!left.dueDate) return 1;
      if (!right.dueDate) return -1;
      return (
        new Date(left.dueDate).getTime() - new Date(right.dueDate).getTime()
      );
    }
    return (
      new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
    );
  });
}

export function taskStats(tasks: Task[], now = new Date()) {
  const leaves = tasks.filter(
    (task) => !tasks.some((child) => child.parentTaskId === task.id),
  );
  const completed = leaves.filter((task) => task.status === "completed").length;
  return {
    total: leaves.length,
    dueToday: leaves.filter(
      (task) => isDueToday(task, now) && task.status !== "completed",
    ).length,
    completed,
    overdue: leaves.filter((task) => isOverdue(task, now)).length,
    completionRate:
      leaves.length === 0 ? 0 : Math.round((completed / leaves.length) * 100),
  };
}

export function unresolvedDependencies(task: Task, tasks: Task[]) {
  return task.dependencyIds.filter(
    (id) =>
      tasks.find((candidate) => candidate.id === id)?.status !== "completed",
  );
}

export function taskEstimate(task: Task, tasks: Task[]) {
  const children = tasks.filter((child) => child.parentTaskId === task.id);
  return children.length
    ? children.reduce((sum, child) => sum + (child.estimatedMinutes ?? 0), 0)
    : (task.estimatedMinutes ?? 0);
}

export function projectProgress(projectId: string, tasks: Task[]) {
  const projectTasks = tasks.filter((task) => task.projectId === projectId);
  const leaves = projectTasks.filter(
    (task) => !projectTasks.some((child) => child.parentTaskId === task.id),
  );
  const completed = leaves.filter((task) => task.status === "completed").length;
  return {
    completed,
    total: leaves.length,
    percent: leaves.length ? Math.round((completed / leaves.length) * 100) : 0,
    estimatedMinutes: leaves.reduce(
      (sum, task) => sum + (task.estimatedMinutes ?? 0),
      0,
    ),
  };
}
