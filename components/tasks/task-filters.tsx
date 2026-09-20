import { Search, SlidersHorizontal } from "lucide-react";
import type { Project, TaskPriority, TaskSort, TaskStatus } from "@/types/task";

interface TaskFiltersProps {
  query: string;
  status: "all" | TaskStatus;
  priority: "all" | TaskPriority;
  projectId: "all" | "none" | string;
  dayNumber: "all" | number;
  category: "all" | string;
  projects: Project[];
  days: number[];
  categories: string[];
  sort: TaskSort;
  onQuery(value: string): void;
  onStatus(value: "all" | TaskStatus): void;
  onPriority(value: "all" | TaskPriority): void;
  onProject(value: "all" | "none" | string): void;
  onDay(value: "all" | number): void;
  onCategory(value: "all" | string): void;
  onSort(value: TaskSort): void;
}

export function TaskFilters({
  query,
  status,
  priority,
  projectId,
  dayNumber,
  category,
  projects,
  days,
  categories,
  sort,
  onQuery,
  onStatus,
  onPriority,
  onProject,
  onDay,
  onCategory,
  onSort,
}: TaskFiltersProps) {
  return (
    <section
      className="surface-card flex flex-col gap-3 rounded-2xl p-3 md:flex-row md:items-center"
      aria-label="Task filters"
    >
      <label className="control relative flex flex-1 items-center md:hidden">
        <Search
          className="absolute left-3 text-[var(--muted-foreground)]"
          size={18}
          aria-hidden="true"
        />
        <span className="sr-only">Search tasks</span>
        <input
          className="h-full w-full rounded-[inherit] bg-transparent py-2 pl-10 pr-3 outline-none"
          type="search"
          placeholder="Search tasks…"
          value={query}
          onChange={(event) => onQuery(event.target.value)}
        />
      </label>
      <div className="flex items-center gap-2 text-sm font-bold text-[var(--muted-foreground)]">
        <SlidersHorizontal size={17} aria-hidden="true" /> Refine
      </div>
      <div className="grid flex-1 grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
        <label>
          <span className="sr-only">Filter by project</span>
          <select
            aria-label="Filter by project"
            className="control w-full px-3"
            value={projectId}
            onChange={(event) => onProject(event.target.value)}
          >
            <option value="all">All projects</option>
            <option value="none">No project</option>
            {projects.map((project) => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by day</span>
          <select
            aria-label="Filter by day"
            className="control w-full px-3"
            value={dayNumber}
            onChange={(event) =>
              onDay(
                event.target.value === "all"
                  ? "all"
                  : Number(event.target.value),
              )
            }
          >
            <option value="all">All days</option>
            {days.map((day) => (
              <option key={day} value={day}>
                Day {day}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by category</span>
          <select
            aria-label="Filter by category"
            className="control w-full px-3"
            value={category}
            onChange={(event) => onCategory(event.target.value)}
          >
            <option value="all">All categories</option>
            {categories.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by status</span>
          <select
            aria-label="Filter by status"
            className="control w-full px-3"
            value={status}
            onChange={(event) =>
              onStatus(event.target.value as "all" | TaskStatus)
            }
          >
            <option value="all">All statuses</option>
            <option value="todo">To do</option>
            <option value="in_progress">In progress</option>
            <option value="completed">Completed</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Filter by priority</span>
          <select
            aria-label="Filter by priority"
            className="control w-full px-3"
            value={priority}
            onChange={(event) =>
              onPriority(event.target.value as "all" | TaskPriority)
            }
          >
            <option value="all">All priorities</option>
            <option value="high">High priority</option>
            <option value="medium">Medium priority</option>
            <option value="low">Low priority</option>
          </select>
        </label>
        <label>
          <span className="sr-only">Sort tasks</span>
          <select
            aria-label="Sort tasks"
            className="control w-full px-3"
            value={sort}
            onChange={(event) => onSort(event.target.value as TaskSort)}
          >
            <option value="createdAt">Newest created</option>
            <option value="dueDate">Due date</option>
            <option value="title">Title A–Z</option>
            <option value="priority">Priority</option>
          </select>
        </label>
      </div>
    </section>
  );
}
