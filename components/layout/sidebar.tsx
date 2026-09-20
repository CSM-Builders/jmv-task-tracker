"use client";

import {
  CalendarDays,
  CheckCircle2,
  ChevronsLeft,
  Clock3,
  LayoutDashboard,
  ListTodo,
  FolderKanban,
  Settings,
} from "lucide-react";
import { Brand } from "@/components/ui/brand";
import type { TaskView } from "@/types/task";

const items: Array<{
  id: TaskView;
  label: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "projects", label: "Projects", icon: FolderKanban },
  { id: "all", label: "All Tasks", icon: ListTodo },
  { id: "today", label: "Today", icon: CalendarDays },
  { id: "upcoming", label: "Upcoming", icon: Clock3 },
  { id: "completed", label: "Completed", icon: CheckCircle2 },
  { id: "settings", label: "Settings", icon: Settings },
];

interface SidebarProps {
  active: TaskView;
  collapsed: boolean;
  onChange(view: TaskView): void;
  onToggle(): void;
  mobile?: boolean;
}

export function Sidebar({
  active,
  collapsed,
  onChange,
  onToggle,
  mobile = false,
}: SidebarProps) {
  return (
    <aside
      className={`${mobile ? "flex h-full w-[min(84vw,19rem)]" : "hidden lg:flex"} flex-col border-r border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--surface)_96%,transparent)] p-4 backdrop-blur-md transition-[width] ${collapsed && !mobile ? "w-20" : "w-64"}`}
    >
      <div className="flex items-center justify-between gap-2 px-1 py-2">
        <Brand compact={collapsed && !mobile} />
        {!mobile && (
          <button
            className="grid h-10 w-10 place-items-center rounded-lg text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"
            onClick={onToggle}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <ChevronsLeft
              className={collapsed ? "rotate-180" : ""}
              size={19}
              aria-hidden="true"
            />
          </button>
        )}
      </div>

      <nav className="mt-8 grid gap-1.5" aria-label="Primary navigation">
        {items.map((item) => {
          const Icon = item.icon;
          const selected = active === item.id;
          return (
            <button
              key={item.id}
              type="button"
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-left text-sm font-bold transition-colors ${selected ? "border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_12%,var(--surface-raised))] text-[var(--primary)]" : "border border-transparent text-[var(--muted-foreground)] hover:bg-[var(--surface-raised)] hover:text-[var(--foreground)]"}`}
              onClick={() => onChange(item.id)}
              aria-current={selected ? "page" : undefined}
              title={collapsed ? item.label : undefined}
            >
              <Icon size={19} className="shrink-0" aria-hidden="true" />
              {(!collapsed || mobile) && <span>{item.label}</span>}
            </button>
          );
        })}
      </nav>

      {(!collapsed || mobile) && (
        <div className="mt-auto rounded-2xl border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_7%,var(--surface-raised))] p-4">
          <p className="font-display font-bold">Build momentum</p>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Finish one meaningful task, then choose the next.
          </p>
        </div>
      )}
    </aside>
  );
}

export const mobileNavItems = items.filter((item) => item.id !== "settings");
