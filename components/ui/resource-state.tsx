import { AlertTriangle, LoaderCircle, RotateCcw } from "lucide-react";

export interface LoadFailure {
  message: string;
  code?: string;
  requestId?: string;
  detail?: string;
}

interface ResourceStateProps {
  state: "loading" | "error";
  label: string;
  failure?: LoadFailure | null;
  onRetry?(): void;
}

export function ResourceState({
  state,
  label,
  failure,
  onRetry,
}: ResourceStateProps) {
  if (state === "loading")
    return (
      <section
        className="surface-card grid min-h-48 place-items-center rounded-2xl p-8 text-center"
        aria-live="polite"
        aria-busy="true"
      >
        <div>
          <LoaderCircle
            className="mx-auto animate-spin text-[var(--primary)]"
            size={28}
            aria-hidden="true"
          />
          <p className="mt-3 font-bold">Loading {label}…</p>
        </div>
      </section>
    );

  const diagnostic = [
    failure?.code,
    failure?.requestId ? `Request ${failure.requestId}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <section
      className="surface-card rounded-2xl border-[color-mix(in_srgb,var(--danger)_35%,var(--border))] p-6"
      role="alert"
    >
      <div className="flex items-start gap-3">
        <AlertTriangle
          className="mt-0.5 shrink-0 text-[var(--danger)]"
          size={22}
          aria-hidden="true"
        />
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-bold">
            {failure?.message ?? `${label} could not be loaded.`}
          </h2>
          <p className="mt-2 text-sm text-[var(--muted-foreground)]">
            The workspace has not been treated as empty. Retry after checking
            the application API and database migration.
          </p>
          {diagnostic && (
            <p className="mt-3 break-all font-mono text-xs text-[var(--muted-foreground)]">
              {diagnostic}
            </p>
          )}
          {failure?.detail && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-bold">
                Development detail
              </summary>
              <p className="mt-2 break-words font-mono text-xs text-[var(--muted-foreground)]">
                {failure.detail}
              </p>
            </details>
          )}
          {onRetry && (
            <button
              type="button"
              className="secondary-button mt-4 inline-flex items-center gap-2 px-4"
              onClick={onRetry}
            >
              <RotateCcw size={16} aria-hidden="true" />
              Retry
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
