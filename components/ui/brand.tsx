import { CheckCheck } from "lucide-react";

export function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex min-w-0 items-center gap-3">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[var(--border)] bg-[var(--surface-raised)] text-[var(--primary)] shadow-[0_0_24px_color-mix(in_srgb,var(--primary)_16%,transparent)]">
        <CheckCheck size={22} aria-hidden="true" />
      </span>
      {!compact && (
        <span className="min-w-0">
          <strong className="font-display block truncate text-lg leading-tight">
            JMV Task Tracker
          </strong>
          <span className="block truncate text-xs text-[var(--muted-foreground)]">
            Focused execution. Measurable progress.
          </span>
        </span>
      )}
    </div>
  );
}
