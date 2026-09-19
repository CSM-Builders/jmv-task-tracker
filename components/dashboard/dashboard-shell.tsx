"use client";

import { ClipboardList, LoaderCircle, Plus, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { StatsGrid } from "@/components/dashboard/stats-grid";
import { AppHeader } from "@/components/layout/app-header";
import { mobileNavItems, Sidebar } from "@/components/layout/sidebar";
import { TaskCard } from "@/components/tasks/task-card";
import { TaskFilters } from "@/components/tasks/task-filters";
import { TaskForm } from "@/components/tasks/task-form";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { useTaskWebMcp } from "@/hooks/use-task-webmcp";
import { LocalTaskRepository } from "@/lib/tasks/local-repository";
import { RemoteTaskRepository } from "@/lib/tasks/remote-repository";
import { filterTasks, sortTasks, taskStats } from "@/lib/utils/tasks";
import type {
  Task,
  TaskInput,
  TaskPriority,
  TaskSort,
  TaskStatus,
  TaskView,
} from "@/types/task";

const viewTitles: Record<
  TaskView,
  { title: string; eyebrow: string; description: string }
> = {
  dashboard: {
    title: "Execution dashboard",
    eyebrow: "COMMAND CENTER",
    description: "See what matters, move work forward, and close the loop.",
  },
  all: {
    title: "All tasks",
    eyebrow: "COMPLETE INVENTORY",
    description: "Review every active and completed commitment in one place.",
  },
  today: {
    title: "Due today",
    eyebrow: "TODAY’S FOCUS",
    description: "Protect today’s priorities from the noise.",
  },
  upcoming: {
    title: "Upcoming work",
    eyebrow: "LOOK AHEAD",
    description: "Plan the next moves before they become urgent.",
  },
  completed: {
    title: "Completed tasks",
    eyebrow: "PROGRESS LOG",
    description: "A clear record of work that crossed the finish line.",
  },
  settings: {
    title: "Workspace settings",
    eyebrow: "PREFERENCES",
    description: "Understand storage, sync, and appearance for this workspace.",
  },
};

interface DashboardShellProps {
  mode: "demo" | "supabase";
  userEmail: string;
}

export function DashboardShell({ mode, userEmail }: DashboardShellProps) {
  const repository = useMemo(
    () =>
      mode === "demo" ? new LocalTaskRepository() : new RemoteTaskRepository(),
    [mode],
  );
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [view, setView] = useState<TaskView>("dashboard");
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<"all" | TaskStatus>("all");
  const [priority, setPriority] = useState<"all" | TaskPriority>("all");
  const [sort, setSort] = useState<TaskSort>("createdAt");
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const [editor, setEditor] = useState<Task | null | undefined>(undefined);
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const notify = useCallback((message: string) => {
    setToast(message);
    window.setTimeout(
      () => setToast((current) => (current === message ? null : current)),
      3_500,
    );
  }, []);

  const loadTasks = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setTasks(await repository.list());
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : "Tasks could not be loaded.",
      );
    } finally {
      setLoading(false);
    }
  }, [repository]);

  useEffect(() => {
    let active = true;
    repository
      .list()
      .then((loadedTasks) => {
        if (active) setTasks(loadedTasks);
      })
      .catch((caught: unknown) => {
        if (active) {
          setError(
            caught instanceof Error
              ? caught.message
              : "Tasks could not be loaded.",
          );
        }
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [repository]);

  const createTask = useCallback(
    async (input: TaskInput) => {
      const created = await repository.create(input);
      setTasks((current) => [created, ...current]);
      notify("Task created.");
      return created;
    },
    [notify, repository],
  );

  useTaskWebMcp(tasks, createTask);

  const visibleTasks = useMemo(
    () =>
      sortTasks(filterTasks(tasks, { query, status, priority, view }), sort),
    [priority, query, sort, status, tasks, view],
  );
  const stats = useMemo(() => taskStats(tasks), [tasks]);
  const heading = viewTitles[view];

  function chooseView(next: TaskView) {
    setView(next);
    setMobileNav(false);
    if (next === "completed") setStatus("all");
  }

  async function submitTask(input: TaskInput) {
    setSaving(true);
    setError(null);
    try {
      if (editor) {
        const updated = await repository.update(editor.id, input);
        setTasks((current) =>
          current.map((task) => (task.id === updated.id ? updated : task)),
        );
        notify("Task updated.");
      } else {
        await createTask(input);
      }
      setEditor(undefined);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The task could not be saved.",
      );
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(task: Task, nextStatus: TaskStatus) {
    if (task.status === nextStatus) return;
    setBusyId(task.id);
    setError(null);
    try {
      const updated = await repository.update(task.id, { status: nextStatus });
      setTasks((current) =>
        current.map((item) => (item.id === updated.id ? updated : item)),
      );
      notify(
        nextStatus === "completed" ? "Task completed." : "Task status updated.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The status could not be updated.",
      );
    } finally {
      setBusyId(null);
    }
  }

  async function deleteTask() {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    setError(null);
    try {
      await repository.remove(deleteTarget.id);
      setTasks((current) =>
        current.filter((task) => task.id !== deleteTarget.id),
      );
      setDeleteTarget(null);
      notify("Task deleted.");
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "The task could not be deleted.",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar
        active={view}
        collapsed={collapsed}
        onChange={chooseView}
        onToggle={() => setCollapsed((value) => !value)}
      />

      {mobileNav && (
        <div
          className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm lg:hidden"
          role="presentation"
          onMouseDown={(event) => {
            if (event.currentTarget === event.target) setMobileNav(false);
          }}
        >
          <div className="relative h-full w-fit">
            <Sidebar
              mobile
              active={view}
              collapsed={false}
              onChange={chooseView}
              onToggle={() => undefined}
            />
            <button
              className="control absolute right-3 top-3 grid h-11 w-11 place-items-center"
              onClick={() => setMobileNav(false)}
              aria-label="Close navigation"
            >
              <X size={20} aria-hidden="true" />
            </button>
          </div>
        </div>
      )}

      <div className="min-w-0 flex-1 pb-20 lg:pb-0">
        <AppHeader
          mode={mode}
          query={query}
          userEmail={userEmail}
          onMenu={() => setMobileNav(true)}
          onNewTask={() => setEditor(null)}
          onQueryChange={setQuery}
        />

        <main className="mx-auto w-full max-w-[1560px] p-4 md:p-6 xl:p-8">
          <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-xs font-extrabold tracking-[0.2em] text-[var(--primary)]">
                {heading.eyebrow}
              </p>
              <h1 className="font-display mt-2 text-3xl font-bold tracking-tight sm:text-4xl">
                {heading.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[var(--muted-foreground)]">
                {heading.description}
              </p>
            </div>
            {mode === "demo" && (
              <p className="max-w-sm rounded-xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface))] px-4 py-3 text-sm text-[var(--muted-foreground)]">
                <strong className="text-[var(--foreground)]">
                  Local preview:
                </strong>{" "}
                changes stay in this browser and are not synchronized.
              </p>
            )}
          </div>

          {view === "settings" ? (
            <section className="grid gap-4 md:grid-cols-2">
              <article className="surface-card rounded-2xl p-6">
                <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]">
                  DATA STORAGE
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold">
                  {mode === "demo"
                    ? "Browser-only demo"
                    : "Supabase sync active"}
                </h2>
                <p className="mt-3 text-[var(--muted-foreground)]">
                  {mode === "demo"
                    ? "Tasks are stored in localStorage on this device. Configure the two public Supabase variables to enable authenticated, private cloud storage."
                    : "Task requests are validated by protected server routes, while database Row Level Security enforces ownership again at the data layer."}
                </p>
              </article>
              <article className="surface-card rounded-2xl p-6">
                <p className="text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]">
                  APPEARANCE
                </p>
                <h2 className="font-display mt-2 text-2xl font-bold">
                  Dark by default, light when needed
                </h2>
                <p className="mt-3 text-[var(--muted-foreground)]">
                  Use the sun or moon control in the header. Your choice is
                  saved on this device and applied before the interface appears.
                </p>
              </article>
            </section>
          ) : (
            <div className="grid gap-5">
              <StatsGrid stats={stats} />
              <TaskFilters
                query={query}
                status={status}
                priority={priority}
                sort={sort}
                onQuery={setQuery}
                onStatus={setStatus}
                onPriority={setPriority}
                onSort={setSort}
              />

              {error && (
                <div
                  className="flex flex-col gap-3 rounded-2xl border border-[color-mix(in_srgb,var(--danger)_35%,transparent)] bg-[color-mix(in_srgb,var(--danger)_8%,var(--surface))] p-4 sm:flex-row sm:items-center sm:justify-between"
                  role="alert"
                >
                  <p className="font-medium text-[var(--danger)]">{error}</p>
                  <button
                    className="secondary-button px-4"
                    onClick={() => void loadTasks()}
                  >
                    Retry
                  </button>
                </div>
              )}

              <section aria-label="Task list" className="grid gap-3">
                {loading ? (
                  <div
                    className="surface-card grid min-h-48 place-items-center rounded-2xl p-8 text-center"
                    aria-live="polite"
                  >
                    <div>
                      <LoaderCircle
                        className="mx-auto animate-spin text-[var(--primary)]"
                        size={28}
                        aria-hidden="true"
                      />
                      <p className="mt-3 font-bold">Loading tasks…</p>
                    </div>
                  </div>
                ) : visibleTasks.length ? (
                  visibleTasks.map((task) => (
                    <TaskCard
                      key={task.id}
                      task={task}
                      busy={busyId === task.id}
                      onEdit={(selected) => setEditor(selected)}
                      onDelete={setDeleteTarget}
                      onStatus={changeStatus}
                    />
                  ))
                ) : (
                  <div className="surface-card grid min-h-60 place-items-center rounded-2xl p-8 text-center">
                    <div>
                      <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-raised))] text-[var(--primary)]">
                        <ClipboardList size={26} aria-hidden="true" />
                      </span>
                      <h2 className="font-display mt-4 text-2xl font-bold">
                        No tasks match this view
                      </h2>
                      <p className="mx-auto mt-2 max-w-md text-[var(--muted-foreground)]">
                        Adjust the filters, or capture a new task and give it a
                        clear next action.
                      </p>
                      <button
                        className="primary-button mt-5 inline-flex items-center gap-2 px-5"
                        onClick={() => setEditor(null)}
                      >
                        <Plus size={18} aria-hidden="true" />
                        Create a task
                      </button>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}
        </main>
      </div>

      <nav
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-[var(--border)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] px-1 py-1 backdrop-blur-xl lg:hidden"
        aria-label="Mobile navigation"
      >
        {mobileNavItems.map((item) => {
          const Icon = item.icon;
          const selected = view === item.id;
          return (
            <button
              key={item.id}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg text-xs font-bold ${selected ? "text-[var(--primary)]" : "text-[var(--muted-foreground)]"}`}
              onClick={() => chooseView(item.id)}
              aria-current={selected ? "page" : undefined}
            >
              <Icon size={19} aria-hidden="true" />
              <span>{item.label.replace("All Tasks", "All")}</span>
            </button>
          );
        })}
      </nav>

      {editor !== undefined && (
        <TaskForm
          task={editor}
          busy={saving}
          onClose={() => setEditor(undefined)}
          onSubmit={submitTask}
        />
      )}
      {deleteTarget && (
        <ConfirmDialog
          itemName={deleteTarget.title}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={deleteTask}
        />
      )}
      <div
        className="pointer-events-none fixed bottom-20 right-4 z-[70] max-w-sm lg:bottom-5"
        aria-live="polite"
        aria-atomic="true"
      >
        {toast && (
          <div className="surface-card rounded-xl border-[var(--border)] px-4 py-3 font-bold text-[var(--foreground)] shadow-2xl">
            {toast}
          </div>
        )}
      </div>
    </div>
  );
}
