export default function Loading() {
  return (
    <main
      className="grid min-h-screen place-items-center p-6"
      aria-live="polite"
    >
      <div className="surface-card w-full max-w-sm rounded-2xl p-7 text-center">
        <div className="mx-auto mb-4 h-10 w-10 animate-pulse rounded-xl bg-[var(--primary)]/25" />
        <p className="font-display text-xl font-bold">
          Preparing your workspace…
        </p>
        <p className="mt-2 text-[var(--muted-foreground)]">
          Resolving your session and tasks.
        </p>
      </div>
    </main>
  );
}
