"use client";

import { LogOut, Menu, Plus, Search, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { Brand } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { createClient } from "@/lib/supabase/client";

interface AppHeaderProps {
  mode: "demo" | "supabase";
  query: string;
  userEmail: string;
  onMenu(): void;
  onNewTask(): void;
  onQueryChange(value: string): void;
}

export function AppHeader({
  mode,
  query,
  userEmail,
  onMenu,
  onNewTask,
  onQueryChange,
}: AppHeaderProps) {
  const router = useRouter();

  async function signOut() {
    if (mode === "demo") return;
    await createClient().auth.signOut();
    router.replace("/sign-in");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-20 flex min-h-18 items-center gap-3 border-b border-[var(--border-subtle)] bg-[color-mix(in_srgb,var(--background)_88%,transparent)] px-4 py-3 backdrop-blur-xl md:px-6">
      <button
        className="control grid h-11 w-11 place-items-center lg:hidden"
        onClick={onMenu}
        aria-label="Open navigation"
      >
        <Menu size={20} aria-hidden="true" />
      </button>
      <div className="lg:hidden">
        <Brand compact />
      </div>

      <label className="control relative hidden min-w-0 flex-1 items-center md:flex lg:max-w-xl">
        <Search
          className="absolute left-3 text-[var(--muted-foreground)]"
          size={18}
          aria-hidden="true"
        />
        <span className="sr-only">Search tasks</span>
        <input
          className="h-full w-full rounded-[inherit] bg-transparent py-2 pl-10 pr-3 outline-none placeholder:text-[var(--muted-foreground)]"
          type="search"
          placeholder="Search tasks…"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
        />
      </label>

      <div className="ml-auto flex items-center gap-2">
        {mode === "demo" && (
          <span
            aria-label="Demo Mode"
            className="rounded-full border border-[var(--border)] bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] px-2.5 py-1.5 text-xs font-extrabold tracking-wide text-[var(--primary)]"
          >
            <span className="sm:hidden">DEMO</span>
            <span className="hidden sm:inline">DEMO MODE</span>
          </span>
        )}
        <ThemeToggle />
        <details className="relative">
          <summary
            className="control flex h-11 list-none items-center gap-2 px-3"
            aria-label="Open user menu"
          >
            <UserRound size={18} aria-hidden="true" />
            <span className="hidden max-w-36 truncate text-sm font-bold xl:block">
              {userEmail}
            </span>
          </summary>
          <div className="surface-card absolute right-0 top-13 w-64 rounded-xl p-3">
            <p className="truncate text-sm font-bold">{userEmail}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              {mode === "demo"
                ? "Stored only in this browser"
                : "Synced securely with Supabase"}
            </p>
            {mode === "supabase" && (
              <button
                className="mt-3 flex min-h-10 w-full items-center gap-2 rounded-lg px-2 text-sm font-bold text-[var(--danger)] hover:bg-[var(--surface-raised)]"
                onClick={signOut}
              >
                <LogOut size={17} aria-hidden="true" /> Sign out
              </button>
            )}
          </div>
        </details>
        <button
          className="primary-button flex items-center gap-2 px-4"
          onClick={onNewTask}
          aria-label="New Task"
        >
          <Plus size={19} aria-hidden="true" />
          <span className="hidden sm:inline">New Task</span>
        </button>
      </div>
    </header>
  );
}
