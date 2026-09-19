"use client";

export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-screen place-items-center p-6">
      <div className="surface-card w-full max-w-md rounded-2xl p-8 text-center">
        <p className="text-sm font-bold tracking-[0.16em] text-[var(--primary)]">
          TEMPORARY INTERRUPTION
        </p>
        <h1 className="font-display mt-3 text-3xl font-bold">
          The dashboard needs another try.
        </h1>
        <p className="mt-3 text-[var(--muted-foreground)]">
          Your saved tasks are still safe. Refresh this view to reconnect.
        </p>
        <button className="primary-button mt-6 px-5" onClick={reset}>
          Try again
        </button>
      </div>
    </main>
  );
}
