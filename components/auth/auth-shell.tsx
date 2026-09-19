import Link from "next/link";
import { Brand } from "@/components/ui/brand";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { AuthForm } from "@/components/auth/auth-form";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export function AuthShell({ mode }: { mode: "sign-in" | "register" }) {
  const configured = isSupabaseConfigured;
  const isRegister = mode === "register";
  return (
    <main className="grid min-h-screen place-items-center p-4 sm:p-6">
      <div className="absolute right-4 top-4">
        <ThemeToggle />
      </div>
      <section className="surface-card w-full max-w-md rounded-3xl p-6 sm:p-8">
        <Brand />
        <p className="mt-8 text-xs font-extrabold tracking-[0.18em] text-[var(--primary)]">
          SECURE WORKSPACE
        </p>
        <h1 className="font-display mt-2 text-3xl font-bold">
          {isRegister ? "Create your account" : "Welcome back"}
        </h1>
        <p className="mt-2 text-[var(--muted-foreground)]">
          {isRegister
            ? "Start a private task workspace protected by Supabase authentication."
            : "Sign in to continue focused work in your private dashboard."}
        </p>
        {configured ? (
          <AuthForm mode={mode} />
        ) : (
          <div className="mt-7 rounded-2xl border border-[var(--border)] bg-[var(--surface-raised)] p-4">
            <p className="font-bold">Supabase setup is not active.</p>
            <p className="mt-2 text-sm text-[var(--muted-foreground)]">
              The app is running safely in demo mode. Add the public project URL
              and publishable key to enable accounts.
            </p>
            <Link
              className="primary-button mt-4 inline-flex items-center px-5"
              href="/"
            >
              Open demo dashboard
            </Link>
          </div>
        )}
      </section>
    </main>
  );
}
