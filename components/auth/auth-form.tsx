"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { createClient } from "@/lib/supabase/client";

const authSchema = z.object({
  email: z.email("Enter a valid email address."),
  password: z.string().min(8, "Use at least 8 characters."),
});

type AuthValues = z.infer<typeof authSchema>;

export function AuthForm({ mode }: { mode: "sign-in" | "register" }) {
  const router = useRouter();
  const [message, setMessage] = useState<{
    type: "error" | "success";
    text: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AuthValues>({ resolver: zodResolver(authSchema) });
  const isRegister = mode === "register";

  async function submit(values: AuthValues) {
    setBusy(true);
    setMessage(null);
    const supabase = createClient();
    const result = isRegister
      ? await supabase.auth.signUp({
          email: values.email,
          password: values.password,
        })
      : await supabase.auth.signInWithPassword({
          email: values.email,
          password: values.password,
        });
    setBusy(false);

    if (result.error) {
      setMessage({ type: "error", text: result.error.message });
      return;
    }
    if (isRegister && !result.data.session) {
      setMessage({
        type: "success",
        text: "Check your email to confirm your account, then sign in.",
      });
      return;
    }
    router.replace("/");
    router.refresh();
  }

  return (
    <form
      className="mt-7 grid gap-5"
      onSubmit={handleSubmit(submit)}
      noValidate
    >
      <label className="grid gap-2 text-sm font-bold">
        Email address
        <input
          className="control px-3"
          type="email"
          autoComplete="email"
          {...register("email")}
          aria-invalid={Boolean(errors.email)}
        />
        {errors.email && (
          <span className="text-sm text-[var(--danger)]" role="alert">
            {errors.email.message}
          </span>
        )}
      </label>
      <label className="grid gap-2 text-sm font-bold">
        Password
        <input
          className="control px-3"
          type="password"
          autoComplete={isRegister ? "new-password" : "current-password"}
          {...register("password")}
          aria-invalid={Boolean(errors.password)}
        />
        {errors.password && (
          <span className="text-sm text-[var(--danger)]" role="alert">
            {errors.password.message}
          </span>
        )}
      </label>
      {message && (
        <p
          className={`rounded-xl border p-3 text-sm font-medium ${message.type === "error" ? "border-[color-mix(in_srgb,var(--danger)_35%,transparent)] text-[var(--danger)]" : "border-[color-mix(in_srgb,var(--success)_35%,transparent)] text-[var(--success)]"}`}
          role={message.type === "error" ? "alert" : "status"}
        >
          {message.text}
        </p>
      )}
      <button className="primary-button px-5" type="submit" disabled={busy}>
        {busy ? "Please wait…" : isRegister ? "Create account" : "Sign in"}
      </button>
      <p className="text-center text-sm text-[var(--muted-foreground)]">
        {isRegister ? "Already have an account?" : "New to JMV Task Tracker?"}{" "}
        <Link
          className="font-bold text-[var(--primary)] underline-offset-4 hover:underline"
          href={isRegister ? "/sign-in" : "/register"}
        >
          {isRegister ? "Sign in" : "Create an account"}
        </Link>
      </p>
    </form>
  );
}
