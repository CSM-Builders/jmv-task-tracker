import type {
  Task,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskView,
} from "@/types/task";

const priorityRank: Record<TaskPriority, number> = {
  high: 3,
  medium: 2,
  low: 1,
};

function startOfLocalDay(date: Date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

export function isOverdue(task: Task, now = new Date()) {
  return (
    task.status !== "completed" &&
    Boolean(task.dueDate && new Date(task.dueDate).getTime() < now.getTime())
  );
}

export function isDueToday(task: Task, now = new Date()) {
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  return (
    due.getFullYear() === now.getFullYear() &&
    due.getMonth() === now.getMonth() &&
    due.getDate() === now.getDate()
  );
}

export function isUpcoming(task: Task, now = new Date()) {
  if (!task.dueDate || task.status === "completed") return false;
  return (
    startOfLocalDay(new Date(task.dueDate)).getTime() >
    startOfLocalDay(now).getTime()
  );
}

interface TaskFilters {
  query: string;
  status: "all" | TaskStatus;
  priority: "all" | TaskPriority;
  view: TaskView;
  now?: Date;
}

export function filterTasks(tasks: Task[], filters: TaskFilters) {
  const query = filters.query.trim().toLocaleLowerCase();
  const now = filters.now ?? new Date();

  return tasks.filter((task) => {
    const matchesQuery =
      !query ||
      task.title.toLocaleLowerCase().includes(query) ||
      task.description?.toLocaleLowerCase().includes(query);
    const matchesStatus =
      filters.status === "all" || task.status === filters.status;
    const matchesPriority =
      filters.priority === "all" || task.priority === filters.priority;
    const matchesView =
      filters.view === "dashboard" ||
      filters.view === "all" ||
      (filters.view === "today" && isDueToday(task, now)) ||
      (filters.view === "upcoming" && isUpcoming(task, now)) ||
      (filters.view === "completed" && task.status === "completed") ||
      filters.view === "settings";

    return Boolean(
      matchesQuery && matchesStatus && matchesPriority && matchesView,
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
  const completed = tasks.filter((task) => task.status === "completed").length;
  return {
    total: tasks.length,
    dueToday: tasks.filter(
      (task) => isDueToday(task, now) && task.status !== "completed",
    ).length,
    completed,
    overdue: tasks.filter((task) => isOverdue(task, now)).length,
    completionRate:
      tasks.length === 0 ? 0 : Math.round((completed / tasks.length) * 100),
  };
}
