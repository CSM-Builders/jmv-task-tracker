"use client";

import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  function toggleTheme() {
    const next =
      document.documentElement.dataset.theme === "dark" ? "light" : "dark";
    document.documentElement.dataset.theme = next;
    window.localStorage.setItem("jmv-theme", next);
  }

  return (
    <button
      type="button"
      className="control grid h-11 w-11 shrink-0 place-items-center"
      onClick={toggleTheme}
      aria-label="Toggle color theme"
    >
      <Sun className="theme-icon-dark" size={19} aria-hidden="true" />
      <Moon className="theme-icon-light" size={19} aria-hidden="true" />
    </button>
  );
}
